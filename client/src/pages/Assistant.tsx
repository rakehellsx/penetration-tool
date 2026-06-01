import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { useAIStream } from "@/hooks/useAIStream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import {
  Bot, Send, Plus, MessageSquare, Code2, Shield, FileText,
  Zap, Search, Hammer, Package, RefreshCw, ChevronRight,
  Download, Copy, X, Sparkles, AlertTriangle, Terminal,
  TrendingUp, Clock, Edit3, Check, FolderOpen, Save,
  FileCode, Settings, Square
} from "lucide-react";

type ChatMode = "chat" | "code_gen" | "audit" | "exploit" | "report";

const MODE_CONFIG: Record<ChatMode, {
  label: string; icon: React.ElementType; color: string; bg: string;
  placeholder: string; description: string; systemPrompt: string;
}> = {
  chat: {
    label: "通用对话", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    placeholder: "询问任何渗透测试相关问题...",
    description: "通用安全咨询与技术交流",
    systemPrompt: "你是一个专业的红队/渗透测试AI助手。你具备深厚的安全知识，能够帮助安全研究人员进行合法的渗透测试工作。请用中文回复，代码部分保持原语言。",
  },
  code_gen: {
    label: "代码生成", icon: Code2, color: "text-green-600", bg: "bg-green-50 border-green-200",
    placeholder: "描述需要生成的代码，如：生成一个 Windows x64 反射 DLL 注入载荷...",
    description: "AI 辅助生成渗透测试代码",
    systemPrompt: "你是一个专业的安全代码生成助手。根据用户描述生成高质量的渗透测试代码，包括漏洞利用代码、载荷代码等。请提供完整代码，用中文解释，代码用英文注释。生成的代码请用markdown代码块包裹，并标注语言类型。",
  },
  audit: {
    label: "代码审计", icon: Shield, color: "text-red-600", bg: "bg-red-50 border-red-200",
    placeholder: "粘贴需要审计的代码，AI 将分析安全漏洞和可利用点...",
    description: "自动化代码安全审计分析",
    systemPrompt: "你是一个代码安全审计专家。分析提供的代码，找出安全漏洞、可利用点和潜在风险。提供详细的漏洞描述、影响分析和利用思路。用中文回复，代码示例用英文。",
  },
  exploit: {
    label: "漏洞利用", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 border-orange-200",
    placeholder: "输入 CVE 编号或漏洞描述，如：CVE-2021-44228 Log4Shell...",
    description: "漏洞利用代码生成与分析",
    systemPrompt: "你是一个漏洞利用代码生成专家。生成的代码仅用于合法的安全研究和渗透测试。根据CVE编号或漏洞描述生成利用代码，提供详细注释和使用说明。用中文解释，代码用英文。",
  },
  report: {
    label: "报告生成", icon: FileText, color: "text-purple-600", bg: "bg-purple-50 border-purple-200",
    placeholder: "描述渗透测试过程，AI 将生成专业的渗透测试报告草稿...",
    description: "自动生成渗透测试报告",
    systemPrompt: "你是一个渗透测试报告撰写专家。将测试过程和发现整理为专业的渗透测试报告草稿，包括执行摘要、技术细节、风险评级（严重/高/中/低）和修复建议。用中文回复，格式规范。",
  },
};

const AI_TOOLS = [
  { id: "create_payload", label: "新建载荷", icon: Package, color: "text-amber-600 bg-amber-50 border-amber-200", desc: "触发载荷生成向导" },
  { id: "search_templates", label: "搜索模板", icon: Search, color: "text-emerald-600 bg-emerald-50 border-emerald-200", desc: "在模板库中搜索" },
  { id: "trigger_build", label: "执行构建", icon: Hammer, color: "text-green-600 bg-green-50 border-green-200", desc: "触发项目构建" },
  { id: "open_editor", label: "代码编辑", icon: Code2, color: "text-blue-600 bg-blue-50 border-blue-200", desc: "跳转到编辑器" },
];

