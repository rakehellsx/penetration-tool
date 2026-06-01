import { useState } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bot, Terminal, Shield, Globe, Palette, Users, FileText,
  Database, Save, RefreshCw, Eye, EyeOff, CheckCircle2,
  AlertTriangle, Key, Server, Cpu, HardDrive, Activity
} from "lucide-react";

function SettingSection({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 font-mono text-sm"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function SystemSettings() {
  const [aiConfig, setAiConfig] = useState({
    apiKey: "sk-••••••••••••••••••••••••",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 4096,
    baseUrl: "https://api.openai.com/v1",
  });
  const [compilerConfig, setCompilerConfig] = useState({
    gccPath: "/usr/bin/gcc",
    goPath: "/usr/local/go/bin/go",
    rustPath: "/home/user/.cargo/bin/rustc",
    remoteHost: "",
    remotePort: "22",
    remoteUser: "build",
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
  });

  const { data: auditLogs = [] } = trpc.audit.list.useQuery({ limit: 20 });
  const saveMutation = trpc.settings.setMany.useMutation({
    onSuccess: () => toast.success("设置已保存"),
    onError: () => toast.error("保存失败"),
  });

  const handleSaveAI = () => {
    saveMutation.mutate([
      { key: "ai.model", value: aiConfig.model, category: "ai" },
      { key: "ai.temperature", value: aiConfig.temperature.toString(), category: "ai" },
      { key: "ai.maxTokens", value: aiConfig.maxTokens.toString(), category: "ai" },
      { key: "ai.baseUrl", value: aiConfig.baseUrl, category: "ai" },
    ]);
  };

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <div>
        <h2 className="text-xl font-bold text-foreground">系统设置</h2>
        <p className="text-sm text-muted-foreground mt-0.5">配置 AI 模型、编译环境、外部服务集成与系统偏好</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="ai" className="text-xs gap-1.5"><Bot className="w-3.5 h-3.5" />AI 配置</TabsTrigger>
          <TabsTrigger value="compiler" className="text-xs gap-1.5"><Terminal className="w-3.5 h-3.5" />编译环境</TabsTrigger>
          <TabsTrigger value="integration" className="text-xs gap-1.5"><Globe className="w-3.5 h-3.5" />外部集成</TabsTrigger>
          <TabsTrigger value="editor" className="text-xs gap-1.5"><Palette className="w-3.5 h-3.5" />编辑器偏好</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5"><FileText className="w-3.5 h-3.5" />审计日志</TabsTrigger>
          <TabsTrigger value="backup" className="text-xs gap-1.5"><Database className="w-3.5 h-3.5" />备份恢复</TabsTrigger>
        </TabsList>

        {/* AI Config */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <SettingSection title="AI 模型配置" description="配置 OpenAI 兼容 API 接口" icon={Bot}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">API Key</Label>
                <PasswordInput
                  value={aiConfig.apiKey}
                  onChange={v => setAiConfig(c => ({ ...c, apiKey: v }))}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Base URL</Label>
                <Input
                  value={aiConfig.baseUrl}
                  onChange={e => setAiConfig(c => ({ ...c, baseUrl: e.target.value }))}
                  placeholder="https://api.openai.com/v1"
                  className="text-sm font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">模型选择</Label>
                <Select value={aiConfig.model} onValueChange={v => setAiConfig(c => ({ ...c, model: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                    <SelectItem value="qwen2.5-coder">Qwen2.5 Coder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Tokens</Label>
                <Input
                  type="number"
                  value={aiConfig.maxTokens}
                  onChange={e => setAiConfig(c => ({ ...c, maxTokens: parseInt(e.target.value) || 4096 }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Temperature: {aiConfig.temperature}</Label>
                <span className="text-xs text-muted-foreground">
                  {aiConfig.temperature < 0.3 ? "精确" : aiConfig.temperature < 0.7 ? "平衡" : "创意"}
                </span>
              </div>
              <Slider
                value={[aiConfig.temperature]}
                onValueChange={([v]) => setAiConfig(c => ({ ...c, temperature: v }))}
                min={0} max={1} step={0.1}
                className="w-full"
              />
            </div>
            <Button size="sm" onClick={handleSaveAI} disabled={saveMutation.isPending} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "保存中..." : "保存 AI 配置"}
            </Button>
          </SettingSection>
        </TabsContent>

        {/* Compiler Config */}
        <TabsContent value="compiler" className="space-y-4 mt-4">
          <SettingSection title="本地编译工具链" description="配置本地编译器路径" icon={Terminal}>
            <div className="space-y-3">
              {[
                { label: "GCC 路径", key: "gccPath", placeholder: "/usr/bin/gcc" },
                { label: "Go 路径", key: "goPath", placeholder: "/usr/local/go/bin/go" },
                { label: "Rust 路径", key: "rustPath", placeholder: "/home/user/.cargo/bin/rustc" },
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3">
                  <Label className="text-xs w-24 shrink-0">{item.label}</Label>
                  <Input
                    value={compilerConfig[item.key as keyof typeof compilerConfig]}
                    onChange={e => setCompilerConfig(c => ({ ...c, [item.key]: e.target.value }))}
                    placeholder={item.placeholder}
                    className="font-mono text-sm flex-1"
                  />
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => toast.info("检测中...")}>
                    检测
                  </Button>
                </div>
              ))}
            </div>
          </SettingSection>
          <SettingSection title="远程构建服务器" description="配置远程 SSH 构建环境" icon={Server}>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">SSH 主机</Label>
                <Input value={compilerConfig.remoteHost} onChange={e => setCompilerConfig(c => ({ ...c, remoteHost: e.target.value }))} placeholder="build.example.com" className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">端口</Label>
                <Input value={compilerConfig.remotePort} onChange={e => setCompilerConfig(c => ({ ...c, remotePort: e.target.value }))} placeholder="22" className="font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">用户名</Label>
              <Input value={compilerConfig.remoteUser} onChange={e => setCompilerConfig(c => ({ ...c, remoteUser: e.target.value }))} placeholder="build" className="font-mono text-sm w-48" />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("测试连接中...")}>
              <Activity className="w-3.5 h-3.5" />
              测试连接
            </Button>
          </SettingSection>
        </TabsContent>

        {/* Integration */}
        <TabsContent value="integration" className="space-y-4 mt-4">
          <SettingSection title="VirusTotal 集成" description="配置 VirusTotal API 用于免杀评分" icon={Shield}>
            <div className="space-y-1.5">
              <Label className="text-xs">API Key</Label>
              <PasswordInput
                value={integrations.virusTotalKey}
                onChange={v => setIntegrations(c => ({ ...c, virusTotalKey: v }))}
                placeholder="输入 VirusTotal API Key"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("验证 API Key...")}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              验证 API Key
            </Button>
          </SettingSection>
          <SettingSection title="代理设置" description="配置网络代理" icon={Globe}>
            <div className="flex items-center gap-3">
              <Label className="text-xs">启用代理</Label>
              <Switch
                checked={integrations.proxyEnabled}
                onCheckedChange={v => setIntegrations(c => ({ ...c, proxyEnabled: v }))}
              />
            </div>
            {integrations.proxyEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">类型</Label>
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
                  <Label className="text-xs">主机</Label>
                  <Input value={integrations.proxyHost} onChange={e => setIntegrations(c => ({ ...c, proxyHost: e.target.value }))} className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">端口</Label>
                  <Input value={integrations.proxyPort} onChange={e => setIntegrations(c => ({ ...c, proxyPort: e.target.value }))} className="font-mono text-sm" />
                </div>
              </div>
            )}
          </SettingSection>
        </TabsContent>

        {/* Editor Preferences */}
        <TabsContent value="editor" className="space-y-4 mt-4">
          <SettingSection title="编辑器偏好" description="自定义代码编辑器外观与行为" icon={Palette}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">字体</Label>
                <Select value={editorPrefs.fontFamily} onValueChange={v => setEditorPrefs(c => ({ ...c, fontFamily: v }))}>
                  <SelectTrigger className="text-sm font-mono"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                    <SelectItem value="Fira Code">Fira Code</SelectItem>
                    <SelectItem value="Cascadia Code">Cascadia Code</SelectItem>
                    <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">主题</Label>
                <Select value={editorPrefs.theme} onValueChange={v => setEditorPrefs(c => ({ ...c, theme: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pentest-dark">PenTest Dark</SelectItem>
                    <SelectItem value="vs-dark">VS Dark</SelectItem>
                    <SelectItem value="monokai">Monokai</SelectItem>
                    <SelectItem value="dracula">Dracula</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">字体大小: {editorPrefs.fontSize}px</Label>
              </div>
              <Slider
                value={[editorPrefs.fontSize]}
                onValueChange={([v]) => setEditorPrefs(c => ({ ...c, fontSize: v }))}
                min={10} max={20} step={1}
              />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={editorPrefs.wordWrap} onCheckedChange={v => setEditorPrefs(c => ({ ...c, wordWrap: v }))} />
                <Label className="text-xs">自动换行</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editorPrefs.minimap} onCheckedChange={v => setEditorPrefs(c => ({ ...c, minimap: v }))} />
                <Label className="text-xs">显示小地图</Label>
              </div>
            </div>
          </SettingSection>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">审计日志</CardTitle>
                    <CardDescription className="text-xs">所有操作记录，含 AI 生成内容</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">{auditLogs.length} 条记录</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">暂无审计记录</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-xs">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          log.module === "ai" ? "bg-purple-500" :
                          log.module === "build" ? "bg-green-500" :
                          log.module === "payload" ? "bg-amber-500" :
                          "bg-blue-500"
                        )} />
                        <span className="text-muted-foreground w-20 shrink-0 font-mono">{log.module}</span>
                        <span className="text-foreground flex-1 truncate">{log.action}</span>
                        {log.resourceName && <span className="text-muted-foreground truncate max-w-32">{log.resourceName}</span>}
                        <span className="text-muted-foreground shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="space-y-4 mt-4">
          <SettingSection title="数据备份与恢复" description="导出/导入平台数据" icon={Database}>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info("备份功能即将上线")}>
                <HardDrive className="w-5 h-5" />
                <span className="text-xs">导出全量备份</span>
              </Button>
              <Button variant="outline" className="gap-2 h-20 flex-col" onClick={() => toast.info("恢复功能即将上线")}>
                <RefreshCw className="w-5 h-5" />
                <span className="text-xs">从备份恢复</span>
              </Button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">备份包含所有项目、载荷、模板和配置数据。请定期备份以防数据丢失。</p>
            </div>
          </SettingSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
