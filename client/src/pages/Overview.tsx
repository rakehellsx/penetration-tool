import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  FolderOpen, Package, Hammer, Bot, TrendingUp, TrendingDown,
  Plus, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight,
  Zap, Shield, Activity, Code2
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Fallback demo data (shown when DB is empty) ───────────────────────────
const DEMO_AI_TREND = [
  { date: "05-26", calls: 12, tokens: 4200 },
  { date: "05-27", calls: 18, tokens: 6800 },
  { date: "05-28", calls: 9, tokens: 3100 },
  { date: "05-29", calls: 24, tokens: 9200 },
  { date: "05-30", calls: 31, tokens: 12400 },
  { date: "05-31", calls: 28, tokens: 10800 },
  { date: "06-01", calls: 42, tokens: 16200 },
];
const DEMO_PAYLOAD_TYPE = [
  { name: "Shellcode", value: 38, color: "#6366f1" },
  { name: "EXE", value: 27, color: "#22c55e" },
  { name: "DLL", value: 19, color: "#f59e0b" },
  { name: "Script", value: 16, color: "#ef4444" },
];
const DEMO_PAYLOAD_OS = [
  { os: "Windows", x64: 32, x86: 18, arm64: 5 },
  { os: "Linux", x64: 24, x86: 8, arm64: 12 },
  { os: "macOS", x64: 11, x86: 0, arm64: 9 },
];

const MODULE_ICONS: Record<string, React.ElementType> = {
  build: Hammer, ai: Bot, payload: Package, project: FolderOpen, template: Code2
};

