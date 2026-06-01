import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Package, Shield, Trash2, Copy, Tag, Filter,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, Zap,
  MoreHorizontal, RefreshCw, Eye, Download, Layers
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// ─── Mock payloads for demo ────────────────────────────────────────────────
const DEMO_PAYLOADS = [
  {
    id: 1, name: "RevShell-Win64-HTTP", os: "windows", arch: "x64", payloadType: "exe",
    listenType: "http", lhost: "192.168.1.100", lport: 8080,
    encoding: "base64", obfuscation: "string_encrypt", encryption: "aes256",
    avScore: 4.2, avDetections: 3, avTotal: 72,
    tags: ["reverse_shell", "http", "evasion"], notes: "HTTP反弹Shell，AES加密",
    fileSize: 156234, fileHash: "sha256:a1b2c3d4...", createdAt: new Date().toISOString(),
  },
  {
    id: 2, name: "Loader-Reflective-DLL", os: "windows", arch: "x64", payloadType: "dll",
    listenType: "reverse_shell", lhost: "10.0.0.1", lport: 4444,
    encoding: "xor", obfuscation: "control_flow", encryption: "rc4",
    avScore: 8.3, avDetections: 6, avTotal: 72,
    tags: ["dll_injection", "reflective"], notes: "反射DLL注入载荷",
    fileSize: 89432, fileHash: "sha256:e5f6g7h8...", createdAt: new Date().toISOString(),
  },
  {
    id: 3, name: "Shellcode-Meterpreter-x64", os: "windows", arch: "x64", payloadType: "shellcode",
    listenType: "reverse_shell", lhost: "192.168.1.100", lport: 4444,
    encoding: "shikata_ga_nai", obfuscation: "polymorphic", encryption: "none",
    avScore: 45.8, avDetections: 33, avTotal: 72,
    tags: ["meterpreter", "shellcode"], notes: "标准Meterpreter shellcode",
    fileSize: 4096, fileHash: "sha256:i9j0k1l2...", createdAt: new Date().toISOString(),
  },
  {
    id: 4, name: "LinuxELF-RevShell", os: "linux", arch: "x64", payloadType: "exe",
    listenType: "reverse_shell", lhost: "10.10.10.1", lport: 9001,
    encoding: "none", obfuscation: "strip_symbols", encryption: "none",
    avScore: 12.5, avDetections: 9, avTotal: 72,
    tags: ["linux", "elf", "reverse_shell"], notes: "Linux ELF反弹Shell",
    fileSize: 23456, fileHash: "sha256:m3n4o5p6...", createdAt: new Date().toISOString(),
  },
];

function AvScoreBadge({ score, detections, total }: { score: number; detections: number; total: number }) {
  const isGood = score < 10;
  const isMedium = score >= 10 && score < 30;
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
      isGood ? "bg-green-50 text-green-700 border border-green-200" :
      isMedium ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
      "bg-red-50 text-red-700 border border-red-200"
    )}>
      {isGood ? <CheckCircle2 className="w-3 h-3" /> : isMedium ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      <span>{detections}/{total}</span>
      <span className="text-[10px] opacity-70">({score.toFixed(1)}%)</span>
    </div>
  );
}

function PayloadWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", os: "windows", arch: "x64", payloadType: "exe",
    listenType: "reverse_shell", lhost: "192.168.1.100", lport: 4444,
    encoding: "base64", obfuscation: "string_encrypt", encryption: "aes256",
    notes: "", tags: "",
  });
  const utils = trpc.useUtils();
  const createMutation = trpc.payloads.create.useMutation({
    onSuccess: () => {
      utils.payloads.list.invalidate();
      toast.success("载荷生成成功");
      onClose();
      setStep(1);
    },
    onError: (e) => toast.error(`生成失败: ${e.message}`),
  });

  const steps = ["基本配置", "监听配置", "混淆加密", "确认生成"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            载荷生成向导
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                i + 1 === step ? "bg-primary text-white" :
                i + 1 < step ? "bg-green-500 text-white" :
                "bg-muted text-muted-foreground"
              )}>
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <div className={cn("text-[10px] ml-1 hidden sm:block", i + 1 <= step ? "text-foreground" : "text-muted-foreground")}>
                {s}
              </div>
              {i < steps.length - 1 && <div className={cn("flex-1 h-px mx-2", i + 1 < step ? "bg-green-500" : "bg-border")} />}
            </div>
          ))}
        </div>

        <div className="space-y-4 min-h-[200px]">
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">载荷名称 *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. RevShell-Win64-HTTP" className="font-mono text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">操作系统</Label>
                  <Select value={form.os} onValueChange={v => setForm(f => ({ ...f, os: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                      <SelectItem value="cross">跨平台</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">架构</Label>
                  <Select value={form.arch} onValueChange={v => setForm(f => ({ ...f, arch: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="x64">x64</SelectItem>
                      <SelectItem value="x86">x86</SelectItem>
                      <SelectItem value="arm64">ARM64</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">载荷类型</Label>
                  <Select value={form.payloadType} onValueChange={v => setForm(f => ({ ...f, payloadType: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shellcode">Shellcode</SelectItem>
                      <SelectItem value="exe">EXE</SelectItem>
                      <SelectItem value="dll">DLL</SelectItem>
                      <SelectItem value="script">Script</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">监听类型</Label>
                <Select value={form.listenType} onValueChange={v => setForm(f => ({ ...f, listenType: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reverse_shell">Reverse Shell</SelectItem>
                    <SelectItem value="bind">Bind Shell</SelectItem>
                    <SelectItem value="http">HTTP/HTTPS</SelectItem>
                    <SelectItem value="dns">DNS Tunnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">LHOST</Label>
                  <Input value={form.lhost} onChange={e => setForm(f => ({ ...f, lhost: e.target.value }))} placeholder="192.168.1.100" className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LPORT</Label>
                  <Input type="number" value={form.lport} onChange={e => setForm(f => ({ ...f, lport: parseInt(e.target.value) || 4444 }))} placeholder="4444" className="font-mono text-sm" />
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">编码方式</Label>
                  <Select value={form.encoding} onValueChange={v => setForm(f => ({ ...f, encoding: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="base64">Base64</SelectItem>
                      <SelectItem value="xor">XOR</SelectItem>
                      <SelectItem value="shikata_ga_nai">Shikata Ga Nai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">混淆方案</Label>
                  <Select value={form.obfuscation} onValueChange={v => setForm(f => ({ ...f, obfuscation: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="string_encrypt">字符串加密</SelectItem>
                      <SelectItem value="control_flow">控制流混淆</SelectItem>
                      <SelectItem value="polymorphic">多态变形</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">加密方案</Label>
                  <Select value={form.encryption} onValueChange={v => setForm(f => ({ ...f, encryption: v }))}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      <SelectItem value="aes256">AES-256</SelectItem>
                      <SelectItem value="rc4">RC4</SelectItem>
                      <SelectItem value="chacha20">ChaCha20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">备注</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="使用场景、目标环境..." className="text-sm resize-none" rows={2} />
              </div>
            </>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["名称", form.name], ["OS", form.os], ["架构", form.arch],
                    ["类型", form.payloadType], ["监听", form.listenType],
                    ["LHOST", form.lhost], ["LPORT", form.lport.toString()],
                    ["编码", form.encoding], ["混淆", form.obfuscation], ["加密", form.encryption],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-muted-foreground text-xs w-16 shrink-0">{k}:</span>
                      <span className="font-mono text-xs font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">确认以上配置后点击「生成载荷」</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>
            {step > 1 ? "上一步" : "取消"}
          </Button>
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={step === 1 && !form.name}>
              下一步
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: form.name,
                os: form.os as any,
                arch: form.arch as any,
                payloadType: form.payloadType as any,
                listenType: form.listenType as any,
                lhost: form.lhost,
                lport: form.lport,
                encoding: form.encoding,
                obfuscation: form.obfuscation,
                encryption: form.encryption,
                notes: form.notes,
                tags: form.tags ? form.tags.split(",").map(t => t.trim()) : [],
                generationParams: { encoding: form.encoding, obfuscation: form.obfuscation, encryption: form.encryption },
              })}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              {createMutation.isPending ? "生成中..." : "生成载荷"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayloadCard({ payload }: { payload: typeof DEMO_PAYLOADS[0] }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.payloads.delete.useMutation({
    onSuccess: () => { utils.payloads.list.invalidate(); toast.success("载荷已删除"); }
  });
  const morphMutation = trpc.payloads.morph.useMutation({
    onSuccess: () => { utils.payloads.list.invalidate(); toast.success("变形载荷已生成"); }
  });

  const OS_COLORS: Record<string, string> = {
    windows: "bg-blue-100 text-blue-700",
    linux: "bg-orange-100 text-orange-700",
    macos: "bg-gray-100 text-gray-700",
    cross: "bg-purple-100 text-purple-700",
  };
  const TYPE_COLORS: Record<string, string> = {
    shellcode: "bg-red-100 text-red-700",
    exe: "bg-indigo-100 text-indigo-700",
    dll: "bg-cyan-100 text-cyan-700",
    script: "bg-green-100 text-green-700",
  };

  return (
    <Card className="border border-border hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Package className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate font-mono">{payload.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {payload.lhost}:{payload.lport} · {payload.listenType?.replace("_", " ")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem onClick={() => toast.info("VirusTotal 扫描中...")}>
                <Shield className="w-3.5 h-3.5 mr-2" /> 免杀评分
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => morphMutation.mutate({ parentId: payload.id, name: `${payload.name}-morph-${Date.now()}` })}>
                <Layers className="w-3.5 h-3.5 mr-2" /> 变形生成
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("下载功能即将上线")}>
                <Download className="w-3.5 h-3.5 mr-2" /> 下载载荷
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate({ id: payload.id })}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={cn("text-[10px] h-4 px-1.5 font-normal", OS_COLORS[payload.os])}>{payload.os}</Badge>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{payload.arch}</Badge>
          <Badge className={cn("text-[10px] h-4 px-1.5 font-normal", TYPE_COLORS[payload.payloadType])}>{payload.payloadType}</Badge>
          {payload.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{tag}</Badge>
          ))}
        </div>

        {/* AV Score */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">免杀评分</span>
          <AvScoreBadge score={payload.avScore} detections={payload.avDetections} total={payload.avTotal} />
        </div>
        <Progress
          value={100 - payload.avScore}
          className="h-1.5"
        />

        {/* Footer */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
          <span>{(payload.fileSize / 1024).toFixed(1)} KB</span>
          <span className="font-mono text-[10px] truncate">{payload.fileHash.slice(0, 20)}...</span>
          <span className="ml-auto">{payload.encoding} + {payload.encryption}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Payloads() {
  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [filterOs, setFilterOs] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const { pendingAction, clearAction } = useApp();

  // Auto-open wizard if triggered from other modules
  if (pendingAction?.type === "create_payload") {
    clearAction();
    setTimeout(() => setShowWizard(true), 100);
  }

  const { data: dbPayloads = [] } = trpc.payloads.list.useQuery({
    os: filterOs !== "all" ? filterOs : undefined,
    payloadType: filterType !== "all" ? filterType : undefined,
    search: search || undefined,
  });

  // Merge demo + db payloads
  const allPayloads = [...DEMO_PAYLOADS, ...dbPayloads.map((p: any) => ({
    ...p,
    avScore: p.avScore ?? 0,
    avDetections: p.avDetections ?? 0,
    avTotal: p.avTotal ?? 72,
    tags: p.tags ?? [],
    fileSize: p.fileSize ?? 0,
    fileHash: p.fileHash ?? "sha256:unknown",
  }))].filter(p => {
    if (filterOs !== "all" && p.os !== filterOs) return false;
    if (filterType !== "all" && p.payloadType !== filterType) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">载荷管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">生成、管理和评估渗透测试载荷</p>
        </div>
        <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600" onClick={() => setShowWizard(true)}>
          <Zap className="w-3.5 h-3.5" />
          生成载荷
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "总载荷数", value: allPayloads.length, color: "text-indigo-600 bg-indigo-50" },
          { label: "免杀率 >90%", value: allPayloads.filter(p => p.avScore < 10).length, color: "text-green-600 bg-green-50" },
          { label: "Windows", value: allPayloads.filter(p => p.os === "windows").length, color: "text-blue-600 bg-blue-50" },
          { label: "Linux", value: allPayloads.filter(p => p.os === "linux").length, color: "text-orange-600 bg-orange-50" },
        ].map(stat => (
          <div key={stat.label} className={cn("rounded-lg p-3 flex items-center gap-2", stat.color)}>
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs opacity-80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="搜索载荷..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterOs} onValueChange={setFilterOs}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="OS" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部OS</SelectItem>
            <SelectItem value="windows">Windows</SelectItem>
            <SelectItem value="linux">Linux</SelectItem>
            <SelectItem value="macos">macOS</SelectItem>
          </SelectContent>
        </Select>
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
        <span className="text-xs text-muted-foreground ml-auto">共 {allPayloads.length} 个载荷</span>
      </div>

      {/* Payload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allPayloads.map((payload) => (
          <PayloadCard key={payload.id} payload={payload as any} />
        ))}
      </div>

      <PayloadWizard open={showWizard} onClose={() => setShowWizard(false)} />
    </div>
  );
}
