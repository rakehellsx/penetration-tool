import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import {
  Hammer, Play, Square, Trash2, CheckCircle2, XCircle, Clock,
  RefreshCw, Download, AlertTriangle, ChevronRight, Terminal,
  Shield, Package, BarChart3, Layers, Zap, Eye, Code2,
  Hash, HardDrive, Activity, TrendingUp, TrendingDown,
  FolderOpen, Settings, Globe, Flame, Star, GitBranch
} from "lucide-react";

const PLATFORM_OPTIONS = [
  { value: "windows_x64", label: "Windows x64", icon: "🪟" },
  { value: "windows_x86", label: "Windows x86", icon: "🪟" },
  { value: "linux_x64", label: "Linux x64", icon: "🐧" },
  { value: "linux_arm64", label: "Linux ARM64", icon: "🐧" },
  { value: "macos_x64", label: "macOS x64", icon: "🍎" },
  { value: "macos_arm64", label: "macOS ARM64", icon: "🍎" },
];

const PIPELINE_STEPS = [
  { id: "compile", label: "编译", icon: Code2, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
  { id: "obfuscate", label: "混淆", icon: Layers, color: "text-purple-500", bg: "bg-purple-50 border-purple-200" },
  { id: "package", label: "打包", icon: Package, color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  { id: "test", label: "测试", icon: Shield, color: "text-green-500", bg: "bg-green-50 border-green-200" },
];

const DEMO_BUILDS = [
  { id: 1, name: "Build-windows_x64-14:32", platform: "windows_x64", status: "success", projectId: 101, projectName: "Operation-Phantom", pipeline: [{ step: "compile", status: "success", log: "Compiled in 2.3s" }, { step: "obfuscate", status: "success", log: "String encryption applied" }, { step: "package", status: "success", log: "UPX packed: 156KB" }, { step: "test", status: "success", log: "All tests passed" }], buildLog: "[✓] Build successful in 8.4s", artifactHash: "sha256:a1b2c3d4e5f6", artifactSize: 159872, avScore: 4.2, avDetections: 3, avTotal: 72, duration: 8400, ownerId: 1, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: 2, name: "Build-linux_x64-13:15", platform: "linux_x64", status: "success", projectId: 102, projectName: "APT-Simulation-2024", pipeline: [{ step: "compile", status: "success", log: "GCC compiled" }, { step: "obfuscate", status: "success", log: "Strip symbols" }, { step: "package", status: "success", log: "ELF: 23KB" }, { step: "test", status: "success", log: "Passed" }], buildLog: "[✓] Build complete", artifactHash: "sha256:b2c3d4e5f6a1", artifactSize: 23456, avScore: 12.5, avDetections: 9, avTotal: 72, duration: 5200, ownerId: 1, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, name: "Build-windows_x64-11:48", platform: "windows_x64", status: "failed", projectId: 101, projectName: "Operation-Phantom", pipeline: [{ step: "compile", status: "success", log: "OK" }, { step: "obfuscate", status: "failed", log: "Error: undefined reference" }, { step: "package", status: "pending", log: "" }, { step: "test", status: "pending", log: "" }], buildLog: "[✗] Failed at obfuscate", artifactHash: null, artifactSize: null, avScore: null, avDetections: null, avTotal: 72, duration: 3100, ownerId: 1, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, name: "Build-macos_arm64-09:20", platform: "macos_arm64", status: "success", projectId: 103, projectName: "RedTeam-Infrastructure", pipeline: PIPELINE_STEPS.map(s => ({ step: s.id, status: "success", log: `${s.label} OK` })), buildLog: "[✓] All steps completed", artifactHash: "sha256:c3d4e5f6a1b2", artifactSize: 45678, avScore: 19.4, avDetections: 14, avTotal: 72, duration: 11200, ownerId: 1, createdAt: new Date(Date.now() - 18000000).toISOString() },
];

const BUILD_TREND = [
  { day: "周一", success: 8, failed: 1, rate: 88.9 },
  { day: "周二", success: 12, failed: 2, rate: 85.7 },
  { day: "周三", success: 6, failed: 3, rate: 66.7 },
  { day: "周四", success: 15, failed: 1, rate: 93.8 },
  { day: "周五", success: 11, failed: 0, rate: 100 },
  { day: "周六", success: 4, failed: 1, rate: 80.0 },
  { day: "周日", success: 9, failed: 2, rate: 81.8 },
];

function PipelineViz({ pipeline }: { pipeline: Array<{ step: string; status: string; log?: string }> }) {
  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, i) => {
        const pStep = pipeline.find(p => p.step === step.id);
        const status = pStep?.status ?? "pending";
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <div className={cn("flex items-center justify-center w-7 h-7 rounded-full border transition-all",
              status === "success" ? "bg-green-50 border-green-400 text-green-600" :
              status === "running" ? "bg-blue-50 border-blue-400 text-blue-600 animate-pulse" :
              status === "failed" ? "bg-red-50 border-red-400 text-red-600" :
              "bg-muted border-border text-muted-foreground"
            )}>
              {status === "running" ? <RefreshCw className="w-3 h-3 animate-spin" /> :
               status === "success" ? <CheckCircle2 className="w-3 h-3" /> :
               status === "failed" ? <XCircle className="w-3 h-3" /> :
               <Icon className="w-3 h-3" />}
            </div>
            <span className={cn("text-[10px] font-medium hidden sm:block",
              status === "success" ? "text-green-600" : status === "running" ? "text-blue-600" :
              status === "failed" ? "text-red-600" : "text-muted-foreground"
            )}>{step.label}</span>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={cn("h-px w-3 transition-colors", pStep?.status === "success" ? "bg-green-400" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuildCard({ build, onViewLog }: { build: any; onViewLog: (b: any) => void }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.builds.delete.useMutation({ onSuccess: () => { utils.builds.list.invalidate(); toast.success("已删除"); } });
  const { refreshStats } = useApp();

  const statusConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ElementType }> = {
    success: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", label: "成功", icon: CheckCircle2 },
    failed: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "失败", icon: XCircle },
    running: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "运行中", icon: RefreshCw },
    pending: { color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", label: "等待中", icon: Clock },
    cancelled: { color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", label: "已取消", icon: Square },
  };
  const sc = statusConfig[build.status] ?? statusConfig.pending;
  const StatusIcon = sc.icon;
  const platOpt = PLATFORM_OPTIONS.find(p => p.value === build.platform);

  return (
    <Card className={cn("border card-hover overflow-hidden",
      build.status === "running" ? "border-blue-300 shadow-blue-100 shadow-md" :
      build.status === "success" ? "border-green-200" :
      build.status === "failed" ? "border-red-200" : "border-border"
    )}>
      <div className={cn("h-0.5", build.status === "success" ? "bg-grad-success" : build.status === "failed" ? "bg-grad-danger" : build.status === "running" ? "bg-grad-info" : "bg-muted")} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-bold font-mono truncate">{build.name ?? `Build #${build.id}`}</h3>
              <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", sc.bg, sc.border, sc.color)}>
                <StatusIcon className={cn("w-3 h-3", build.status === "running" && "animate-spin")} />
                {sc.label}
              </span>
            </div>
            {/* Project link */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3 h-3 text-indigo-500" />
                <span className="font-medium text-indigo-600">{build.projectName ?? `项目 #${build.projectId}`}</span>
              </span>
              <span>·</span>
              <span>{platOpt?.icon} {platOpt?.label ?? build.platform}</span>
              {build.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(build.duration / 1000).toFixed(1)}s</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onViewLog(build)}><Eye className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteMutation.mutate({ id: build.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        <div className="mb-3 p-2.5 rounded-xl bg-muted/40 border border-border">
          <PipelineViz pipeline={build.pipeline ?? []} />
        </div>

        {build.status === "running" && (
          <Progress value={(build.pipeline ?? []).filter((s: any) => s.status === "success").length / 4 * 100} className="h-1.5 mb-3 progress-animated" />
        )}

        {build.avScore !== null && build.avScore !== undefined && (
          <div className="flex items-center justify-between text-xs mb-2 p-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> 免杀检测</span>
            <div className={cn("flex items-center gap-1.5 font-semibold",
              build.avScore < 10 ? "text-green-600" : build.avScore < 30 ? "text-yellow-600" : "text-red-600"
            )}>
              {build.avScore < 10 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {build.avDetections}/{build.avTotal} ({build.avScore?.toFixed(1)}%)
            </div>
          </div>
        )}

        {build.artifactHash && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
            <Hash className="w-3 h-3 shrink-0" />
            <span className="truncate">{build.artifactHash.slice(0, 36)}...</span>
            {build.artifactSize && <span className="ml-auto shrink-0">{(build.artifactSize / 1024).toFixed(1)}KB</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BuildLogDialog({ build, open, onClose }: { build: any; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm">
            <Terminal className="w-4 h-4 text-green-400" />
            构建日志 — {build?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {PIPELINE_STEPS.map(step => {
              const pStep = (build?.pipeline ?? []).find((p: any) => p.step === step.id);
              const status = pStep?.status ?? "pending";
              const Icon = step.icon;
              return (
                <div key={step.id} className={cn("p-2.5 rounded-xl border text-center", step.bg)}>
                  <Icon className={cn("w-4 h-4 mx-auto mb-1", step.color)} />
                  <p className="text-[10px] font-semibold">{step.label}</p>
                  <p className={cn("text-[10px] mt-0.5", status === "success" ? "text-green-600" : status === "failed" ? "text-red-600" : "text-muted-foreground")}>
                    {status === "success" ? "✓ 完成" : status === "failed" ? "✗ 失败" : "— 跳过"}
                  </p>
                  {pStep?.log && <p className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{pStep.log}</p>}
                </div>
              );
            })}
          </div>
          <div className="bg-[var(--editor-bg)] rounded-xl p-4 font-mono text-xs text-[var(--editor-fg)] max-h-64 overflow-y-auto dark-scroll">
            <pre className="whitespace-pre-wrap leading-5">{build?.buildLog ?? "暂无日志"}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Builds() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState("windows_x64");
  const [logBuild, setLogBuild] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("builds");
  const { buildTrigger, refreshStats } = useApp();
  const utils = trpc.useUtils();

  // Load projects for selection
  const { data: projects = [] } = trpc.projects.list.useQuery({});
  const { data: dbBuilds = [] } = trpc.builds.list.useQuery({}, { refetchInterval: 2000 });

  // Merge demo + db builds
  const allBuilds = dbBuilds.length > 0 ? dbBuilds.map((b: any) => ({
    ...b,
    projectName: (projects as any[]).find((p: any) => p.id === b.projectId)?.name ?? `项目 #${b.projectId}`,
  })) : DEMO_BUILDS;

  // Filter by selected project
  const filteredBuilds = selectedProjectId === "all"
    ? allBuilds
    : allBuilds.filter((b: any) => String(b.projectId) === selectedProjectId);

  const createBuild = trpc.builds.create.useMutation({
    onSuccess: (data) => {
      utils.builds.list.invalidate();
      refreshStats();
      toast.success(`构建已启动 #${data.id} 🔨`);
    },
    onError: (e) => toast.error(`构建失败: ${e.message}`),
  });

  useEffect(() => {
    if (buildTrigger) {
      setSelectedProjectId(String(buildTrigger.projectId));
      setSelectedPlatform(buildTrigger.platform);
      createBuild.mutate({
        projectId: buildTrigger.projectId,
        platform: buildTrigger.platform,
        name: `Build-${buildTrigger.platform}-${new Date().toISOString().slice(11, 19)}`,
      });
    }
  }, [buildTrigger]);

  const handleStartBuild = () => {
    const projectId = selectedProjectId !== "all" ? parseInt(selectedProjectId) : 1;
    const projectName = (projects as any[]).find((p: any) => p.id === projectId)?.name ?? `项目 #${projectId}`;
    createBuild.mutate({
      projectId,
      platform: selectedPlatform,
      name: `Build-${selectedPlatform}-${new Date().toISOString().slice(11, 19)}`,
    });
  };

  const stats = {
    total: filteredBuilds.length,
    running: filteredBuilds.filter((b: any) => b.status === "running").length,
    success: filteredBuilds.filter((b: any) => b.status === "success").length,
    failed: filteredBuilds.filter((b: any) => b.status === "failed").length,
  };

  const selectedProject = selectedProjectId !== "all"
    ? (projects as any[]).find((p: any) => String(p.id) === selectedProjectId)
    : null;

  return (
    <div className="p-6 space-y-5 max-w-[1600px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">构建测试</h2>
          <p className="text-sm text-muted-foreground mt-0.5">选择项目，配置平台，一键触发构建流水线</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Project selector */}
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-52 h-8 text-sm">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <SelectValue placeholder="选择项目..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>全部项目</span>
                </div>
              </SelectItem>
              {(projects as any[]).length > 0 ? (
                (projects as any[]).map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono text-sm">{p.name}</span>
                      <span className="text-muted-foreground text-xs">· {p.platform}</span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                // Demo projects
                [
                  { id: 101, name: "Operation-Phantom", platform: "windows" },
                  { id: 102, name: "APT-Simulation-2024", platform: "linux" },
                  { id: 103, name: "RedTeam-Infrastructure", platform: "cross" },
                  { id: 104, name: "Evasion-Research", platform: "windows" },
                ].map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-mono text-sm">{p.name}</span>
                      <span className="text-muted-foreground text-xs">· {p.platform}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Platform selector */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="mr-1">{p.icon}</span>{p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="gap-1.5 h-8 bg-grad-success border-0 shadow-md shadow-green-900/20"
            disabled={createBuild.isPending}
            onClick={handleStartBuild}>
            <Play className="w-3.5 h-3.5" />
            {createBuild.isPending ? "启动中..." : "一键构建"}
          </Button>
        </div>
      </div>

      {/* Selected project info */}
      {selectedProject && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-indigo-900 font-mono">{selectedProject.name}</span>
            <span className="text-xs text-indigo-600 ml-2">{selectedProject.platform} · {selectedProject.language}</span>
          </div>
          <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">已选中</Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 stagger-children">
        {[
          { label: "构建总数", value: stats.total, icon: Hammer, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { label: "运行中", value: stats.running, icon: RefreshCw, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "成功", value: stats.success, icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "失败", value: stats.failed, icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.label} className={cn("flex items-center gap-3 p-3.5 rounded-xl border card-hover", s.color)}>
            <s.icon className="w-5 h-5 shrink-0" />
            <div><p className="text-2xl font-bold leading-none">{s.value}</p><p className="text-xs opacity-80 mt-0.5">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Pipeline info */}
      <Card className="border border-border bg-gradient-to-r from-indigo-50/80 to-blue-50/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-900">构建流水线</span>
            <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200 ml-auto">4 步骤自动执行</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold", step.bg, step.color)}>
                  <step.icon className="w-3.5 h-3.5" />{step.label}
                </div>
                {i < PIPELINE_STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-indigo-400" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="builds" className="text-xs gap-1.5"><Hammer className="w-3.5 h-3.5" />构建记录</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5"><BarChart3 className="w-3.5 h-3.5" />构建分析</TabsTrigger>
        </TabsList>

        <TabsContent value="builds" className="mt-4">
          {filteredBuilds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Hammer className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-base font-semibold text-muted-foreground">暂无构建记录</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProjectId !== "all" ? "该项目暂无构建记录" : "点击「一键构建」开始第一次构建"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
              {filteredBuilds.map((build: any) => (
                <BuildCard key={build.id} build={build} onViewLog={setLogBuild} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />本周构建统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={BUILD_TREND} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="success" name="成功" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="failed" name="失败" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />成功率趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={BUILD_TREND} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(v: number) => [`${v.toFixed(1)}%`, "成功率"]} />
                    <Line type="monotone" dataKey="rate" name="成功率" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {logBuild && <BuildLogDialog build={logBuild} open={!!logBuild} onClose={() => setLogBuild(null)} />}
    </div>
  );
}
