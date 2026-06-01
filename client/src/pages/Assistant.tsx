import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import {
  Bot, Send, Plus, Archive, Trash2, MessageSquare, Code2,
  Shield, FileText, Zap, Search, Hammer, Package, RefreshCw,
  ChevronRight, Download, Copy, X, Sparkles, AlertTriangle,
  BookOpen, Terminal, Target, Crosshair, Radio, Lock,
  TrendingUp, Clock, Hash, Cpu, Globe, Activity, Star,
  MoreHorizontal, Edit3, Check, ChevronDown, Layers,
  ExternalLink, GitBranch, Eye, Settings
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type ChatMode = "chat" | "code_gen" | "audit" | "exploit" | "report";

const MODE_CONFIG: Record<ChatMode, {
  label: string; icon: React.ElementType; color: string; bg: string;
  placeholder: string; description: string;
}> = {
  chat: {
    label: "通用对话", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    placeholder: "询问任何渗透测试相关问题，如：如何绕过 Windows Defender...",
    description: "通用安全咨询与技术交流"
  },
  code_gen: {
    label: "代码生成", icon: Code2, color: "text-green-600", bg: "bg-green-50 border-green-200",
    placeholder: "描述需要生成的代码，如：生成一个 Windows x64 反射 DLL 注入载荷...",
    description: "AI 辅助生成渗透测试代码"
  },
  audit: {
    label: "代码审计", icon: Shield, color: "text-red-600", bg: "bg-red-50 border-red-200",
    placeholder: "粘贴需要审计的代码，AI 将分析安全漏洞和可利用点...",
    description: "自动化代码安全审计分析"
  },
  exploit: {
    label: "漏洞利用", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200",
    placeholder: "输入 CVE 编号或漏洞描述，如：CVE-2021-44228 Log4Shell...",
    description: "漏洞利用代码生成与分析"
  },
  report: {
    label: "报告生成", icon: FileText, color: "text-purple-600", bg: "bg-purple-50 border-purple-200",
    placeholder: "描述渗透测试过程，AI 将生成专业的渗透测试报告草稿...",
    description: "自动生成渗透测试报告"
  },
};

const AI_TOOLS = [
  { id: "create_payload", label: "新建载荷", icon: Package, color: "text-amber-600 bg-amber-50 border-amber-200", desc: "触发载荷生成向导" },
  { id: "search_templates", label: "搜索模板", icon: Search, color: "text-emerald-600 bg-emerald-50 border-emerald-200", desc: "在模板库中搜索" },
  { id: "trigger_build", label: "执行构建", icon: Hammer, color: "text-green-600 bg-green-50 border-green-200", desc: "触发项目构建" },
  { id: "open_editor", label: "代码编辑", icon: Code2, color: "text-blue-600 bg-blue-50 border-blue-200", desc: "跳转到编辑器" },
];

const QUICK_PROMPTS = [
  { label: "Windows 反弹 Shell", mode: "code_gen" as ChatMode, icon: Terminal, color: "text-blue-600", prompt: "生成一个 Windows x64 反弹 Shell，使用 HTTP 协议，包含 AES-256 加密和字符串混淆，目标是绕过主流杀软检测" },
  { label: "Log4Shell 利用", mode: "exploit" as ChatMode, icon: AlertTriangle, color: "text-orange-600", prompt: "CVE-2021-44228 Log4Shell 漏洞，请提供详细的利用思路、PoC 代码和检测绕过方法" },
  { label: "代码审计示例", mode: "audit" as ChatMode, icon: Shield, color: "text-red-600", prompt: "请对以下代码进行安全审计，找出所有可利用的安全漏洞和潜在风险点" },
  { label: "渗透测试报告", mode: "report" as ChatMode, icon: FileText, color: "text-purple-600", prompt: "请根据以下渗透测试过程生成一份专业的安全评估报告，包含执行摘要、技术细节和修复建议" },
  { label: "提权技术分析", mode: "chat" as ChatMode, icon: TrendingUp, color: "text-green-600", prompt: "分析 Windows 系统中常见的本地提权技术，包括令牌模拟、SeImpersonatePrivilege 滥用等" },
  { label: "横向移动方法", mode: "chat" as ChatMode, icon: ChevronRight, color: "text-indigo-600", prompt: "介绍 Active Directory 环境中的横向移动技术，包括 Pass-the-Hash、Pass-the-Ticket 等" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  mode?: ChatMode;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>;
}

interface Session {
  id: number;
  name: string;
  archived: boolean;
  messages: Message[];
  mode: ChatMode;
}

function ToolCallCard({ toolId, onExecute }: { toolId: string; onExecute: (id: string) => void }) {
  const tool = AI_TOOLS.find(t => t.id === toolId);
  if (!tool) return null;
  return (
    <button
      onClick={() => onExecute(toolId)}
      className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm", tool.color)}
    >
      <tool.icon className="w-3.5 h-3.5" />
      {tool.label}
      <ChevronRight className="w-3 h-3 ml-0.5" />
    </button>
  );
}

function MessageBubble({ message, onToolExecute }: { message: Message; onToolExecute: (id: string) => void }) {
  const isUser = message.role === "user";
  const modeConf = message.mode ? MODE_CONFIG[message.mode] : null;
  const ModeIcon = modeConf?.icon ?? Bot;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex gap-3 group animate-fade-in-up", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
        isUser ? "bg-grad-primary text-white" : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
      )}>
        {isUser ? (
          <span className="text-xs font-bold">U</span>
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[85%]", isUser && "items-end flex flex-col")}>
        {/* Mode badge for assistant */}
        {!isUser && modeConf && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", modeConf.bg, modeConf.color)}>
              <ModeIcon className="w-3 h-3" />
              {modeConf.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        )}

        <div className={cn(
          "relative rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-grad-primary text-white rounded-tr-sm"
            : "bg-white border border-border rounded-tl-sm"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-[var(--editor-bg)] [&_pre]:text-[var(--editor-fg)] [&_pre]:rounded-xl [&_pre]:p-4">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}

          {/* Copy button */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 w-6 h-6 rounded-md bg-muted/60 hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </button>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground self-center">AI 建议操作:</span>
            {message.toolCalls.map((tc, i) => (
              <ToolCallCard key={i} toolId={tc.tool} onExecute={onToolExecute} />
            ))}
          </div>
        )}

        {isUser && (
          <span className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const { assistantContext, dispatchAction, pendingAction, clearAction } = useApp();
  const [sessions, setSessions] = useState<Session[]>([
    { id: 1, name: "漏洞利用研究", archived: false, messages: [], mode: "exploit" },
    { id: 2, name: "代码审计会话", archived: false, messages: [], mode: "audit" },
    { id: 3, name: "报告生成", archived: false, messages: [], mode: "report" },
  ]);
  const [activeSessionId, setActiveSessionId] = useState(1);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [isLoading, setIsLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      const contentStr = typeof data.content === "string" ? data.content : String(data.content ?? "");
      const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
      if (contentStr.includes("新建载荷") || contentStr.includes("生成载荷")) toolCalls.push({ tool: "create_payload", args: {} });
      if (contentStr.includes("搜索模板") || contentStr.includes("模板库")) toolCalls.push({ tool: "search_templates", args: {} });
      if (contentStr.includes("执行构建") || contentStr.includes("一键构建")) toolCalls.push({ tool: "trigger_build", args: {} });

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: contentStr,
        timestamp: Date.now(),
        mode,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, assistantMsg] } : s));
      setIsLoading(false);
    },
    onError: (e) => { toast.error(`AI 请求失败: ${e.message}`); setIsLoading(false); },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession?.messages]);
  useEffect(() => {
    if (assistantContext.fileContent && assistantContext.fileName) {
      setInput(`请分析以下文件 "${assistantContext.fileName}" 的代码：\n\n\`\`\`\n${assistantContext.fileContent.slice(0, 500)}...\n\`\`\``);
      setMode("audit");
    }
  }, [assistantContext]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: `msg-${Date.now()}`, role: "user", content: input, timestamp: Date.now(), mode };
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
    const messages: Array<{role: "user" | "assistant" | "system"; content: string}> = [
      ...(activeSession?.messages ?? []).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: input },
    ];
    setIsLoading(true);
    setInput("");
    chatMutation.mutate({ messages, mode, contextCode: assistantContext.fileContent, contextProject: assistantContext.projectId ? `Project ID: ${assistantContext.projectId}` : undefined });
  };

  const handleToolAction = (toolId: string) => {
    switch (toolId) {
      case "create_payload": dispatchAction({ type: "create_payload" }); toast.success("已触发载荷生成向导"); break;
      case "search_templates": dispatchAction({ type: "search_templates" }); toast.success("已跳转到模板库"); break;
      case "trigger_build": dispatchAction({ type: "trigger_build", payload: { projectId: 1 } }); break;
      case "open_editor": dispatchAction({ type: "open_editor" }); break;
    }
  };

  const createSession = () => {
    const newId = Math.max(...sessions.map(s => s.id), 0) + 1;
    setSessions(prev => [...prev, { id: newId, name: `会话 ${newId}`, archived: false, messages: [], mode: "chat" }]);
    setActiveSessionId(newId);
  };

  const exportSession = () => {
    if (!activeSession) return;
    const md = `# ${activeSession.name}\n\n` + activeSession.messages.map(m =>
      `**${m.role === "user" ? "👤 用户" : "🤖 AI"}** _(${new Date(m.timestamp).toLocaleString()})_\n\n${m.content}\n\n---\n`
    ).join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${activeSession.name}.md`; a.click();
    toast.success("对话已导出为 Markdown");
  };

  const clearSession = () => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
    toast.success("会话已清空");
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* ─── Session Sidebar ─────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-border bg-muted/20 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full gap-1.5 bg-grad-purple border-0 shadow-sm" onClick={createSession}>
            <Plus className="w-3.5 h-3.5" /> 新建会话
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">活跃会话</p>
            {sessions.filter(s => !s.archived).map(session => {
              const mConf = MODE_CONFIG[session.mode];
              const MIcon = mConf?.icon ?? MessageSquare;
              return (
                <button key={session.id} onClick={() => setActiveSessionId(session.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-left transition-all group",
                    activeSessionId === session.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-foreground hover:bg-muted"
                  )}>
                  <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
                    activeSessionId === session.id ? "bg-white/20" : cn(mConf?.bg)
                  )}>
                    <MIcon className={cn("w-3.5 h-3.5", activeSessionId === session.id ? "text-white" : mConf?.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{session.name}</p>
                    <p className={cn("text-[10px] truncate", activeSessionId === session.id ? "text-white/70" : "text-muted-foreground")}>
                      {session.messages.length} 条消息
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* AI Tools */}
        <div className="p-2 border-t border-border space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">AI 工具调用</p>
          {AI_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleToolAction(tool.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all hover:bg-muted group">
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border", tool.color)}>
                <tool.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-foreground">{tool.label}</p>
                <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* ─── Chat Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            {editingName ? (
              <Input value={nameInput} onChange={e => setNameInput(e.target.value)}
                onBlur={() => { if (nameInput) setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, name: nameInput } : s)); setEditingName(false); }}
                onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                className="h-7 text-sm w-40" autoFocus />
            ) : (
              <button className="flex items-center gap-1.5 group" onClick={() => { setNameInput(activeSession?.name ?? ""); setEditingName(true); }}>
                <span className="text-sm font-semibold">{activeSession?.name ?? "新会话"}</span>
                <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            {assistantContext.fileName && (
              <Badge variant="secondary" className="text-[10px] gap-1 h-5">
                <Code2 className="w-2.5 h-2.5" />{assistantContext.fileName}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clearSession}>
              <X className="w-3 h-3" /> 清空
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportSession}>
              <Download className="w-3 h-3" /> 导出
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-muted/10 overflow-x-auto shrink-0">
          {(Object.entries(MODE_CONFIG) as [ChatMode, typeof MODE_CONFIG[ChatMode]][]).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button key={key} onClick={() => setMode(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                  mode === key ? cn("text-white border-transparent shadow-sm", key === "chat" ? "bg-blue-500" : key === "code_gen" ? "bg-green-500" : key === "audit" ? "bg-red-500" : key === "exploit" ? "bg-orange-500" : "bg-purple-500") : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                )}>
                <Icon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })}
          <div className="ml-auto shrink-0 text-[10px] text-muted-foreground hidden md:block">
            {MODE_CONFIG[mode].description}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {!activeSession?.messages.length ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl shadow-purple-900/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">RedTeam AI 助手</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                专业的红队/渗透测试 AI 助手，支持代码生成、漏洞利用分析、代码审计和报告生成
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button key={i} onClick={() => { setMode(qp.mode); setInput(qp.prompt); }}
                    className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn("w-6 h-6 rounded-lg bg-muted flex items-center justify-center", qp.color)}>
                        <qp.icon className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">{qp.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{qp.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto">
              {activeSession.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} onToolExecute={handleToolAction} />
              ))}
              {isLoading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">AI 思考中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-white/95 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border p-2 focus-within:border-primary/40 focus-within:shadow-sm transition-all">
              <Textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={MODE_CONFIG[mode].placeholder}
                className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 text-sm p-1 leading-relaxed"
                rows={2} />
              <div className="flex flex-col gap-1.5">
                <Button size="icon" className={cn("w-9 h-9 rounded-xl shadow-sm", isLoading ? "bg-muted" : "bg-grad-primary border-0")}
                  disabled={!input.trim() || isLoading} onClick={handleSend}>
                  {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">Enter</kbd> 发送 ·
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono ml-1">Shift+Enter</kbd> 换行
              </p>
              <p className="text-[10px] text-muted-foreground">
                模式: <span className="font-semibold text-foreground">{MODE_CONFIG[mode].label}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
