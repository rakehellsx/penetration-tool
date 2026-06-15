import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bot, Terminal, Shield, Globe, Palette, Users, FileText,
  Database, Save, RefreshCw, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Key, Server, Cpu, HardDrive, Activity,
  Lock, Zap, Code2, Settings, Package, Layers, Radio,
  TrendingUp, Clock, Hash, Star, GitBranch, ExternalLink,
  ChevronRight, Plus, Trash2, Edit3, Check, X, Info
} from "lucide-react";

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pr-9 font-mono text-sm" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function StatusIndicator({ status }: { status: "connected" | "disconnected" | "testing" | "unknown" }) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
      status === "connected" ? "text-green-700 bg-green-50 border-green-200" :
      status === "disconnected" ? "text-red-600 bg-red-50 border-red-200" :
      status === "testing" ? "text-blue-600 bg-blue-50 border-blue-200" :
      "text-gray-500 bg-gray-50 border-gray-200"
    )}>
      {status === "testing" ? <RefreshCw className="w-3 h-3 animate-spin" /> :
       status === "connected" ? <CheckCircle2 className="w-3 h-3" /> :
       status === "disconnected" ? <X className="w-3 h-3" /> :
       <Info className="w-3 h-3" />}
      {status === "connected" ? "已连接" : status === "disconnected" ? "未连接" : status === "testing" ? "检测中..." : "未配置"}
    </div>
  );
}