const QUICK_PROMPTS = [
  { label: "Windows 反弹 Shell", mode: "code_gen" as ChatMode, icon: Terminal, color: "text-blue-600", prompt: "生成一个 Windows x64 反弹 Shell，使用 HTTP 协议，包含 AES-256 加密和字符串混淆，目标是绕过主流杀软检测。请提供完整的 Go 语言代码。" },
  { label: "Log4Shell 利用", mode: "exploit" as ChatMode, icon: AlertTriangle, color: "text-orange-600", prompt: "CVE-2021-44228 Log4Shell 漏洞，请提供详细的利用思路、PoC 代码和检测绕过方法" },
  { label: "代码审计示例", mode: "audit" as ChatMode, icon: Shield, color: "text-red-600", prompt: "请对以下代码进行安全审计，找出所有可利用的安全漏洞和潜在风险点" },
  { label: "渗透测试报告", mode: "report" as ChatMode, icon: FileText, color: "text-purple-600", prompt: "请根据以下渗透测试过程生成一份专业的安全评估报告，包含执行摘要、技术细节和修复建议" },
  { label: "提权技术分析", mode: "chat" as ChatMode, icon: TrendingUp, color: "text-green-600", prompt: "分析 Windows 系统中常见的本地提权技术，包括令牌模拟、SeImpersonatePrivilege 滥用等，并提供示例代码" },
  { label: "横向移动方法", mode: "chat" as ChatMode, icon: ChevronRight, color: "text-indigo-600", prompt: "介绍 Active Directory 环境中的横向移动技术，包括 Pass-the-Hash、Pass-the-Ticket 等，提供 Python 实现示例" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  mode?: ChatMode;
  isStreaming?: boolean;
  codeBlocks?: Array<{ language: string; code: string }>;
  toolCalls?: Array<{ tool: string; args: Record<string, unknown> }>;
}

// ─── Extract code blocks ───────────────────────────────────────────────────
function extractCodeBlocks(content: string) {
  const blocks: Array<{ language: string; code: string }> = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const code = match[2].trim();
    if (code.length > 20) blocks.push({ language: match[1] ?? "text", code });
  }
  return blocks;
}

