import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import {
  Plus, Search, Package, Shield, Trash2, Zap,
  MoreHorizontal, RefreshCw, Eye, Download, Layers, Terminal,
  Globe, Code2, Lock, HardDrive, Hash, Clock, Star,
  CheckCircle2, AlertTriangle, XCircle, Radio, Settings,
  GitBranch, TrendingUp, TrendingDown, ChevronRight, History
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { PayloadVersionHistory, DEMO_VERSION_HISTORY } from "@/components/PayloadVersionHistory";

const DEMO_PAYLOADS = [
  {
    id: 1, name: "RevShell-Win64-HTTP-AES", os: "windows", arch: "x64", payloadType: "exe",
    listenType: "http", lhost: "192.168.1.100", lport: 8080,
    encoding: "base64", obfuscation: "string_encrypt", encryption: "aes256",
    avScore: 4.2, avDetections: 3, avTotal: 72,
    tags: ["reverse_shell", "http", "evasion"], notes: "HTTP反弹Shell，AES-256加密，字符串混淆",
    fileSize: 156234, fileHash: "sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", createdAt: new Date().toISOString(),
    version: 4, parentId: null, starred: true, hasVersionHistory: true,
  },
  {
    id: 2, name: "Loader-Reflective-DLL-x64", os: "windows", arch: "x64", payloadType: "dll",
    listenType: "reverse_shell", lhost: "10.0.0.1", lport: 4444,
    encoding: "xor", obfuscation: "control_flow", encryption: "rc4",
    avScore: 8.3, avDetections: 6, avTotal: 72,
    tags: ["dll_injection", "reflective", "windows"], notes: "反射DLL注入，控制流混淆",
    fileSize: 89432, fileHash: "sha256:e5f6g7h8i9j0e5f6g7h8i9j0e5f6g7h8", createdAt: new Date().toISOString(),
    version: 2, parentId: null, starred: false, hasVersionHistory: false,
  },
  {
    id: 3, name: "Shellcode-Meterpreter-x64", os: "windows", arch: "x64", payloadType: "shellcode",
    listenType: "reverse_shell", lhost: "192.168.1.100", lport: 4444,
    encoding: "shikata_ga_nai", obfuscation: "polymorphic", encryption: "none",
    avScore: 45.8, avDetections: 33, avTotal: 72,
    tags: ["meterpreter", "shellcode", "msf"], notes: "标准Meterpreter shellcode，检出率较高",
    fileSize: 4096, fileHash: "sha256:i9j0k1l2m3n4i9j0k1l2m3n4i9j0k1l2", createdAt: new Date().toISOString(),
    version: 1, parentId: null, starred: false, hasVersionHistory: false,
  },
  {
    id: 4, name: "LinuxELF-RevShell-x64", os: "linux", arch: "x64", payloadType: "exe",
    listenType: "reverse_shell", lhost: "10.10.10.1", lport: 9001,
    encoding: "none", obfuscation: "strip_symbols", encryption: "none",
    avScore: 12.5, avDetections: 9, avTotal: 72,
    tags: ["linux", "elf", "reverse_shell"], notes: "Linux ELF反弹Shell，去符号处理",
    fileSize: 23456, fileHash: "sha256:m3n4o5p6q7r8m3n4o5p6q7r8m3n4o5p6", createdAt: new Date().toISOString(),
    version: 1, parentId: null, starred: false, hasVersionHistory: false,
  },
  {
    id: 5, name: "DNS-Tunnel-Payload-Win", os: "windows", arch: "x64", payloadType: "exe",
    listenType: "dns", lhost: "ns1.evil.com", lport: 53,
    encoding: "base32", obfuscation: "string_encrypt", encryption: "chacha20",
    avScore: 2.8, avDetections: 2, avTotal: 72,
    tags: ["dns", "tunnel", "covert"], notes: "DNS隧道通信，绕过出站过滤",
    fileSize: 198765, fileHash: "sha256:s9t0u1v2w3x4s9t0u1v2w3x4s9t0u1v2", createdAt: new Date().toISOString(),
    version: 4, parentId: null, starred: true, hasVersionHistory: false,
  },
  {
    id: 6, name: "macOS-Backdoor-ARM64", os: "macos", arch: "arm64", payloadType: "script",
    listenType: "http", lhost: "192.168.1.200", lport: 443,
    encoding: "base64", obfuscation: "none", encryption: "tls",
    avScore: 19.4, avDetections: 14, avTotal: 72,
    tags: ["macos", "arm64", "backdoor"], notes: "macOS M系列芯片后门，TLS加密通信",
    fileSize: 45678, fileHash: "sha256:y5z6a7b8c9d0y5z6a7b8c9d0y5z6a7b8", createdAt: new Date().toISOString(),
    version: 1, parentId: null, starred: false, hasVersionHistory: false,
  },
];

const OS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
  windows: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Shield },
  linux: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: Terminal },
  macos: { color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", icon: Globe },
  cross: { color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: Layers },
};

