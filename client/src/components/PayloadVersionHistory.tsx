import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";
import {
  Shield, CheckCircle2, AlertTriangle, XCircle, Clock,
  Hash, HardDrive, Lock, Layers, TrendingUp, TrendingDown,
  ChevronRight, GitBranch, Zap, Eye, Copy, Download
} from "lucide-react";
import { toast } from "sonner";

// ─── Demo version history data ─────────────────────────────────────────────
export const DEMO_VERSION_HISTORY = [
  {
    version: 1,
    name: "RevShell-Win64-HTTP-AES-v1",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    params: {
      encoding: "none", obfuscation: "none", encryption: "none",
      lhost: "192.168.1.100", lport: 4444, listenType: "reverse_shell",
    },
    avScore: 45.8, avDetections: 33, avTotal: 72,
    fileSize: 98304, fileHash: "sha256:a1b2c3d4e5f6...",
    notes: "初始版本，无混淆处理",
  },
  {
    version: 2,
    name: "RevShell-Win64-HTTP-AES-v2",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    params: {
      encoding: "base64", obfuscation: "string_encrypt", encryption: "none",
      lhost: "192.168.1.100", lport: 4444, listenType: "reverse_shell",
    },
    avScore: 22.2, avDetections: 16, avTotal: 72,
    fileSize: 112640, fileHash: "sha256:b2c3d4e5f6a1...",
    notes: "添加 Base64 编码和字符串加密",
  },
  {
    version: 3,
    name: "RevShell-Win64-HTTP-AES-v3",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    params: {
      encoding: "base64", obfuscation: "control_flow", encryption: "rc4",
      lhost: "192.168.1.100", lport: 8080, listenType: "http",
    },
    avScore: 11.1, avDetections: 8, avTotal: 72,
    fileSize: 134144, fileHash: "sha256:c3d4e5f6a1b2...",
    notes: "切换为 HTTP 协议，添加 RC4 加密和控制流混淆",
  },
  {
    version: 4,
    name: "RevShell-Win64-HTTP-AES-v4",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    params: {
      encoding: "base64", obfuscation: "polymorphic", encryption: "aes256",
      lhost: "192.168.1.100", lport: 8080, listenType: "http",
    },
    avScore: 4.2, avDetections: 3, avTotal: 72,
    fileSize: 159872, fileHash: "sha256:d4e5f6a1b2c3...",
    notes: "升级为 AES-256 加密 + 多态变形，当前最优版本",
  },
];

const TREND_DATA = DEMO_VERSION_HISTORY.map(v => ({
  version: `v${v.version}`,
  avScore: v.avScore,
  evasionRate: 100 - v.avScore,
  detections: v.avDetections,
  fileSize: Math.round(v.fileSize / 1024),
}));

function DiffBadge({ old: oldVal, new: newVal, label, unit = "" }: {
  old: string | number; new: string | number; label: string; unit?: string
}) {
  const changed = String(oldVal) !== String(newVal);
  if (!changed) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="line-through text-red-400 text-[11px]">{oldVal}{unit}</span>
      <ChevronRight className="w-3 h-3 text-muted-foreground" />
      <span className="text-green-500 font-medium">{newVal}{unit}</span>
    </div>
  );
}

interface PayloadVersionHistoryProps {
  payloadName?: string;
  versions?: typeof DEMO_VERSION_HISTORY;
}