// ─── Save to Project Dialog ────────────────────────────────────────────────
function SaveToProjectDialog({ open, onClose, codeBlocks, sessionName }: {
  open: boolean; onClose: () => void;
  codeBlocks: Array<{ language: string; code: string }>;
  sessionName: string;
}) {
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [newProject, setNewProject] = useState({ name: "", platform: "windows", language: "go", description: "" });
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>(codeBlocks.map((_, i) => i));
  const [fileNames, setFileNames] = useState<Record<number, string>>(
    Object.fromEntries(codeBlocks.map((b, i) => [i, `${sessionName.replace(/\s+/g, "_")}_${i + 1}.${b.language === "powershell" ? "ps1" : b.language === "python" ? "py" : b.language === "go" ? "go" : b.language === "cpp" ? "cpp" : b.language === "c" ? "c" : b.language}`]))
  );

  const utils = trpc.useUtils();
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: async (data) => { utils.projects.list.invalidate(); await saveFiles(data.id); },
    onError: (e) => toast.error(`创建项目失败: ${e.message}`),
  });
  const saveFileMutation = trpc.projects.saveFile.useMutation();
  const { data: projects = [] } = trpc.projects.list.useQuery({});

  const saveFiles = async (projectId: number) => {
    let saved = 0;
    for (const i of selectedBlocks) {
      const block = codeBlocks[i];
      try {
        await saveFileMutation.mutateAsync({
          projectId,
          name: fileNames[i] ?? `code_${i + 1}.${block.language}`,
          path: `/${fileNames[i] ?? `code_${i + 1}.${block.language}`}`,
          content: block.code,
          language: block.language,
        });
        saved++;
      } catch {}
    }
    toast.success(`已保存 ${saved} 个文件到项目`);
    onClose();
  };

  const handleSave = async () => {
    if (mode === "existing") {
      if (!selectedProjectId) { toast.warning("请选择目标项目"); return; }
      await saveFiles(parseInt(selectedProjectId));
    } else {
      if (!newProject.name) { toast.warning("请填写项目名称"); return; }
      createProjectMutation.mutate({ name: newProject.name, description: newProject.description || undefined, platform: newProject.platform, language: newProject.language });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-grad-primary flex items-center justify-center">
              <Save className="w-3.5 h-3.5 text-white" />
            </div>
            保存代码到项目
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setMode("new")} className={cn("flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium", mode === "new" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
              <Plus className="w-4 h-4" /> 新建项目并保存
            </button>
            <button onClick={() => setMode("existing")} className={cn("flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium", mode === "existing" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30")}>
              <FolderOpen className="w-4 h-4" /> 保存到已有项目
            </button>
          </div>
          {mode === "new" && (
            <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-1.5"><Label className="text-xs font-semibold">项目名称 *</Label><Input value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AI-Generated-Payload" className="font-mono" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs font-semibold">目标平台</Label>
                  <Select value={newProject.platform} onValueChange={v => setNewProject(p => ({ ...p, platform: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{[["windows","Windows"],["linux","Linux"],["macos","macOS"],["cross","跨平台"]].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">编程语言</Label>
                  <Select value={newProject.language} onValueChange={v => setNewProject(p => ({ ...p, language: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{["go","c","cpp","python","rust","powershell"].map(l => <SelectItem key={l} value={l}><span className="font-mono">{l}</span></SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">项目描述</Label><Textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} className="resize-none text-sm" rows={2} /></div>
            </div>
          )}
          {mode === "existing" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">选择目标项目</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger><SelectValue placeholder="选择项目..." /></SelectTrigger>
                <SelectContent>
                  {(projects as any[]).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <div className="flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5 text-indigo-500" /><span className="font-mono">{p.name}</span><span className="text-muted-foreground text-xs">· {p.platform}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label className="text-xs font-semibold">选择要保存的代码文件</Label><span className="text-xs text-muted-foreground">{selectedBlocks.length}/{codeBlocks.length} 已选</span></div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {codeBlocks.map((block, i) => (
                <div key={i} className={cn("flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer", selectedBlocks.includes(i) ? "border-primary bg-primary/5" : "border-border hover:border-primary/30")} onClick={() => setSelectedBlocks(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}>
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all", selectedBlocks.includes(i) ? "bg-primary border-primary" : "border-border")}>
                    {selectedBlocks.includes(i) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <Input value={fileNames[i] ?? `code_${i + 1}.${block.language}`} onChange={e => { e.stopPropagation(); setFileNames(prev => ({ ...prev, [i]: e.target.value })); }} onClick={e => e.stopPropagation()} className="h-6 text-xs font-mono flex-1 px-2" />
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0">{block.language}</Badge>
                    </div>
                    <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 max-h-16 overflow-hidden leading-4">{block.code.slice(0, 120)}...</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" className="bg-grad-primary border-0 gap-1.5" disabled={selectedBlocks.length === 0 || createProjectMutation.isPending || saveFileMutation.isPending} onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />{createProjectMutation.isPending || saveFileMutation.isPending ? "保存中..." : `保存 ${selectedBlocks.length} 个文件`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Streaming Message Bubble ──────────────────────────────────────────────
function MessageBubble({ message, onSaveCode, onToolExecute }: {
  message: Message;
  onSaveCode: (blocks: Array<{ language: string; code: string }>) => void;
  onToolExecute: (id: string) => void;
}) {
  const isUser = message.role === "user";
  const modeConf = message.mode ? MODE_CONFIG[message.mode] : null;
  const ModeIcon = modeConf?.icon ?? Bot;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeBlocks = message.codeBlocks ?? [];

  return (
    <div className={cn("flex gap-3 group animate-fade-in-up", isUser && "flex-row-reverse")}>
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm", isUser ? "bg-grad-primary text-white" : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white")}>
        {isUser ? <span className="text-xs font-bold">U</span> : <Bot className="w-4 h-4" />}
      </div>

      <div className={cn("flex-1 max-w-[88%]", isUser && "items-end flex flex-col")}>
        {!isUser && modeConf && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", modeConf.bg, modeConf.color)}>
              <ModeIcon className="w-3 h-3" />{modeConf.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</span>
            {message.isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-purple-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                生成中...
              </span>
            )}
          </div>
        )}

        <div className={cn("relative rounded-2xl px-4 py-3 text-sm shadow-sm", isUser ? "bg-grad-primary text-white rounded-tr-sm" : "bg-white border border-border rounded-tl-sm")}>
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none [&_pre]:bg-[var(--editor-bg)] [&_pre]:text-[var(--editor-fg)] [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:max-h-96 [&_pre]:overflow-y-auto [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono">
              <Streamdown>{message.content}</Streamdown>
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
          {!isUser && !message.isStreaming && (
            <button onClick={handleCopy} className="absolute top-2 right-2 w-6 h-6 rounded-md bg-muted/60 hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </button>
          )}
        </div>

        {/* Code save button - only show after streaming is done */}
        {!isUser && !message.isStreaming && codeBlocks.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => onSaveCode(codeBlocks)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors">
              <Save className="w-3.5 h-3.5" />
              保存代码到项目
              <Badge className="text-[9px] h-4 px-1 bg-indigo-200 text-indigo-800 ml-1">{codeBlocks.length} 个文件</Badge>
            </button>
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground self-center">AI 建议操作:</span>
            {message.toolCalls.map((tc, i) => {
              const tool = AI_TOOLS.find(t => t.id === tc.tool);
              if (!tool) return null;
              return (
                <button key={i} onClick={() => onToolExecute(tc.tool)} className={cn("flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all hover:shadow-sm", tool.color)}>
                  <tool.icon className="w-3.5 h-3.5" />{tool.label}<ChevronRight className="w-3 h-3 ml-0.5" />
                </button>
              );
            })}
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

// ─── Main Component ────────────────────────────────────────────────────────
export default function Assistant() {
  const { assistantContext, dispatchAction } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; blocks: Array<{ language: string; code: string }> }>({ open: false, blocks: [] });
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [activeSessionName, setActiveSessionName] = useState("新会话");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const utils = trpc.useUtils();

  // ─── Session persistence ─────────────────────────────────────────────────
  const { data: dbSessions = [], refetch: refetchSessions } = trpc.ai.listSessions.useQuery({});
  const createSessionMutation = trpc.ai.createSession.useMutation({
    onSuccess: (data) => {
      setActiveSessionId(data.id);
      refetchSessions();
    },
  });
  const updateSessionMutation = trpc.ai.updateSession.useMutation();
  const deleteSessionMutation = trpc.ai.deleteSession.useMutation({
    onSuccess: () => { refetchSessions(); setMessages([]); setActiveSessionId(null); setActiveSessionName("新会话"); },
  });

  // ─── Streaming ────────────────────────────────────────────────────────────
  const { isStreaming, startStream, cancelStream } = useAIStream({
    onChunk: (chunk, fullContent) => {
      if (!streamingMsgIdRef.current) return;
      const msgId = streamingMsgIdRef.current;
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, content: fullContent, isStreaming: true } : m
      ));
    },
    onDone: (fullContent, totalTokens) => {
      if (!streamingMsgIdRef.current) return;
      const msgId = streamingMsgIdRef.current;
      const codeBlocks = extractCodeBlocks(fullContent);
      const toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = [];
      if (fullContent.includes("新建载荷") || fullContent.includes("生成载荷")) toolCalls.push({ tool: "create_payload", args: {} });
      if (fullContent.includes("搜索模板") || fullContent.includes("模板库")) toolCalls.push({ tool: "search_templates", args: {} });
      if (fullContent.includes("执行构建") || fullContent.includes("一键构建")) toolCalls.push({ tool: "trigger_build", args: {} });

      setMessages(prev => prev.map(m =>
        m.id === msgId ? {
          ...m, content: fullContent, isStreaming: false,
          codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        } : m
      ));
      streamingMsgIdRef.current = null;

      // Persist session to DB after stream completes
      if (activeSessionId) {
        setMessages(current => {
          updateSessionMutation.mutate({
            id: activeSessionId,
            messages: current.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
            totalTokens: totalTokens,
          });
          return current;
        });
      }
    },
    onError: (error) => {
      if (streamingMsgIdRef.current) {
        const msgId = streamingMsgIdRef.current;
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, content: `❌ AI 请求失败: ${error}\n\n请检查系统设置中的 AI 配置。`, isStreaming: false } : m
        ));
        streamingMsgIdRef.current = null;
      }
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (assistantContext.fileContent && assistantContext.fileName) {
      setInput(`请分析以下文件 "${assistantContext.fileName}" 的代码：\n\n\`\`\`\n${assistantContext.fileContent.slice(0, 800)}\n\`\`\``);
      setMode("audit");
    }
  }, [assistantContext]);

  // ─── Create or load session ───────────────────────────────────────────────
  const createNewSession = useCallback(async (name = "新会话") => {
    setMessages([]);
    setActiveSessionName(name);
    setMode("chat");
    const result = await createSessionMutation.mutateAsync({ name });
    return result.id;
  }, [createSessionMutation]);

  const loadSession = useCallback((session: any) => {
    setActiveSessionId(session.id);
    setActiveSessionName(session.name);
    const msgs: Message[] = (session.messages ?? []).map((m: any) => ({
      id: `db-${m.timestamp}`,
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: m.timestamp,
    }));
    setMessages(msgs);
  }, []);

  // ─── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    // Create session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      const newId = await createNewSession(input.slice(0, 30) + (input.length > 30 ? "..." : ""));
      sessionId = newId;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now(),
      mode,
    };

    const assistantMsgId = `msg-${Date.now() + 1}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: Date.now() + 1,
      mode,
      isStreaming: true,
    };

    streamingMsgIdRef.current = assistantMsgId;
    const currentInput = input;
    setInput("");
    setMessages(prev => [...prev, userMsg, assistantMsg]);

    // Build conversation history for context
    const conversationMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: currentInput },
    ];

    await startStream({
      messages: conversationMessages,
      mode,
      systemPrompt: MODE_CONFIG[mode].systemPrompt,
      contextCode: assistantContext.fileContent,
      contextProject: assistantContext.projectId ? `Project ID: ${assistantContext.projectId}` : undefined,
      sessionId: sessionId ?? undefined,
    });
  }, [input, isStreaming, activeSessionId, messages, mode, assistantContext, startStream, createNewSession]);

  const handleToolAction = (toolId: string) => {
    switch (toolId) {
      case "create_payload": dispatchAction({ type: "create_payload" }); toast.success("已触发载荷生成向导"); break;
      case "search_templates": dispatchAction({ type: "search_templates" }); toast.success("已跳转到模板库"); break;
      case "trigger_build": dispatchAction({ type: "trigger_build", payload: { projectId: 1 } }); break;
      case "open_editor": dispatchAction({ type: "open_editor" }); break;
    }
  };

  const exportSession = () => {
    const md = `# ${activeSessionName}\n\n` + messages.map(m =>
      `**${m.role === "user" ? "👤 用户" : "🤖 AI"}** _(${new Date(m.timestamp).toLocaleString()})_\n\n${m.content}\n\n---\n`
    ).join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${activeSessionName}.md`; a.click();
    toast.success("对话已导出为 Markdown");
  };

  const allCodeBlocks = messages.filter(m => m.role === "assistant" && m.codeBlocks && m.codeBlocks.length > 0).flatMap(m => m.codeBlocks ?? []);

  return (
    <div className="h-full flex overflow-hidden">
      {/* ─── Session Sidebar ─────────────────────────────────────────── */}
      <div className="w-60 shrink-0 border-r border-border bg-muted/20 flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full gap-1.5 bg-grad-purple border-0 shadow-sm" onClick={() => createNewSession()}>
            <Plus className="w-3.5 h-3.5" /> 新建会话
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Current session (unsaved) */}
            {!activeSessionId && messages.length > 0 && (
              <div className="px-2.5 py-2 rounded-xl bg-primary text-white text-xs font-medium">
                <p className="truncate">{activeSessionName}</p>
                <p className="text-white/70 text-[10px]">{messages.length} 条消息 · 未保存</p>
              </div>
            )}

            {/* DB sessions */}
            {(dbSessions as any[]).length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">历史会话</p>
                {(dbSessions as any[]).filter((s: any) => !s.archived).map((session: any) => {
                  const isActive = activeSessionId === session.id;
                  const msgCount = (session.messages ?? []).length;
                  return (
                    <div key={session.id} className={cn("group flex items-center gap-1 px-2.5 py-2 rounded-xl cursor-pointer transition-all", isActive ? "bg-primary text-white" : "text-foreground hover:bg-muted")}>
                      <button className="flex-1 text-left min-w-0" onClick={() => loadSession(session)}>
                        <p className="text-xs font-medium truncate">{session.name}</p>
                        <p className={cn("text-[10px] truncate", isActive ? "text-white/70" : "text-muted-foreground")}>
                          {msgCount} 条消息 · {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button onClick={() => deleteSessionMutation.mutate({ id: session.id })} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-100 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {(dbSessions as any[]).length === 0 && messages.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-4 px-2">发送消息后会话将自动保存</p>
            )}
          </div>
        </ScrollArea>

        {/* AI Tools */}
        <div className="p-2 border-t border-border space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">AI 工具调用</p>
          {AI_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleToolAction(tool.id)} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all hover:bg-muted group">
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border", tool.color)}><tool.icon className="w-3.5 h-3.5" /></div>
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            {editingName ? (
              <Input value={nameInput} onChange={e => setNameInput(e.target.value)}
                onBlur={() => {
                  if (nameInput) {
                    setActiveSessionName(nameInput);
                    if (activeSessionId) updateSessionMutation.mutate({ id: activeSessionId, name: nameInput });
                  }
                  setEditingName(false);
                }}
                onKeyDown={e => e.key === "Enter" && setEditingName(false)}
                className="h-7 text-sm w-40" autoFocus />
            ) : (
              <button className="flex items-center gap-1.5 group" onClick={() => { setNameInput(activeSessionName); setEditingName(true); }}>
                <span className="text-sm font-semibold">{activeSessionName}</span>
                <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            {activeSessionId && <Badge variant="secondary" className="text-[10px] h-5 gap-1"><Check className="w-2.5 h-2.5 text-green-500" />已保存</Badge>}
            {assistantContext.fileName && <Badge variant="secondary" className="text-[10px] gap-1 h-5"><Code2 className="w-2.5 h-2.5" />{assistantContext.fileName}</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {allCodeBlocks.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => setSaveDialog({ open: true, blocks: allCodeBlocks })}>
                <Save className="w-3 h-3" />保存代码 ({allCodeBlocks.length})
              </Button>
            )}
            {isStreaming && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={cancelStream}>
                <Square className="w-3 h-3" />停止
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => { setMessages([]); setActiveSessionId(null); setActiveSessionName("新会话"); }}>
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
              <button key={key} onClick={() => setMode(key)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border", mode === key ? cn("text-white border-transparent shadow-sm", key === "chat" ? "bg-blue-500" : key === "code_gen" ? "bg-green-500" : key === "audit" ? "bg-red-500" : key === "exploit" ? "bg-orange-500" : "bg-purple-500") : "bg-white border-border text-muted-foreground hover:text-foreground hover:border-primary/30")}>
                <Icon className="w-3 h-3" />{config.label}
              </button>
            );
          })}
          <div className="ml-auto shrink-0 text-[10px] text-muted-foreground hidden md:flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-500" />
            流式输出已启用
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl shadow-purple-900/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">渗透测试 AI 助手</h3>
              <p className="text-sm text-muted-foreground mb-2 max-w-sm">专业的红队/渗透测试 AI 助手，支持流式输出与会话持久化</p>
              <p className="text-xs text-muted-foreground mb-6 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                AI 模型配置可在「系统设置 → AI 配置」中修改
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map((qp, i) => (
                  <button key={i} onClick={() => { setMode(qp.mode); setInput(qp.prompt); }} className="text-left p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={cn("w-6 h-6 rounded-lg bg-muted flex items-center justify-center", qp.color)}><qp.icon className="w-3.5 h-3.5" /></div>
                      <p className="text-xs font-semibold text-foreground">{qp.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{qp.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5 max-w-3xl mx-auto">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} onSaveCode={(blocks) => setSaveDialog({ open: true, blocks })} onToolExecute={handleToolAction} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border bg-white/95 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-muted/30 rounded-2xl border border-border p-2 focus-within:border-primary/40 focus-within:shadow-sm transition-all">
              <Textarea
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize: reset then set to scrollHeight
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  const lineHeight = 22;
                  const maxHeight = lineHeight * 5 + 16; // 5 lines + padding
                  el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={MODE_CONFIG[mode].placeholder}
                className="flex-1 min-h-[60px] max-h-[130px] resize-none border-0 bg-transparent focus-visible:ring-0 text-sm p-1 leading-relaxed overflow-y-auto"
                rows={1}
                style={{ height: "60px" }}
                disabled={isStreaming}
              />
              <Button size="icon" className={cn("w-9 h-9 rounded-xl shadow-sm", isStreaming ? "bg-red-500 hover:bg-red-600 border-0" : "bg-grad-primary border-0")}
                onClick={isStreaming ? cancelStream : handleSend}
                disabled={!isStreaming && !input.trim()}>
                {isStreaming ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-muted-foreground">
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono">Enter</kbd> 发送 ·
                <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] font-mono ml-1">Shift+Enter</kbd> 换行
                {isStreaming && <span className="ml-2 text-purple-500 font-medium">· AI 正在流式输出...</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">
                模式: <span className="font-semibold text-foreground">{MODE_CONFIG[mode].label}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {saveDialog.open && (
        <SaveToProjectDialog open={saveDialog.open} onClose={() => setSaveDialog({ open: false, blocks: [] })} codeBlocks={saveDialog.blocks} sessionName={activeSessionName} />
      )}
    </div>
  );
}