const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  shellcode: { color: "text-red-700", bg: "bg-red-50" },
  exe: { color: "text-indigo-700", bg: "bg-indigo-50" },
  dll: { color: "text-cyan-700", bg: "bg-cyan-50" },
  script: { color: "text-green-700", bg: "bg-green-50" },
  other: { color: "text-gray-700", bg: "bg-gray-50" },
};

function AvScoreRing({ score, detections, total }: { score: number; detections: number; total: number }) {
  const evasionRate = 100 - score;
  const color = score < 10 ? "#22c55e" : score < 30 ? "#f59e0b" : "#ef4444";
  const data = [{ value: evasionRate, fill: color }];
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" background={{ fill: "#f1f5f9" }} cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold" style={{ color }}>{evasionRate.toFixed(0)}%</span>
        </div>
      </div>
      <div>
        <div className={cn("flex items-center gap-1 text-xs font-semibold mb-0.5",
          score < 10 ? "text-green-700" : score < 30 ? "text-yellow-700" : "text-red-600"
        )}>
          {score < 10 ? <CheckCircle2 className="w-3 h-3" /> : score < 30 ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {score < 10 ? "免杀良好" : score < 30 ? "部分检出" : "高危检出"}
        </div>
        <p className="text-[11px] text-muted-foreground">{detections}/{total} 引擎检出</p>
      </div>
    </div>
  );
}

