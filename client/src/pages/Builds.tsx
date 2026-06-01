import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Hammer, Play, Square, Trash2, CheckCircle2, XCircle, Clock,
  RefreshCw, Download, AlertTriangle, ChevronRight, Terminal,
  Shield, Package, BarChart2, Layers, Zap, Eye
} from "lucide-react";

const PLATFORM_OPTIONS = [
  { value: "windows_x64", label: "Windows x64" },
  { value: "windows_x86", label: "Windows x86" },
  { value: "linux_x64", label: "Linux x64" },
  { value: "linux_arm64", label: "Linux ARM64" },
  { value: "macos_x64", label: "macOS x64" },
  { value: "macos_arm64", label: "macOS ARM64 (Apple Silicon)" },
];

const PIPELINE_STEPS = [
  { id: "compile", label: "编译", icon: Terminal },
  { id: "obfuscate", label: "混淆", icon: Layers },
  { id: "package", label: "打包", icon: Package },
  { id: "test", label: "测试", icon: Shield },
];

function PipelineStep({ step, status }: { step: typeof PIPELINE_STEPS[0]; status: string }) {
  const Icon = step.icon;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
        status === "success" ? "bg-green-50 border-green-500 text-green-600" :
        status === "running" ? "bg-blue-50 border-blue-500 text-blue-600 animate-pulse" :
        status === "failed" ? "bg-red-50 border-red-500 text-red-600" :
        "bg-muted border-border text-muted-foreground"
      )}>
        {status === "running" ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : status === "success" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : status === "failed" ? (
          <XCircle className="w-4 h-4" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      <span className={cn(
        "text-[10px] font-medium",
        status === "success" ? "text-green-600" :
        status === "running" ? "text-blue-600" :
        status === "failed" ? "text-red-600" :
        "text-muted-foreground"
      )}>
        {step.label}
      </span>
    </div>
  );
}