function SectionCard({ title, description, icon: Icon, iconColor, children, status }: {
  title: string; description: string; icon: React.ElementType; iconColor: string;
  children: React.ReactNode; status?: "connected" | "disconnected" | "testing" | "unknown";
}) {
  return (
    <Card className="border border-border card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-sm", iconColor)}>
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          {status && <StatusIndicator status={status} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

const AUDIT_DEMO = [
  { id: 1, module: "ai", action: "ai_generate", resourceName: "反射注入代码", details: { tokens: 2840 }, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 2, module: "build", action: "trigger_build", resourceName: "Build-windows_x64", details: { platform: "windows_x64" }, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, module: "payload", action: "create_payload", resourceName: "RevShell-Win64-HTTP", details: { os: "windows" }, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, module: "project", action: "create_project", resourceName: "Operation-Phantom", details: { platform: "windows" }, createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 5, module: "ai", action: "ai_generate", resourceName: "漏洞利用代码", details: { tokens: 4200 }, createdAt: new Date(Date.now() - 86400000).toISOString() },
];

const MODULE_COLORS: Record<string, string> = {
  ai: "bg-purple-100 text-purple-700",
  build: "bg-green-100 text-green-700",
  payload: "bg-amber-100 text-amber-700",
  project: "bg-blue-100 text-blue-700",
  template: "bg-emerald-100 text-emerald-700",
  system: "bg-gray-100 text-gray-700",
};

export default function SystemSettings() {
  const [aiConfig, setAiConfig] = useState({
    opencodeApiUrl: "http://127.0.0.1:4096",
    opencodeApiKey: "",
  });
  const [compilerConfig, setCompilerConfig] = useState({
    gccPath: "/usr/bin/gcc",
    goPath: "/usr/local/go/bin/go",
    rustPath: "/home/user/.cargo/bin/rustc",
    remoteHost: "",
    remotePort: "22",
    remoteUser: "build",
    remoteKeyPath: "~/.ssh/id_rsa",
  });
  const [integrations, setIntegrations] = useState({
    virusTotalKey: "",
    proxyEnabled: false,
    proxyHost: "127.0.0.1",
    proxyPort: "7890",
    proxyType: "socks5",
  });
  const [editorPrefs, setEditorPrefs] = useState({
    fontSize: 13,
    fontFamily: "JetBrains Mono",
    tabSize: 4,
    wordWrap: false,
    minimap: true,
    theme: "pentest-dark",
    ligatures: true,
    autoSave: true,
  });
  const [aiStatus, setAiStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [vtStatus, setVtStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");
  const [sshStatus, setSshStatus] = useState<"unknown" | "connected" | "disconnected" | "testing">("unknown");

  const { data: auditLogs = [] } = trpc.audit.list.useQuery({ limit: 30 });
  const { data: settings = [] } = trpc.settings.getAll.useQuery();
  const saveMutation = trpc.settings.setMany.useMutation({
    onSuccess: () => toast.success("设置已保存 ✓"),
    onError: () => toast.error("保存失败"),
  });

  useEffect(() => {
    const getSetting = (key: string) => settings.find((item: any) => item.key === key)?.value;
    const opencodeApiUrl = getSetting("ai.opencodeApiUrl");
    const opencodeApiKey = getSetting("ai.opencodeApiKey");
    if (opencodeApiUrl || opencodeApiKey) {
      setAiConfig(c => ({
        ...c,
        opencodeApiUrl: opencodeApiUrl ?? c.opencodeApiUrl,
        opencodeApiKey: opencodeApiKey ?? c.opencodeApiKey,
      }));
    }
  }, [settings]);

  const testConnection = async (type: "ai" | "vt" | "ssh") => {
    if (type === "ai") {
      setAiStatus("testing");
      try {
        const response = await fetch("/api/ai/opencode/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opencodeApiUrl: aiConfig.opencodeApiUrl,
            opencodeApiKey: aiConfig.opencodeApiKey,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message ?? "连接测试失败");
        setAiStatus("connected");
        toast.success(`OpenCode 连接正常：${result.providerCount ?? 0} 个提供商`);
      } catch (err: any) {
        setAiStatus("disconnected");
        toast.error(err?.message ?? "OpenCode 连接失败");
      }
    }
    if (type === "vt") { setVtStatus("testing"); setTimeout(() => setVtStatus(integrations.virusTotalKey.length > 20 ? "connected" : "disconnected"), 1500); }
    if (type === "ssh") { setSshStatus("testing"); setTimeout(() => setSshStatus(compilerConfig.remoteHost ? "connected" : "disconnected"), 1500); }
  };

  const displayLogs = auditLogs.length > 0 ? auditLogs : AUDIT_DEMO;

  return (
    <div className="p-6 space-y-5 max-w-[1200px] animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">系统设置</h2>
        <p className="text-sm text-muted-foreground mt-0.5">配置 AI 模型、编译环境、外部服务集成与系统偏好</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="h-9 flex-wrap gap-1">
          {[
            { value: "ai", icon: Bot, label: "AI 配置" },
            { value: "compiler", icon: Terminal, label: "编译环境" },
            { value: "integration", icon: Globe, label: "外部集成" },
            { value: "editor", icon: Palette, label: "编辑器" },
            { value: "users", icon: Users, label: "用户管理" },
            { value: "audit", icon: FileText, label: "审计日志" },
            { value: "backup", icon: Database, label: "备份恢复" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5">
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* AI Config */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <SectionCard title="OpenCode API 设置" description="智能助手统一通过本地 OpenCode API 调度 DeepSeek 模型" icon={Bot} iconColor="bg-grad-purple" status={aiStatus}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">OpenCode API</Label>
                <Input value={aiConfig.opencodeApiUrl} onChange={e => setAiConfig(c => ({ ...c, opencodeApiUrl: e.target.value }))} placeholder="http://127.0.0.1:4096" className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">OpenCode Key</Label>
                <PasswordInput value={aiConfig.opencodeApiKey} onChange={v => setAiConfig(c => ({ ...c, opencodeApiKey: v }))} placeholder="可选：OPENCODE_SERVER_PASSWORD" />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">当前模型由 OpenCode 统一管理</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">本项目后端会读取上述 OpenCode API 与 Key，向 OpenCode 创建会话并转发流式事件；DeepSeek Provider 与模型在 OpenCode 配置中维护。</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => testConnection("ai")}>
                <Activity className="w-3.5 h-3.5" /> 测试 OpenCode
              </Button>
              <Button size="sm" className="gap-1.5 bg-grad-primary border-0"
                onClick={() => saveMutation.mutate([
                  { key: "ai.opencodeApiUrl", value: aiConfig.opencodeApiUrl, category: "ai" },
                  { key: "ai.opencodeApiKey", value: aiConfig.opencodeApiKey, category: "ai" },
                ])}>
                <Save className="w-3.5 h-3.5" /> 保存配置
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Compiler */}
        <TabsContent value="compiler" className="space-y-4 mt-4">
          <SectionCard title="本地编译工具链" description="配置本地编译器路径" icon={Terminal} iconColor="bg-gradient-to-br from-gray-600 to-gray-700">
            <div className="space-y-3">
              {[
                { label: "GCC", key: "gccPath", icon: Code2, placeholder: "/usr/bin/gcc" },
                { label: "Go", key: "goPath", icon: Code2, placeholder: "/usr/local/go/bin/go" },
                { label: "Rust", key: "rustPath", icon: Code2, placeholder: "/home/user/.cargo/bin/rustc" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Label className="text-xs font-semibold w-10 shrink-0">{item.label}</Label>
                  <Input value={(compilerConfig as any)[item.key]} onChange={e => setCompilerConfig(c => ({ ...c, [item.key]: e.target.value }))} placeholder={item.placeholder} className="font-mono text-sm flex-1 h-8" />
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={() => toast.info(`检测 ${item.label} 中...`)}>检测</Button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="远程构建服务器" description="通过 SSH 连接远程编译环境" icon={Server} iconColor="bg-gradient-to-br from-blue-500 to-blue-600" status={sshStatus}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">SSH 主机</Label>
                <Input value={compilerConfig.remoteHost} onChange={e => setCompilerConfig(c => ({ ...c, remoteHost: e.target.value }))} placeholder="build.example.com" className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">端口</Label>
                <Input value={compilerConfig.remotePort} onChange={e => setCompilerConfig(c => ({ ...c, remotePort: e.target.value }))} placeholder="22" className="font-mono text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">用户名</Label>
                <Input value={compilerConfig.remoteUser} onChange={e => setCompilerConfig(c => ({ ...c, remoteUser: e.target.value }))} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SSH 密钥路径</Label>
                <Input value={compilerConfig.remoteKeyPath} onChange={e => setCompilerConfig(c => ({ ...c, remoteKeyPath: e.target.value }))} className="font-mono text-sm" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testConnection("ssh")}>
              <Activity className="w-3.5 h-3.5" /> 测试 SSH 连接
            </Button>
          </SectionCard>
        </TabsContent>

        {/* Integration */}
        <TabsContent value="integration" className="space-y-4 mt-4">
          <SectionCard title="VirusTotal 集成" description="配置 VirusTotal API 用于载荷免杀评分" icon={Shield} iconColor="bg-gradient-to-br from-blue-500 to-indigo-600" status={vtStatus}>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">API Key</Label>
              <PasswordInput value={integrations.virusTotalKey} onChange={v => setIntegrations(c => ({ ...c, virusTotalKey: v }))} placeholder="输入 VirusTotal API Key（64位字符串）" />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
              <Info className="w-4 h-4 shrink-0" />
              <p>免费账号每分钟限制 4 次请求，商业账号无限制。<a href="https://www.virustotal.com/gui/my-apikey" className="underline font-semibold ml-1" target="_blank">获取 API Key →</a></p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testConnection("vt")}>
              <CheckCircle2 className="w-3.5 h-3.5" /> 验证 API Key
            </Button>
          </SectionCard>

          <SectionCard title="网络代理" description="配置出站流量代理" icon={Globe} iconColor="bg-gradient-to-br from-emerald-500 to-green-600">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold">启用代理</p>
                  <p className="text-[10px] text-muted-foreground">所有出站请求通过代理转发</p>
                </div>
              </div>
              <Switch checked={integrations.proxyEnabled} onCheckedChange={v => setIntegrations(c => ({ ...c, proxyEnabled: v }))} />
            </div>
            {integrations.proxyEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">类型</Label>
                  <Select value={integrations.proxyType} onValueChange={v => setIntegrations(c => ({ ...c, proxyType: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">主机</Label>
                  <Input value={integrations.proxyHost} onChange={e => setIntegrations(c => ({ ...c, proxyHost: e.target.value }))} className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">端口</Label>
                  <Input value={integrations.proxyPort} onChange={e => setIntegrations(c => ({ ...c, proxyPort: e.target.value }))} className="font-mono text-sm" />
                </div>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Editor */}
        <TabsContent value="editor" className="space-y-4 mt-4">
          <SectionCard title="代码编辑器偏好" description="自定义 Monaco Editor 外观与行为" icon={Palette} iconColor="bg-gradient-to-br from-pink-500 to-rose-600">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">字体</Label>
                <Select value={editorPrefs.fontFamily} onValueChange={v => setEditorPrefs(c => ({ ...c, fontFamily: v }))}>
                  <SelectTrigger className="text-sm font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", "Consolas"].map(f => (
                      <SelectItem key={f} value={f}><span className="font-mono">{f}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">主题</Label>
                <Select value={editorPrefs.theme} onValueChange={v => setEditorPrefs(c => ({ ...c, theme: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pentest-dark", "vs-dark", "monokai", "dracula", "one-dark"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">字体大小: <span className="font-mono text-primary">{editorPrefs.fontSize}px</span></Label>
              </div>
              <Slider value={[editorPrefs.fontSize]} onValueChange={([v]) => setEditorPrefs(c => ({ ...c, fontSize: v }))} min={10} max={20} step={1} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "wordWrap", label: "自动换行", desc: "超出宽度自动换行" },
                { key: "minimap", label: "代码小地图", desc: "右侧显示代码缩略图" },
                { key: "ligatures", label: "字体连字", desc: "启用编程字体连字符" },
                { key: "autoSave", label: "自动保存", desc: "修改后自动保存文件" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={(editorPrefs as any)[item.key]} onCheckedChange={v => setEditorPrefs(c => ({ ...c, [item.key]: v }))} />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-4">
          <SectionCard title="用户权限管理" description="管理平台成员与访问权限" icon={Users} iconColor="bg-gradient-to-br from-indigo-500 to-indigo-600">
            <div className="space-y-2">
              {[
                { name: "Admin User", email: "admin@redteam.io", role: "admin", status: "online", avatar: "A" },
                { name: "Operator", email: "op@redteam.io", role: "editor", status: "online", avatar: "O" },
                { name: "Analyst", email: "analyst@redteam.io", role: "readonly", status: "offline", avatar: "N" },
              ].map((user, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                  <div className="relative">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-sm bg-grad-primary text-white font-bold">{user.avatar}</AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      user.status === "online" ? "bg-green-500" : "bg-gray-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge className={cn("text-[10px]",
                    user.role === "admin" ? "bg-red-100 text-red-700 border-red-200" :
                    user.role === "editor" ? "bg-blue-100 text-blue-700 border-blue-200" :
                    "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {user.role === "admin" ? "管理员" : user.role === "editor" ? "编辑者" : "只读"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => toast.info("权限管理即将上线")}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={() => toast.info("邀请成员即将上线")}>
                <Plus className="w-3.5 h-3.5" /> 邀请成员
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">审计日志</CardTitle>
                    <CardDescription className="text-xs">所有操作记录，含 AI 生成内容</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{displayLogs.length} 条</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-1.5">
                  {displayLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", MODULE_COLORS[log.module] ?? MODULE_COLORS.system)}>
                        {log.module}
                      </span>
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{log.action}</span>
                      {log.resourceName && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{log.resourceName}</span>}
                      {log.details?.tokens && <span className="text-[10px] text-purple-600 shrink-0">{log.details.tokens} tokens</span>}
                      <span className="text-[10px] text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="mt-4">
          <SectionCard title="数据备份与恢复" description="导出/导入平台全量数据" icon={Database} iconColor="bg-gradient-to-br from-teal-500 to-cyan-600">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "导出全量备份", desc: "打包所有项目、载荷、模板", icon: HardDrive, action: () => toast.info("备份功能即将上线") },
                { label: "从备份恢复", desc: "从 ZIP 文件恢复数据", icon: RefreshCw, action: () => toast.info("恢复功能即将上线") },
                { label: "导出审计日志", desc: "导出 CSV 格式审计记录", icon: FileText, action: () => toast.info("导出功能即将上线") },
                { label: "清理旧数据", desc: "删除30天前的构建记录", icon: Trash2, action: () => toast.warning("此操作不可逆，请谨慎") },
              ].map((item, i) => (
                <button key={i} onClick={item.action}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">备份包含所有敏感数据，请妥善保管备份文件并加密存储。建议每周进行一次全量备份。</p>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