export function PayloadVersionHistory({ payloadName = "RevShell-Win64-HTTP-AES", versions = DEMO_VERSION_HISTORY }: PayloadVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);

  const selectedV = versions.find(v => v.version === selectedVersion);
  const compareV = versions.find(v => v.version === compareVersion);

  const getScoreColor = (score: number) => score < 10 ? "text-green-600" : score < 30 ? "text-yellow-600" : "text-red-600";
  const getScoreBg = (score: number) => score < 10 ? "bg-green-50 border-green-200" : score < 30 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-xs">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium">{p.value}{p.name === "免杀率" ? "%" : p.name === "文件大小" ? "KB" : ""}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Evasion Rate Trend */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              免杀率趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={TREND_DATA} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="evasionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="version" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} label={{ value: "目标 90%", position: "right", fontSize: 10, fill: "#22c55e" }} />
                <Area type="monotone" dataKey="evasionRate" name="免杀率" stroke="#22c55e" strokeWidth={2.5} fill="url(#evasionGrad)" dot={{ fill: "#22c55e", r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AV Detections Trend */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              检出数量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={TREND_DATA} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="version" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="detections" name="检出数" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: "#ef4444", r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="fileSize" name="文件大小" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: "#6366f1", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Version List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-indigo-500" />
              版本历史
              <Badge variant="secondary" className="text-[10px] ml-auto">{versions.length} 个版本</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-72">
              {versions.map((v, i) => {
                const isSelected = selectedVersion === v.version;
                const isCompare = compareVersion === v.version;
                const isLatest = i === versions.length - 1;
                return (
                  <div key={v.version}
                    className={cn(
                      "flex items-start gap-3 p-3.5 cursor-pointer transition-all border-b border-border last:border-0",
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" :
                      isCompare ? "bg-amber-50 border-l-2 border-l-amber-400" :
                      "hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedVersion(isSelected ? null : v.version)}
                  >
                    {/* Version badge */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2",
                      isLatest ? "bg-green-500 text-white border-green-600" :
                      isSelected ? "bg-primary text-white border-primary" :
                      "bg-muted text-muted-foreground border-border"
                    )}>
                      v{v.version}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold font-mono truncate">{v.name}</span>
                        {isLatest && <Badge className="text-[9px] h-4 px-1.5 bg-green-100 text-green-700 border-green-200 shrink-0">最新</Badge>}
                        {isCompare && <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200 shrink-0">对比中</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-1.5">{v.notes}</p>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className={cn("flex items-center gap-1 font-semibold", getScoreColor(v.avScore))}>
                          <Shield className="w-3 h-3" />
                          {v.avDetections}/{v.avTotal} ({(100 - v.avScore).toFixed(1)}% 免杀)
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {(v.fileSize / 1024).toFixed(1)}KB
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="w-6 h-6" title="设为对比版本"
                        onClick={(e) => { e.stopPropagation(); setCompareVersion(isCompare ? null : v.version); }}>
                        <Layers className={cn("w-3 h-3", isCompare ? "text-amber-500" : "text-muted-foreground")} />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6" title="下载此版本"
                        onClick={(e) => { e.stopPropagation(); toast.info("下载即将上线"); }}>
                        <Download className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Diff View */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              版本对比
              {selectedV && compareV && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  v{compareV.version} → v{selectedV.version}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedV || !compareV ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">选择两个版本进行对比</p>
                <p className="text-xs text-muted-foreground mt-1">
                  点击版本行选中，点击 <Layers className="w-3 h-3 inline" /> 图标设为对比版本
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {[compareV, selectedV].map((v, i) => (
                    <div key={v.version} className={cn("p-3 rounded-xl border", getScoreBg(v.avScore))}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={cn("text-xs font-bold", getScoreColor(v.avScore))}>v{v.version}</span>
                        {i === 1 && <Badge className="text-[9px] h-3.5 px-1 bg-green-100 text-green-700 border-green-200">新</Badge>}
                      </div>
                      <p className={cn("text-lg font-bold", getScoreColor(v.avScore))}>
                        {(100 - v.avScore).toFixed(1)}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">免杀率</p>
                      <p className={cn("text-xs font-semibold mt-1", getScoreColor(v.avScore))}>
                        {v.avDetections}/{v.avTotal} 检出
                      </p>
                    </div>
                  ))}
                </div>

                {/* Improvement indicator */}
                {(() => {
                  const improvement = compareV.avScore - selectedV.avScore;
                  const isImproved = improvement > 0;
                  return (
                    <div className={cn("flex items-center gap-2 p-2.5 rounded-xl border text-sm font-semibold",
                      isImproved ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"
                    )}>
                      {isImproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      免杀率{isImproved ? "提升" : "下降"} {Math.abs(improvement).toFixed(1)}%
                      <span className="text-xs font-normal ml-1">（检出数 {compareV.avDetections} → {selectedV.avDetections}）</span>
                    </div>
                  );
                })()}

                {/* Parameter diffs */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground mb-2">参数变更</p>
                  <DiffBadge old={compareV.params.encoding} new={selectedV.params.encoding} label="编码" />
                  <DiffBadge old={compareV.params.obfuscation} new={selectedV.params.obfuscation} label="混淆" />
                  <DiffBadge old={compareV.params.encryption} new={selectedV.params.encryption} label="加密" />
                  <DiffBadge old={compareV.params.listenType} new={selectedV.params.listenType} label="监听类型" />
                  <DiffBadge old={compareV.params.lport} new={selectedV.params.lport} label="端口" />
                  <DiffBadge old={`${(compareV.fileSize / 1024).toFixed(1)}`} new={`${(selectedV.fileSize / 1024).toFixed(1)}`} label="文件大小" unit="KB" />
                  {String(compareV.params.encoding) === String(selectedV.params.encoding) &&
                   String(compareV.params.obfuscation) === String(selectedV.params.obfuscation) &&
                   String(compareV.params.encryption) === String(selectedV.params.encryption) && (
                    <p className="text-xs text-muted-foreground italic">参数无变化</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
