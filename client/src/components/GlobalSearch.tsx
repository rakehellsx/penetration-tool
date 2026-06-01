import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useApp, type ActiveModule } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import {
  FolderOpen, Package, FileCode, Hammer, Code2, Bot,
  Settings, LayoutDashboard, Search, ArrowRight, Clock,
  Shield, Terminal, Globe, Layers, ChevronRight, Hash,
  Zap, Star, Activity, Command, X
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "project" | "payload" | "template" | "build" | "action";
  title: string;
  subtitle?: string;
  module: ActiveModule;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  tags?: string[];
  action?: () => void;
}

const QUICK_ACTIONS: SearchResult[] = [
  { id: "new-project", type: "action", title: "新建项目", subtitle: "创建渗透测试项目", module: "projects", icon: FolderOpen, iconColor: "text-indigo-600", iconBg: "bg-indigo-50 border-indigo-200" },
  { id: "gen-payload", type: "action", title: "生成载荷", subtitle: "打开载荷生成向导", module: "payloads", icon: Zap, iconColor: "text-amber-600", iconBg: "bg-amber-50 border-amber-200" },
  { id: "ai-chat", type: "action", title: "AI 助手", subtitle: "开始 AI 对话", module: "assistant", icon: Bot, iconColor: "text-purple-600", iconBg: "bg-purple-50 border-purple-200" },
  { id: "code-editor", type: "action", title: "代码编辑器", subtitle: "打开代码编辑", module: "editor", icon: Code2, iconColor: "text-blue-600", iconBg: "bg-blue-50 border-blue-200" },
  { id: "build", type: "action", title: "一键构建", subtitle: "触发项目构建", module: "builds", icon: Hammer, iconColor: "text-green-600", iconBg: "bg-green-50 border-green-200" },
  { id: "templates", type: "action", title: "模板库", subtitle: "浏览代码模板", module: "templates", icon: FileCode, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 border-emerald-200" },
  { id: "overview", type: "action", title: "统计概览", subtitle: "查看平台数据", module: "overview", icon: LayoutDashboard, iconColor: "text-cyan-600", iconBg: "bg-cyan-50 border-cyan-200" },
  { id: "settings", type: "action", title: "系统设置", subtitle: "配置 AI 与编译环境", module: "settings", icon: Settings, iconColor: "text-slate-600", iconBg: "bg-slate-50 border-slate-200" },
];

const DEMO_PROJECTS = [
  { id: "p1", title: "Operation-Phantom", subtitle: "Windows · Go · 活跃", tags: ["apt", "evasion"] },
  { id: "p2", title: "APT-Simulation-2024", subtitle: "Linux · C · 活跃", tags: ["linux", "privesc"] },
  { id: "p3", title: "RedTeam-Infrastructure", subtitle: "跨平台 · Python · 活跃", tags: ["c2", "infrastructure"] },
  { id: "p4", title: "Evasion-Research", subtitle: "Windows · Rust · 草稿", tags: ["evasion", "rust"] },
  { id: "p5", title: "WebShell-Collection", subtitle: "跨平台 · Python · 活跃", tags: ["webshell"] },
];

const DEMO_PAYLOADS = [
  { id: "pl1", title: "RevShell-Win64-HTTP-AES", subtitle: "Windows x64 · EXE · 免杀率 95.8%", tags: ["http", "aes"] },
  { id: "pl2", title: "Loader-Reflective-DLL-x64", subtitle: "Windows x64 · DLL · 免杀率 91.7%", tags: ["dll", "reflective"] },
  { id: "pl3", title: "LinuxELF-RevShell-x64", subtitle: "Linux x64 · EXE · 免杀率 87.5%", tags: ["linux", "elf"] },
  { id: "pl4", title: "DNS-Tunnel-Payload-Win", subtitle: "Windows x64 · EXE · 免杀率 97.2%", tags: ["dns", "tunnel"] },
];

const DEMO_TEMPLATES = [
  { id: "t1", title: "Process Injection - Classic", subtitle: "注入 · Windows · C · T1055", tags: ["injection"] },
  { id: "t2", title: "Reverse Shell - PowerShell", subtitle: "其他 · Windows · PowerShell · T1059", tags: ["reverse_shell"] },
  { id: "t3", title: "Privilege Escalation - Token", subtitle: "提权 · Windows · C · T1134", tags: ["privesc"] },
  { id: "t4", title: "Persistence - Registry Run Key", subtitle: "持久化 · Windows · C · T1547", tags: ["persistence"] },
  { id: "t5", title: "Lateral Movement - SMB PTH", subtitle: "横向移动 · Windows · Python · T1550", tags: ["lateral"] },
];

function buildResults(query: string, dbProjects: any[], dbPayloads: any[], dbTemplates: any[]): SearchResult[] {
  const q = query.toLowerCase();

  const projectSrc = dbProjects.length > 0 ? dbProjects.map((p: any) => ({ id: `p${p.id}`, title: p.name, subtitle: `${p.platform} · ${p.language} · ${p.status}`, tags: p.tags ?? [] })) : DEMO_PROJECTS;
  const payloadSrc = dbPayloads.length > 0 ? dbPayloads.map((p: any) => ({ id: `pl${p.id}`, title: p.name, subtitle: `${p.os} ${p.arch} · ${p.payloadType}`, tags: p.tags ?? [] })) : DEMO_PAYLOADS;
  const templateSrc = dbTemplates.length > 0 ? dbTemplates.map((t: any) => ({ id: `t${t.id}`, title: t.name, subtitle: `${t.category} · ${t.platform ?? ""} · ${t.language ?? ""}`, tags: t.tags ?? [] })) : DEMO_TEMPLATES;

  const results: SearchResult[] = [];

  projectSrc.filter((p: any) => p.title.toLowerCase().includes(q) || (p.tags ?? []).some((t: string) => t.includes(q))).slice(0, 3).forEach((p: any) => {
    results.push({ id: p.id, type: "project", title: p.title, subtitle: p.subtitle, module: "projects", icon: FolderOpen, iconColor: "text-indigo-600", iconBg: "bg-indigo-50 border-indigo-200", tags: p.tags });
  });

  payloadSrc.filter((p: any) => p.title.toLowerCase().includes(q) || (p.tags ?? []).some((t: string) => t.includes(q))).slice(0, 3).forEach((p: any) => {
    results.push({ id: p.id, type: "payload", title: p.title, subtitle: p.subtitle, module: "payloads", icon: Package, iconColor: "text-amber-600", iconBg: "bg-amber-50 border-amber-200", tags: p.tags });
  });

  templateSrc.filter((t: any) => t.title.toLowerCase().includes(q) || (t.tags ?? []).some((tag: string) => tag.includes(q))).slice(0, 3).forEach((t: any) => {
    results.push({ id: t.id, type: "template", title: t.title, subtitle: t.subtitle, module: "templates", icon: FileCode, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 border-emerald-200", tags: t.tags });
  });

  return results;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

const TYPE_LABELS: Record<string, string> = {
  project: "项目", payload: "载荷", template: "模板", build: "构建", action: "操作"
};

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setActiveModule, dispatchAction } = useApp();

  const { data: dbProjects = [] } = trpc.projects.list.useQuery({});
  const { data: dbPayloads = [] } = trpc.payloads.list.useQuery({});
  const { data: dbTemplates = [] } = trpc.templates.list.useQuery({});

  const results: SearchResult[] = query.trim()
    ? buildResults(query, dbProjects, dbPayloads, dbTemplates)
    : QUICK_ACTIONS;

  const groupedResults = query.trim()
    ? Object.entries(
        results.reduce((acc, r) => {
          const key = TYPE_LABELS[r.type] ?? "其他";
          if (!acc[key]) acc[key] = [];
          acc[key].push(r);
          return acc;
        }, {} as Record<string, SearchResult[]>)
      )
    : [["快捷操作", QUICK_ACTIONS]];

  const flatResults = groupedResults.flatMap(([, items]) => items as SearchResult[]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((result: SearchResult) => {
    setActiveModule(result.module);
    if (result.type === "action") {
      if (result.id === "new-project") dispatchAction({ type: "open_project", payload: { create: true } });
      if (result.id === "gen-payload") dispatchAction({ type: "create_payload" });
    }
    onClose();
  }, [setActiveModule, dispatchAction, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatResults.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && flatResults[selectedIdx]) { handleSelect(flatResults[selectedIdx]); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatResults, selectedIdx, handleSelect, onClose]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl shadow-black/20 border border-border overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索项目、载荷、模板，或输入操作..."
            className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {groupedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">未找到 "{query}" 相关结果</p>
              <p className="text-xs text-muted-foreground mt-1">尝试搜索项目名称、载荷类型或模板分类</p>
            </div>
          ) : (
            groupedResults.map(([groupLabel, items]) => (
              <div key={groupLabel as string}>
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/30 border-b border-border">
                  {groupLabel as string}
                </div>
                {(items as SearchResult[]).map((result) => {
                  const isSelected = flatIdx === selectedIdx;
                  const currentIdx = flatIdx++;
                  const Icon = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIdx(currentIdx)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/50 last:border-0",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", result.iconBg)}>
                        <Icon className={cn("w-4 h-4", result.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          <HighlightText text={result.title} query={query} />
                        </p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                        )}
                      </div>
                      {result.tags && result.tags.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          {result.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">↑↓</kbd> 导航</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">↵</kbd> 确认</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-background border border-border font-mono">ESC</kbd> 关闭</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Hash className="w-3 h-3" />
            {flatResults.length} 个结果
          </div>
        </div>
      </div>

      {/* Backdrop */}
      <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />
    </div>
  );
}

// Hook for global keyboard shortcut
export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