function BuildCard({ build, onViewLog }: { build: any; onViewLog: (b: any) => void }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.builds.delete.useMutation({
    onSuccess: () => { utils.builds.list.invalidate(); toast.success("构建记录已删除"); }
  });
  const { refreshStats } = useApp();

  const pipeline: Array<{step: string; status: string; log?: string}> = build.pipeline ?? [];
  const completedSteps = pipeline.filter(s => s.status === "success").length;
  const progress = (completedSteps / Math.max(pipeline.length, 1)) * 100;

  return (
    <Card className={cn(
      "border transition-all duration-200",
      build.status === "running" ? "border-blue-300 shadow-blue-100 shadow-md" :
      build.status === "success" ? "border-green-200" :
      build.status === "failed" ? "border-red-200" :
      "border-border"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold font-mono truncate">{build.name ?? `Build #${build.id}`}</h3>
              <Badge className={cn(
                "text-[10px] h-4 px-1.5",
                build.status === "success" ? "bg-green-100 text-green-700" :
                build.status === "failed" ? "bg-red-100 text-red-700" :
                build.status === "running" ? "bg-blue-100 text-blue-700" :
                build.status === "cancelled" ? "bg-gray-100 text-gray-600" :
                "bg-yellow-100 text-yellow-700"
              )}>
                {build.status === "success" ? "成功" : build.status === "failed" ? "失败" :
                 build.status === "running" ? "运行中" : build.status === "cancelled" ? "已取消" : "等待中"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{build.platform} · {build.duration ? `${(build.duration / 1000).toFixed(1)}s` : "—"}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onViewLog(build)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => deleteMutation.mutate({ id: build.id })}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Pipeline visualization */}
        <div className="flex items-center justify-between mb-3 relative">
          {PIPELINE_STEPS.map((step, i) => {
            const pipeStep = pipeline.find(p => p.step === step.id);
            const status = pipeStep?.status ?? "pending";
            return (
              <div key={step.id} className="flex items-center flex-1">
                <PipelineStep step={step} status={status} />
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-1 transition-colors",
                    pipeStep?.status === "success" ? "bg-green-400" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {build.status === "running" && (
          <Progress value={progress} className="h-1 mb-3" />
        )}

        {/* AV Score */}
        {build.avScore !== null && build.avScore !== undefined && (
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground">免杀检测</span>
            <div className={cn(
              "flex items-center gap-1 font-medium",
              build.avScore < 10 ? "text-green-600" : build.avScore < 30 ? "text-yellow-600" : "text-red-600"
            )}>
              <Shield className="w-3 h-3" />
              {build.avDetections}/{build.avTotal} ({build.avScore?.toFixed(1)}%)
            </div>
          </div>
        )}

        {/* Artifact info */}
        {build.artifactHash && (
          <div className="text-[10px] font-mono text-muted-foreground truncate bg-muted px-2 py-1 rounded">
            {build.artifactHash.slice(0, 40)}...
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
            <Terminal className="w-4 h-4" />
            构建日志 — {build?.name ?? `Build #${build?.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="bg-[var(--editor-bg)] rounded-lg p-4 font-mono text-xs text-[var(--editor-fg)] max-h-96 overflow-y-auto">
          {(build?.pipeline ?? []).map((step: any, i: number) => (
            <div key={i} className="mb-2">
              <div className={cn(
                "flex items-center gap-2 mb-1",
                step.status === "success" ? "text-green-400" :
                step.status === "failed" ? "text-red-400" :
                step.status === "running" ? "text-blue-400" : "text-gray-500"
              )}>
                {step.status === "success" ? "[✓]" : step.status === "failed" ? "[✗]" : "[~]"}
                <span className="uppercase">{step.step}</span>
              </div>
              {step.log && <p className="text-gray-400 pl-6">{step.log}</p>}
            </div>
          ))}
          {build?.buildLog && (
            <pre className="text-gray-300 whitespace-pre-wrap mt-2 border-t border-[var(--editor-border)] pt-2">
              {build.buildLog}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Builds() {
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [selectedPlatform, setSelectedPlatform] = useState("windows_x64");
  const [logBuild, setLogBuild] = useState<any>(null);
  const { buildTrigger, refreshStats } = useApp();
  const utils = trpc.useUtils();

  const { data: builds = [], isLoading } = trpc.builds.list.useQuery(
    { projectId: selectedProjectId },
    { refetchInterval: 2000 } // Poll every 2s for running builds
  );

  const createBuild = trpc.builds.create.useMutation({
    onSuccess: (data) => {
      utils.builds.list.invalidate();
      refreshStats();
      toast.success(`构建已启动 #${data.id}`);
    },
    onError: (e) => toast.error(`构建失败: ${e.message}`),
  });

  // Handle cross-module build trigger
  useEffect(() => {
    if (buildTrigger) {
      setSelectedProjectId(buildTrigger.projectId);
      setSelectedPlatform(buildTrigger.platform);
      createBuild.mutate({
        projectId: buildTrigger.projectId,
        platform: buildTrigger.platform,
        name: `Build-${buildTrigger.platform}-${Date.now()}`,
      });
    }
  }, [buildTrigger]);

  const runningBuilds = builds.filter((b: any) => b.status === "running");
  const successBuilds = builds.filter((b: any) => b.status === "success");
  const failedBuilds = builds.filter((b: any) => b.status === "failed");

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">构建测试</h2>
          <p className="text-sm text-muted-foreground mt-0.5">多平台构建流水线，自动化测试与产物管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            disabled={createBuild.isPending}
            onClick={() => createBuild.mutate({
              projectId: selectedProjectId,
              platform: selectedPlatform,
              name: `Build-${selectedPlatform}-${new Date().toISOString().slice(11, 19)}`,
            })}
          >
            <Play className="w-3.5 h-3.5" />
            {createBuild.isPending ? "启动中..." : "一键构建"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "总构建数", value: builds.length, color: "bg-indigo-50 text-indigo-700", icon: Hammer },
          { label: "运行中", value: runningBuilds.length, color: "bg-blue-50 text-blue-700", icon: RefreshCw },
          { label: "成功", value: successBuilds.length, color: "bg-green-50 text-green-700", icon: CheckCircle2 },
          { label: "失败", value: failedBuilds.length, color: "bg-red-50 text-red-700", icon: XCircle },
        ].map(stat => (
          <div key={stat.label} className={cn("rounded-lg p-3 flex items-center gap-3", stat.color)}>
            <stat.icon className="w-5 h-5" />
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs opacity-80">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Info */}
      <Card className="border border-border bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">构建流水线</span>
          </div>
          <div className="flex items-center gap-2">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-1.5 border border-indigo-200 text-xs font-medium text-indigo-700">
                  <step.icon className="w-3.5 h-3.5" />
                  {step.label}
                </div>
                {i < PIPELINE_STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-indigo-400" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Build List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-lg shimmer" />)}
        </div>
      ) : builds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hammer className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">暂无构建记录</p>
          <p className="text-xs text-muted-foreground mt-1">点击「一键构建」开始第一次构建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builds.map((build: any) => (
            <BuildCard key={build.id} build={build} onViewLog={setLogBuild} />
          ))}
        </div>
      )}

      {logBuild && (
        <BuildLogDialog build={logBuild} open={!!logBuild} onClose={() => setLogBuild(null)} />
      )}
    </div>
  );
}