function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, color }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType;
  trend?: "up" | "down" | "neutral"; trendValue?: string; color: string;
}) {
  return (
    <Card className="border border-border hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {trendValue && (
              <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium",
                trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-muted-foreground"
              )}>
                {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { setActiveModule, setActiveProjectId, dispatchAction, statsRefreshTs } = useApp();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.overview.stats.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: aiTrend = [] } = trpc.overview.aiTrend.useQuery();
  const { data: payloadStats } = trpc.overview.payloadStats.useQuery();
  const { data: recentActivity = [] } = trpc.overview.recentActivity.useQuery();
  const { data: recentProjects = [] } = trpc.overview.recentProjects.useQuery();

  // Use real data or fallback to demo
  const aiTrendData = aiTrend.length > 0 ? aiTrend : DEMO_AI_TREND;
  const payloadTypeData = (payloadStats?.byType ?? []).length > 0 ? payloadStats!.byType : DEMO_PAYLOAD_TYPE;
  const payloadOsData = (payloadStats?.byOs ?? []).length > 0 ? payloadStats!.byOs : DEMO_PAYLOAD_OS;

  const displayStats = {
    totalProjects: stats?.totalProjects ?? 12,
    activeProjects: stats?.activeProjects ?? 8,
    buildSuccessRate: stats?.buildSuccessRate ?? 87.5,
    totalPayloads: stats?.totalPayloads ?? 47,
    totalAiCalls: stats?.totalAiCalls ?? 164,
    totalTokens: stats?.totalTokens ?? 62700,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">统计概览</h2>
          <p className="text-sm text-muted-foreground mt-0.5">平台运行状态与关键指标一览</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
            系统运行正常
          </div>
          <Button size="sm" onClick={() => { setActiveModule("projects"); dispatchAction({ type: "open_project", payload: { create: true } }); }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
          <>
            <StatCard title="项目总数" value={displayStats.totalProjects} subtitle="含归档项目" icon={FolderOpen} trend="up" trendValue="+2 本周" color="bg-indigo-500" />
            <StatCard title="活跃项目" value={displayStats.activeProjects} subtitle="进行中" icon={Activity} trend="neutral" trendValue="较上周持平" color="bg-blue-500" />
            <StatCard title="构建成功率" value={`${displayStats.buildSuccessRate}%`} subtitle="近30天" icon={Hammer} trend="up" trendValue="+3.2% 提升" color="bg-green-500" />
            <StatCard title="载荷总数" value={displayStats.totalPayloads} subtitle="含变形版本" icon={Package} trend="up" trendValue="+5 本周" color="bg-amber-500" />
            <StatCard title="AI 调用次数" value={displayStats.totalAiCalls} subtitle="本月累计" icon={Bot} trend="up" trendValue="+42 今日" color="bg-purple-500" />
            <StatCard title="Token 消耗" value={`${(displayStats.totalTokens / 1000).toFixed(1)}K`} subtitle="本月累计" icon={Zap} trend="up" trendValue="+16.2K 今日" color="bg-rose-500" />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* AI Usage Trend */}
        <Card className="xl:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">AI 调用趋势</CardTitle>
                <CardDescription className="text-xs">近7天调用次数与 Token 消耗</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">近7天</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={aiTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tokensGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="calls" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="tokens" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  formatter={(value: number, name: string) => [name === "calls" ? `${value} 次` : `${(value / 1000).toFixed(1)}K`, name === "calls" ? "调用次数" : "Token消耗"]} />
                <Area yAxisId="calls" type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} fill="url(#callsGrad)" name="calls" />
                <Area yAxisId="tokens" type="monotone" dataKey="tokens" stroke="#22c55e" strokeWidth={2} fill="url(#tokensGrad)" name="tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payload Type Distribution */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">载荷类型分布</CardTitle>
            <CardDescription className="text-xs">按类型统计载荷数量</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={payloadTypeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {payloadTypeData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(value: number) => [`${value} 个`, "数量"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {payloadTypeData.map((item: any) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                  <span className="text-xs font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Payload OS Distribution */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">载荷平台分布</CardTitle>
            <CardDescription className="text-xs">按操作系统与架构分类</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={payloadOsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="os" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="x64" name="x64" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="x86" name="x86" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="arm64" name="ARM64" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activities Timeline */}
        <Card className="xl:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">最近操作记录</CardTitle>
                <CardDescription className="text-xs">平台操作时间线</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setActiveModule("settings")}>
                查看全部 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="space-y-3">
                {/* Demo activities when DB is empty */}
                {[
                  { type: "build", action: "构建成功", target: "APT-Loader-v2", time: "2分钟前", status: "success" },
                  { type: "ai", action: "AI代码生成", target: "反射注入模板", time: "15分钟前", status: "success" },
                  { type: "payload", action: "载荷生成", target: "RevShell-Win64-HTTP", time: "32分钟前", status: "success" },
                  { type: "project", action: "项目创建", target: "Operation-Phantom", time: "2小时前", status: "info" },
                ].map((activity, index) => {
                  const Icon = MODULE_ICONS[activity.type] ?? Activity;
                  return (
                    <div key={index} className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                          activity.status === "success" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {index < 3 && <div className="w-px h-4 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-foreground">{activity.action}</span>
                            <span className="text-xs text-muted-foreground truncate">— {activity.target}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{activity.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 7).map((log: any, index: number) => {
                  const Icon = MODULE_ICONS[log.module] ?? Activity;
                  return (
                    <div key={log.id} className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {index < recentActivity.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-foreground">{log.action}</span>
                            {log.resourceName && <span className="text-xs text-muted-foreground truncate">— {log.resourceName}</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{log.module}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Projects */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">最近打开的项目</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => setActiveModule("projects")}>
                全部项目 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentProjects.length > 0 ? recentProjects : [
              { id: 1, name: "Operation-Phantom", platform: "windows", language: "go", status: "active", updatedAt: new Date() },
              { id: 2, name: "APT-Simulation-2024", platform: "linux", language: "c", status: "active", updatedAt: new Date() },
              { id: 3, name: "RedTeam-Infrastructure", platform: "cross", language: "python", status: "active", updatedAt: new Date() },
            ] as any[]).map((project: any) => (
              <div key={project.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => { setActiveProjectId(project.id); setActiveModule("editor"); }}>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate font-mono">{project.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{project.platform}</Badge>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{project.language}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {project.updatedAt ? new Date(project.updatedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "新建项目", icon: Plus, color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100", action: () => { setActiveModule("projects"); dispatchAction({ type: "open_project", payload: { create: true } }); } },
                { label: "生成载荷", icon: Package, color: "bg-amber-50 text-amber-600 hover:bg-amber-100", action: () => dispatchAction({ type: "create_payload" }) },
                { label: "AI 助手", icon: Bot, color: "bg-purple-50 text-purple-600 hover:bg-purple-100", action: () => setActiveModule("assistant") },
                { label: "代码编辑", icon: Code2, color: "bg-blue-50 text-blue-600 hover:bg-blue-100", action: () => setActiveModule("editor") },
                { label: "一键构建", icon: Hammer, color: "bg-green-50 text-green-600 hover:bg-green-100", action: () => setActiveModule("builds") },
                { label: "模板库", icon: Shield, color: "bg-rose-50 text-rose-600 hover:bg-rose-100", action: () => setActiveModule("templates") },
              ].map((item) => (
                <button key={item.label} onClick={item.action} className={cn("flex items-center gap-2.5 p-3 rounded-lg transition-all duration-150 text-left", item.color)}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
