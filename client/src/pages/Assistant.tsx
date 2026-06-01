import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import {
  Bot, Send, Plus, Archive, Trash2, MessageSquare, Code2,
  Shield, FileText, Zap, Search, Hammer, Package, RefreshCw,
  ChevronRight, Download, Copy, X, Settings, Sparkles,
  AlertTriangle, BookOpen, Terminal
} from "lucide-react";

type ChatMode = "chat" | "code_gen" | "audit" | "exploit" | "report";

const MODE_CONFIG: Record<ChatMode, { label: string; icon: React.ElementType; color: string; placeholder: string }> = {
  chat: { label: "通用对话", icon: MessageSquare, color: "text-blue-600", placeholder: "询问任何渗透测试相关问题..." },
  code_gen: { label: "代码生成", icon: Code2, color: "text-green-600", placeholder: "描述需要生成的代码功能，如：生成一个Windows x64的反射DLL注入载荷..." },
  audit: { label: "代码审计", icon: Shield, color: "text-red-600", placeholder: "粘贴需要审计的代码，或描述目标代码的功能..." },
  exploit: { label: "漏洞利用", icon: AlertTriangle, color: "text-orange-600", placeholder: "输入CVE编号或漏洞描述，如：CVE-2021-44228 Log4Shell..." },
  report: { label: "报告生成", icon: FileText, color: "text-purple-600", placeholder: "描述渗透测试过程，系统将生成专业报告草稿..." },
};