function PayloadDetailDialog({ payload, open, onClose }: { payload: any; open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("info");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            <Package className="w-4 h-4 text-amber-500" />
            {payload.name}
            <Badge variant="outline" className="text-[10px] font-mono">v{payload.version}</Badge>
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8">
            <TabsTrigger value="info" className="text-xs">基本信息</TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1">
              <History className="w-3 h-3" />版本历史
              {payload.hasVersionHistory && <Badge className="text-[9px] h-3.5 px-1 bg-amber-100 text-amber-700 ml-0.5">4</Badge>}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/40 border border-border">
                  <AvScoreRing score={payload.avScore} detections={payload.avDetections} total={payload.avTotal} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { icon: Radio, label: "监听", value: `${payload.lhost}:${payload.lport}`, color: "text-blue-500" },
                    { icon: Lock, label: "加密", value: payload.encryption, color: "text-green-500" },
                    { icon: Layers, label: "混淆", value: payload.obfuscation, color: "text-purple-500" },
                    { icon: Code2, label: "编码", value: payload.encoding, color: "text-cyan-500" },
                    { icon: HardDrive, label: "大小", value: `${(payload.fileSize / 1024).toFixed(1)}KB`, color: "text-orange-500" },
                    { icon: Hash, label: "Hash", value: payload.fileHash.slice(7, 19) + "...", color: "text-gray-500" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30">
                      <item.icon className={cn("w-3 h-3 shrink-0", item.color)} />
                      <span className="text-muted-foreground">{item.label}:</span>
                      <span className="font-mono font-medium truncate">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold">标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {payload.tags.map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">#{t}</span>
                  ))}
                </div>
                <p className="text-xs font-semibold mt-3">备注</p>
                <p className="text-xs text-muted-foreground">{payload.notes}</p>
                <p className="text-xs font-semibold mt-3">完整哈希</p>
                <p className="text-[10px] font-mono text-muted-foreground break-all bg-muted p-2 rounded-lg">{payload.fileHash}</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            {payload.hasVersionHistory ? (
              <PayloadVersionHistory payloadName={payload.name} versions={DEMO_VERSION_HISTORY} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">此载荷暂无版本历史</p>
                <p className="text-xs text-muted-foreground mt-1">使用「变形生成」功能可创建新版本并追踪历史</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PayloadCard({ payload, onView }: { payload: any; onView: (p: any) => void }) {
  const [starred, setStarred] = useState(payload.starred);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.payloads.delete.useMutation({ onSuccess: () => { utils.payloads.list.invalidate(); toast.success("已删除"); } });
  const morphMutation = trpc.payloads.morph.useMutation({ onSuccess: () => { utils.payloads.list.invalidate(); toast.success("变形载荷已生成"); } });

  const osConf = OS_CONFIG[payload.os] ?? OS_CONFIG.cross;
  const typeConf = TYPE_CONFIG[payload.payloadType] ?? TYPE_CONFIG.other;
  const OsIcon = osConf.icon;

  return (
    <Card className="border card-hover card-glow-primary overflow-hidden group">
      <div className={cn("h-0.5", payload.avScore < 10 ? "bg-grad-success" : payload.avScore < 30 ? "bg-grad-warning" : "bg-grad-danger")} />
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", osConf.bg, osConf.border)}>
            <OsIcon className={cn("w-5 h-5", osConf.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-sm font-bold font-mono truncate">{payload.name}</h3>
              {starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
              <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto shrink-0">v{payload.version}</Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{payload.notes}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">载荷操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(payload)}>
                <Eye className="w-3.5 h-3.5 mr-2 text-blue-500" /> 查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onView({ ...payload, _openTab: "history" })}>
                <History className="w-3.5 h-3.5 mr-2 text-indigo-500" /> 版本历史
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("VirusTotal 扫描中...")}>
                <Shield className="w-3.5 h-3.5 mr-2 text-blue-500" /> 免杀评分
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => morphMutation.mutate({ parentId: payload.id, name: `${payload.name}-morph-${Date.now()}` })}>
                <Layers className="w-3.5 h-3.5 mr-2 text-purple-500" /> 变形生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStarred(!starred)}>
                <Star className="w-3.5 h-3.5 mr-2 text-amber-400" /> {starred ? "取消收藏" : "收藏"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate({ id: payload.id })}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border", osConf.bg, osConf.border, osConf.color)}>{payload.os}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono">{payload.arch}</span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", typeConf.bg, typeConf.color)}>{payload.payloadType}</span>
          {payload.tags.slice(0, 2).map((t: string) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">#{t}</span>
          ))}
        </div>

        {/* AV Score */}
        <div className="mb-3 p-2.5 rounded-xl bg-muted/40 border border-border">
          <AvScoreRing score={payload.avScore} detections={payload.avDetections} total={payload.avTotal} />
        </div>

        {/* Config */}
        <div className="grid grid-cols-2 gap-1.5 mb-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Radio className="w-3 h-3 text-blue-500" />
            <span className="font-mono truncate">{payload.lhost}:{payload.lport}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="w-3 h-3 text-green-500" />
            <span>{payload.encryption !== "none" ? payload.encryption : "无加密"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="w-3 h-3 text-purple-500" />
            <span>{(payload.fileSize / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitBranch className="w-3 h-3 text-orange-500" />
            <span>v{payload.version} {payload.hasVersionHistory && "· 有历史"}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(payload.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            {payload.hasVersionHistory && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-indigo-500 hover:text-indigo-600"
                onClick={() => onView({ ...payload, _openTab: "history" })}>
                <History className="w-3 h-3" /> 历史
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-purple-500"
              onClick={() => morphMutation.mutate({ parentId: payload.id, name: `${payload.name}-morph` })}>
              <Layers className="w-3 h-3" /> 变形
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PayloadWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", os: "windows", arch: "x64", payloadType: "exe", listenType: "reverse_shell", lhost: "192.168.1.100", lport: 4444, encoding: "base64", obfuscation: "string_encrypt", encryption: "aes256", notes: "", tags: "" });
  const utils = trpc.useUtils();
  const createMutation = trpc.payloads.create.useMutation({
    onSuccess: () => { utils.payloads.list.invalidate(); toast.success("载荷生成成功 🎉"); onClose(); setStep(1); },
    onError: (e) => toast.error(`生成失败: ${e.message}`),
  });
  const steps = [{ label: "基本配置", icon: Settings }, { label: "监听配置", icon: Radio }, { label: "混淆加密", icon: Lock }, { label: "确认生成", icon: Zap }];
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-grad-amber flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            载荷生成向导
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all", done ? "bg-green-500 border-green-500 text-white" : active ? "bg-primary border-primary text-white" : "bg-muted border-border text-muted-foreground")}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn("text-[10px] font-medium hidden sm:block", active ? "text-primary" : "text-muted-foreground")}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-1 mb-4", done ? "bg-green-500" : "bg-border")} />}
              </div>
            );
          })}
        </div>
        <div className="min-h-[200px] space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">载荷名称 *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. RevShell-Win64-HTTP" className="font-mono" /></div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "操作系统", key: "os", options: [["windows","Windows"],["linux","Linux"],["macos","macOS"],["cross","跨平台"]] }, { label: "架构", key: "arch", options: [["x64","x64"],["x86","x86"],["arm64","ARM64"]] }, { label: "载荷类型", key: "payloadType", options: [["shellcode","Shellcode"],["exe","EXE"],["dll","DLL"],["script","Script"]] }].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{field.label}</Label>
                    <Select value={(form as any)[field.key]} onValueChange={v => setForm(f => ({ ...f, [field.key]: v }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{field.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">监听类型</Label><Select value={form.listenType} onValueChange={v => setForm(f => ({ ...f, listenType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reverse_shell">🔄 Reverse Shell</SelectItem><SelectItem value="bind">🔗 Bind Shell</SelectItem><SelectItem value="http">🌐 HTTP/HTTPS</SelectItem><SelectItem value="dns">📡 DNS Tunnel</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs font-semibold">LHOST</Label><Input value={form.lhost} onChange={e => setForm(f => ({ ...f, lhost: e.target.value }))} className="font-mono" /></div>
                <div className="space-y-1.5"><Label className="text-xs font-semibold">LPORT</Label><Input type="number" value={form.lport} onChange={e => setForm(f => ({ ...f, lport: parseInt(e.target.value) || 4444 }))} className="font-mono" /></div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "编码方式", key: "encoding", options: [["none","无"],["base64","Base64"],["xor","XOR"],["base32","Base32"],["shikata_ga_nai","Shikata Ga Nai"]] }, { label: "混淆方案", key: "obfuscation", options: [["none","无"],["string_encrypt","字符串加密"],["control_flow","控制流混淆"],["polymorphic","多态变形"],["strip_symbols","去符号"]] }, { label: "加密方案", key: "encryption", options: [["none","无"],["aes256","AES-256"],["rc4","RC4"],["chacha20","ChaCha20"],["tls","TLS"]] }].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-semibold">{field.label}</Label>
                    <Select value={(form as any)[field.key]} onValueChange={v => setForm(f => ({ ...f, [field.key]: v }))}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{field.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">备注</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none text-sm" rows={2} /></div>
            </>
          )}
          {step === 4 && (
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[["名称", form.name], ["OS", form.os], ["架构", form.arch], ["类型", form.payloadType], ["监听", form.listenType], ["LHOST", form.lhost], ["LPORT", String(form.lport)], ["编码", form.encoding], ["混淆", form.obfuscation], ["加密", form.encryption]].map(([k, v]) => (
                  <div key={k} className="flex gap-2 items-center">
                    <span className="text-muted-foreground text-xs w-14 shrink-0">{k}</span>
                    <span className="font-mono text-xs font-semibold bg-background px-2 py-0.5 rounded border border-border">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>{step > 1 ? "上一步" : "取消"}</Button>
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.name}>下一步 <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
          ) : (
            <Button size="sm" disabled={createMutation.isPending} className="bg-grad-amber border-0"
              onClick={() => createMutation.mutate({ name: form.name, os: form.os as any, arch: form.arch as any, payloadType: form.payloadType as any, listenType: form.listenType as any, lhost: form.lhost, lport: form.lport, encoding: form.encoding, obfuscation: form.obfuscation, encryption: form.encryption, notes: form.notes, tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [], generationParams: { encoding: form.encoding, obfuscation: form.obfuscation, encryption: form.encryption } })}>
              <Zap className="w-3.5 h-3.5 mr-1.5" />{createMutation.isPending ? "生成中..." : "生成载荷"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Payloads() {
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOs, setFilterOs] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [detailPayload, setDetailPayload] = useState<any>(null);
  const { pendingAction, clearAction } = useApp();

  if (pendingAction?.type === "create_payload") { clearAction(); setTimeout(() => setShowWizard(true), 100); }

  const { data: dbPayloads = [] } = trpc.payloads.list.useQuery({ os: filterOs !== "all" ? filterOs : undefined, payloadType: filterType !== "all" ? filterType : undefined, search: search || undefined });
  const allPayloads = dbPayloads.length > 0 ? dbPayloads.map((p: any) => ({ ...p, avScore: p.avScore ?? 0, avDetections: p.avDetections ?? 0, avTotal: p.avTotal ?? 72, tags: p.tags ?? [], fileSize: p.fileSize ?? 0, fileHash: p.fileHash ?? "sha256:unknown", version: 1, starred: false, hasVersionHistory: false })) : DEMO_PAYLOADS;

  const filtered = allPayloads.filter((p: any) => {
    if (filterOs !== "all" && p.os !== filterOs) return false;
    if (filterType !== "all" && p.payloadType !== filterType) return false;
    if (activeTab === "starred" && !p.starred) return false;
    if (activeTab === "windows" && p.os !== "windows") return false;
    if (activeTab === "linux" && p.os !== "linux") return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-[1600px] animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">载荷管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">生成、管理和评估渗透测试载荷，支持版本历史追踪与免杀优化</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 bg-grad-amber border-0 shadow-md shadow-amber-900/20" onClick={() => setShowWizard(true)}>
          <Zap className="w-3.5 h-3.5" /> 生成载荷
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3 stagger-children">
        {[
          { label: "总载荷数", value: allPayloads.length, icon: Package, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { label: "免杀率 >90%", value: allPayloads.filter((p: any) => p.avScore < 10).length, icon: Shield, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "Windows", value: allPayloads.filter((p: any) => p.os === "windows").length, icon: Shield, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "Linux", value: allPayloads.filter((p: any) => p.os === "linux").length, icon: Terminal, color: "text-orange-600 bg-orange-50 border-orange-200" },
        ].map(s => (
          <div key={s.label} className={cn("flex items-center gap-3 p-3.5 rounded-xl border card-hover", s.color)}>
            <s.icon className="w-5 h-5 shrink-0" />
            <div><p className="text-2xl font-bold leading-none">{s.value}</p><p className="text-xs opacity-80 mt-0.5">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
            <TabsTrigger value="starred" className="text-xs gap-1"><Star className="w-3 h-3" />收藏</TabsTrigger>
            <TabsTrigger value="windows" className="text-xs">Windows</TabsTrigger>
            <TabsTrigger value="linux" className="text-xs">Linux</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="搜索载荷..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="shellcode">Shellcode</SelectItem>
            <SelectItem value="exe">EXE</SelectItem>
            <SelectItem value="dll">DLL</SelectItem>
            <SelectItem value="script">Script</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} 个载荷</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
        {filtered.map((payload: any) => (
          <PayloadCard key={payload.id} payload={payload} onView={setDetailPayload} />
        ))}
      </div>

      <PayloadWizard open={showWizard} onClose={() => setShowWizard(false)} />
      {detailPayload && (
        <PayloadDetailDialog payload={detailPayload} open={!!detailPayload} onClose={() => setDetailPayload(null)} />
      )}
    </div>
  );
}