// AI Tool Call actions
const AI_TOOLS = [
  { id: "create_payload", label: "新建载荷", icon: Package, description: "触发载荷生成向导" },
  { id: "search_templates", label: "搜索模板", icon: Search, description: "在模板库中搜索" },
  { id: "trigger_build", label: "执行构建", icon: Hammer, description: "触发项目构建" },
  { id: "open_editor", label: "打开编辑器", icon: Code2, description: "跳转到代码编辑器" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  mode?: ChatMode;
  isStreaming?: boolean;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>;
}

interface Session {
  id: number;
  name: string;
  archived: boolean;
  messages: Message[];
  createdAt: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const ModeIcon = message.mode ? MODE_CONFIG[message.mode]?.icon : Bot;

  return (
    <div className={cn("flex gap-3 group", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-primary text-white" : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
      )}>
        {isUser ? "U" : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[85%]", isUser && "items-end flex flex-col")}>
        <div className={cn(
          "rounded-xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-white border border-border shadow-sm rounded-tl-sm"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                <Zap className="w-2.5 h-2.5" />
                {tc.tool}
              </div>
            ))}
          </div>
        )}

        <span className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

export default function Assistant() {
  const { assistantContext, dispatchAction, pendingAction, clearAction } = useApp();
  const [sessions, setSessions] = useState<Session[]>([
    { id: 1, name: "漏洞利用研究", archived: false, messages: [], createdAt: new Date().toISOString() },
    { id: 2, name: "代码审计会话", archived: false, messages: [], createdAt: new Date().toISOString() },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const contentStr = typeof data.content === "string" ? data.content : String(data.content ?? "");
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: contentStr,
        timestamp: Date.now(),
        mode,
      };

      // Check for tool calls in response
      const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
      if (contentStr.includes("新建载荷")) toolCalls.push({ tool: "create_payload", args: {} });
      if (contentStr.includes("搜索模板")) toolCalls.push({ tool: "search_templates", args: {} });
      if (contentStr.includes("执行构建")) toolCalls.push({ tool: "trigger_build", args: {} });
      if (toolCalls.length > 0) assistantMsg.toolCalls = toolCalls;

      setSessions(prev => prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, assistantMsg] }
          : s
      ));
      setIsLoading(false);
    },
    onError: (e) => {
      toast.error(`AI 请求失败: ${e.message}`);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Auto-populate context from editor
  useEffect(() => {
    if (assistantContext.fileContent && assistantContext.fileName) {
      setInput(`请分析以下文件 "${assistantContext.fileName}" 的代码：\n\n\`\`\`\n${assistantContext.fileContent.slice(0, 500)}...\n\`\`\``);
    }
  }, [assistantContext]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
      mode,
    };

    setSessions(prev => prev.map(s =>
      s.id === activeSessionId
        ? { ...s, messages: [...s.messages, userMsg] }
        : s
    ));

    const messages: Array<{role: "user" | "assistant" | "system"; content: string}> = [
      ...(activeSession?.messages ?? []).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input },
    ];

    setIsLoading(true);
    setInput("");

    chatMutation.mutate({
      messages,
      mode,
      contextCode: assistantContext.fileContent,
      contextProject: assistantContext.projectId ? `Project ID: ${assistantContext.projectId}` : undefined,
    });
  };

  const handleToolAction = (toolId: string) => {
    switch (toolId) {
      case "create_payload":
        dispatchAction({ type: "create_payload" });
        toast.success("已触发载荷生成向导");
        break;
      case "search_templates":
        dispatchAction({ type: "search_templates" });
        toast.success("已跳转到模板库");
        break;
      case "trigger_build":
        if (assistantContext.projectId) {
          dispatchAction({ type: "trigger_build", payload: { projectId: assistantContext.projectId } });
        } else {
          toast.info("请先在项目管理中选择项目");
        }
        break;
      case "open_editor":
        dispatchAction({ type: "open_editor" });
        break;
    }
  };

  const createSession = () => {
    const newId = Math.max(...sessions.map(s => s.id), 0) + 1;
    const newSession: Session = {
      id: newId,
      name: `会话 ${newId}`,
      archived: false,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newId);
  };

  const exportSession = () => {
    if (!activeSession) return;
    const md = activeSession.messages.map(m =>
      `**${m.role === "user" ? "用户" : "AI"}** (${new Date(m.timestamp).toLocaleString()})\n\n${m.content}\n\n---\n`
    ).join("\n");
    const blob = new Blob([`# ${activeSession.name}\n\n${md}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSession.name}.md`;
    a.click();
    toast.success("对话已导出为 Markdown");
  };

  const quickPrompts = [
    { label: "生成 Windows 反弹Shell", mode: "code_gen" as ChatMode, prompt: "生成一个 Windows x64 反弹Shell，使用 HTTP 协议，包含 AES 加密和字符串混淆，目标是绕过主流杀软检测" },
    { label: "分析 CVE-2021-44228", mode: "exploit" as ChatMode, prompt: "CVE-2021-44228 Log4Shell 漏洞，请提供详细的利用思路和 PoC 代码" },
    { label: "代码审计模板", mode: "audit" as ChatMode, prompt: "请对以下代码进行安全审计，找出所有可利用的安全漏洞" },
    { label: "生成渗透报告", mode: "report" as ChatMode, prompt: "请根据以下测试结果生成专业的渗透测试报告草稿" },
  ];

  return (
    <div className="h-full flex overflow-hidden">
      {/* ─── Session Sidebar ─────────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full gap-1.5" onClick={createSession}>
            <Plus className="w-3.5 h-3.5" />
            新建会话
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.filter(s => !s.archived).map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors group",
                  activeSessionId === session.id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate text-xs">{session.name}</span>
                <span className={cn(
                  "text-[10px] shrink-0",
                  activeSessionId === session.id ? "text-white/70" : "text-muted-foreground"
                )}>
                  {session.messages.length}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
        {/* AI Tools */}
        <div className="p-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold px-2 mb-2">AI 工具调用</p>
          <div className="space-y-1">
            {AI_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleToolAction(tool.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <tool.icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{tool.label}</span>
                <ChevronRight className="w-3 h-3 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            {editingName ? (
              <Input
                value={sessionName || activeSession?.name}
                onChange={e => setSessionName(e.target.value)}
                onBlur={() => {
                  if (sessionName) {
                    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, name: sessionName } : s));
                  }
                  setEditingName(false);
                }}
                onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                className="h-6 text-sm w-40"
                autoFocus
              />
            ) : (
              <span className="text-sm font-medium cursor-pointer hover:text-primary" onClick={() => { setSessionName(activeSession?.name ?? ""); setEditingName(true); }}>
                {activeSession?.name ?? "新会话"}
              </span>
            )}
            {assistantContext.fileName && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Code2 className="w-2.5 h-2.5" />
                {assistantContext.fileName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportSession}>
              <Download className="w-3 h-3" />
              导出
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20 overflow-x-auto shrink-0">
          {(Object.entries(MODE_CONFIG) as [ChatMode, typeof MODE_CONFIG[ChatMode]][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  mode === key
                    ? "bg-primary text-white"
                    : "bg-white border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {!activeSession?.messages.length ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">RedTeam AI 助手</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                专业的红队/渗透测试 AI 助手，支持代码生成、漏洞利用、代码审计和报告生成
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => { setMode(qp.mode); setInput(qp.prompt); }}
                    className="text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-xs"
                  >
                    <p className="font-medium text-foreground mb-1">{qp.label}</p>
                    <p className="text-muted-foreground line-clamp-2">{qp.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {activeSession.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-border rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-white shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-muted/30 rounded-xl border border-border p-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={MODE_CONFIG[mode].placeholder}
                className="flex-1 min-h-[60px] max-h-[160px] resize-none border-0 bg-transparent focus-visible:ring-0 text-sm p-1"
                rows={2}
              />
              <Button
                size="icon"
                className="w-9 h-9 shrink-0 rounded-lg"
                disabled={!input.trim() || isLoading}
                onClick={handleSend}
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Enter 发送 · Shift+Enter 换行 · 当前模式: <span className="font-medium">{MODE_CONFIG[mode].label}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
