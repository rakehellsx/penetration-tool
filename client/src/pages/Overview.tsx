import { useState } from "react";
import CountUp from "react-countup";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";
import {
  FolderOpen, Package, Hammer, Bot, TrendingUp, TrendingDown,
  Plus, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight,
  Zap, Shield, Activity, Code2, Target, Crosshair, Radio,
  GitBranch, Eye, Star, Flame, BarChart3, Users, Lock,
  ChevronRight, ExternalLink, RefreshCw, Cpu, Globe, Terminal
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Demo data ─────────────────────────────────────────────────────────────
const AI_TREND = [
  { date: "05-26", calls: 12, tokens: 4200, success: 11 },
  { date: "05-27", calls: 18, tokens: 6800, success: 17 },
  { date: "05-28", calls: 9, tokens: 3100, success: 8 },
  { date: "05-29", calls: 24, tokens: 9200, success: 23 },
  { date: "05-30", calls: 31, tokens: 12400, success: 29 },
  { date: "05-31", calls: 28, tokens: 10800, success: 26 },
  { date: "06-01", calls: 42, tokens: 16200, success: 40 },
];

const PAYLOAD_TYPE = [
  { name: "Shellcode", value: 38, color: "#6366f1" },
  { name: "EXE", value: 27, color: "#22c55e" },
  { name: "DLL", value: 19, color: "#f59e0b" },
  { name: "Script", value: 16, color: "#ef4444" },
];

const PAYLOAD_OS = [
  { os: "Windows", x64: 32, x86: 18, arm64: 5 },
  { os: "Linux", x64: 24, x86: 8, arm64: 12 },
  { os: "macOS", x64: 11, x86: 0, arm64: 9 },
];

const BUILD_HISTORY = [
  { day: "周一", success: 8, failed: 1 },
  { day: "周二", success: 12, failed: 2 },
  { day: "周三", success: 6, failed: 3 },
  { day: "周四", success: 15, failed: 1 },
  { day: "周五", success: 11, failed: 0 },
  { day: "周六", success: 4, failed: 1 },
  { day: "周日", success: 9, failed: 2 },
];

const EVASION_RATE = [{ name: "免杀率", value: 87, fill: "#6366f1" }];

const RECENT_ACTIVITIES = [
  { id: 1, type: "build", action: "构建成功", target: "APT-Loader-v2", module: "builds", time: "2分钟前", status: "success", detail: "Windows x64 · 156KB · 3/72 检出" },
  { id: 2, type: "ai", action: "AI 代码生成", target: "反射注入模板", module: "assistant", time: "15分钟前", status: "success", detail: "tokens: 2,840 · C语言" },
  { id: 3, type: "payload", action: "载荷生成", target: "RevShell-Win64-HTTP", module: "payloads", time: "32分钟前", status: "success", detail: "HTTP · AES-256 · 免杀率 96%" },
  { id: 4, type: "build", action: "构建失败", target: "Persistence-Module", module: "builds", time: "1小时前", status: "failed", detail: "编译错误：undefined reference" },
  { id: 5, type: "project", action: "项目创建", target: "Operation-Phantom", module: "projects", time: "2小时前", status: "info", detail: "Windows · Go语言" },
  { id: 6, type: "payload", action: "免杀评分", target: "Loader-v3", module: "payloads", time: "3小时前", status: "success", detail: "3/72 检出 · 评分 95.8%" },
];

const RECENT_PROJECTS = [
  { id: 1, name: "Operation-Phantom", platform: "windows", language: "go", status: "active", builds: 12, payloads: 5, updatedAt: "2分钟前" },
  { id: 2, name: "APT-Simulation-2024", platform: "linux", language: "c", status: "active", builds: 8, payloads: 3, updatedAt: "1小时前" },
  { id: 3, name: "RedTeam-Infrastructure", platform: "cross", language: "python", status: "active", builds: 4, payloads: 7, updatedAt: "3小时前" },
  { id: 4, name: "Evasion-Research", platform: "windows", language: "rust", status: "draft", builds: 2, payloads: 1, updatedAt: "昨天" },
];

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ title, value, suffix = "", subtitle, icon: Icon, iconBg, trend, trendValue, extra }: {
  title: string; value: number; suffix?: string; subtitle?: string;
  icon: React.ElementType; iconBg: string;
  trend?: "up" | "down" | "neutral"; trendValue?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className="stat-card card-hover border border-border overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg", iconBg)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trendValue && (
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
              trend === "up" ? "text-green-700 bg-green-50 border border-green-200" :
              trend === "down" ? "text-red-600 bg-red-50 border border-red-200" :
              "text-muted-foreground bg-muted"
            )}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
              {trendValue}
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground tabular-nums">
            <CountUp end={value} duration={1.5} separator="," />
          </span>
          {suffix && <span className="text-sm text-muted-foreground font-medium">{suffix}</span>}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {extra}
      </CardContent>
    </Card>
  );
}

// ─── Activity Icon ─────────────────────────────────────────────────────────
function ActivityDot({ type, status }: { type: string; status: string }) {
  const icons: Record<string, React.ElementType> = {
    build: Hammer, ai: Bot, payload: Package, project: FolderOpen, template: Code2
  };
  const Icon = icons[type] ?? Activity;
  const colors = {
    success: "bg-green-100 text-green-600 border-green-200",
    failed: "bg-red-100 text-red-500 border-red-200",
    info: "bg-blue-100 text-blue-600 border-blue-200",
  };
  return (
    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 border", colors[status as keyof typeof colors] ?? colors.info)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{typeof p.value === "number" && p.value > 1000 ? `${(p.value/1000).toFixed(1)}K` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Overview() {
  const { setActiveModule, setActiveProjectId, dispatchAction } = useApp();
  const { data: stats } = trpc.overview.stats.useQuery(undefined, { refetchInterval: 30000 });
  const { data: aiTrend = [] } = trpc.overview.aiTrend.useQuery();
  const { data: payloadStats } = trpc.overview.payloadStats.useQuery();
  const { data: recentActivity = [] } = trpc.overview.recentActivity.useQuery();
  const { data: recentProjects = [] } = trpc.overview.recentProjects.useQuery();

  const aiTrendData = aiTrend.length > 0 ? aiTrend : AI_TREND;
  const payloadTypeData = (payloadStats?.byType ?? []).length > 0 ? payloadStats!.byType : PAYLOAD_TYPE;
  const payloadOsData = (payloadStats?.byOs ?? []).length > 0 ? payloadStats!.byOs : PAYLOAD_OS;
  const activities = recentActivity.length > 0 ? recentActivity.map((l: any) => ({
    id: l.id, type: l.module, action: l.action, target: l.resourceName ?? "", module: l.module,
    time: new Date(l.createdAt).toLocaleTimeString(), status: "info", detail: ""
  })) : RECENT_ACTIVITIES;
  const projects = recentProjects.length > 0 ? recentProjects : RECENT_PROJECTS;

  const displayStats = {
    totalProjects: stats?.totalProjects ?? 12,
    activeProjects: stats?.activeProjects ?? 8,
    buildSuccessRate: stats?.buildSuccessRate ?? 87.5,
    totalPayloads: stats?.totalPayloads ?? 47,
    totalAiCalls: stats?.totalAiCalls ?? 164,
    totalTokens: stats?.totalTokens ?? 62700,
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] animate-fade-in">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-foreground">统计概览</h2>
            <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
              实时
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">平台运行状态、AI 使用趋势与关键指标一览</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <RefreshCw className="w-3.5 h-3.5" />
            刷新
          </Button>
          <Button size="sm" className="gap-1.5 h-8 bg-grad-primary border-0 shadow-md shadow-indigo-900/20"
            onClick={() => { setActiveModule("projects"); dispatchAction({ type: "open_project", payload: { create: true } }); }}>
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </Button>
        </div>
      </div>

      {/* ─── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 stagger-children">
        <StatCard title="项目总数" value={displayStats.totalProjects} subtitle="含归档项目"
          icon={FolderOpen} iconBg="bg-grad-primary" trend="up" trendValue="+2 本周" />
        <StatCard title="活跃项目" value={displayStats.activeProjects} subtitle="进行中"
          icon={Activity} iconBg="bg-gradient-to-br from-blue-500 to-blue-600" trend="neutral" trendValue="持平" />
        <StatCard title="构建成功率" value={displayStats.buildSuccessRate} suffix="%" subtitle="近30天"
          icon={Hammer} iconBg="bg-grad-success" trend="up" trendValue="+3.2%"
          extra={<Progress value={displayStats.buildSuccessRate} className="h-1 mt-2 progress-animated" />}
        />
        <StatCard title="载荷总数" value={displayStats.totalPayloads} subtitle="含变形版本"
          icon={Package} iconBg="bg-grad-amber" trend="up" trendValue="+5 本周" />
        <StatCard title="AI 调用" value={displayStats.totalAiCalls} subtitle="本月累计"
          icon={Bot} iconBg="bg-grad-purple" trend="up" trendValue="+42 今日" />
        <StatCard title="Token 消耗" value={Math.round(displayStats.totalTokens / 1000)} suffix="K" subtitle="本月累计"
          icon={Zap} iconBg="bg-grad-rose" trend="up" trendValue="+16.2K" />
      </div>

      {/* ─── Charts Row 1 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* AI Trend */}
        <Card className="xl:col-span-2 border border-border card-hover">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                AI 调用趋势
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">近7天调用次数与 Token 消耗对比</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />调用
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />Token
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={aiTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="calls" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="tokens" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="calls" type="monotone" dataKey="calls" name="调用次数" stroke="#6366f1" strokeWidth={2.5} fill="url(#gCalls)" dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
                <Area yAxisId="tokens" type="monotone" dataKey="tokens" name="Token消耗" stroke="#22c55e" strokeWidth={2.5} fill="url(#gTokens)" dot={false} activeDot={{ r: 4, fill: "#22c55e" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payload Pie + Evasion Rate */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              载荷分布
            </CardTitle>
            <CardDescription className="text-xs">类型分布与平均免杀率</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="relative">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={payloadTypeData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {payloadTypeData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-foreground">{payloadTypeData.reduce((s: number, d: any) => s + d.value, 0)}</span>
                <span className="text-[10px] text-muted-foreground">总载荷</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {payloadTypeData.map((item: any) => (
                <div key={item.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-[11px] font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
            {/* Evasion rate */}
            <div className="mt-3 p-2.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-green-800 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> 平均免杀率
                </span>
                <span className="text-sm font-bold text-green-700">87.3%</span>
              </div>
              <Progress value={87.3} className="h-1.5 progress-animated [&>[data-slot=progress-indicator]]:bg-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Charts Row 2 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Build history */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Hammer className="w-4 h-4 text-green-500" />
              本周构建统计
            </CardTitle>
            <CardDescription className="text-xs">成功 vs 失败对比</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BUILD_HISTORY} margin={{ top: 5, right: 5, left: -25, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="success" name="成功" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={16} />
                <Bar dataKey="failed" name="失败" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>65 次成功</span>
              </div>
              <div className="flex items-center gap-1 text-red-500">
                <XCircle className="w-3.5 h-3.5" />
                <span>10 次失败</span>
              </div>
              <div className="font-semibold text-foreground">成功率 86.7%</div>
            </div>
          </CardContent>
        </Card>

        {/* Payload OS */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              平台架构分布
            </CardTitle>
            <CardDescription className="text-xs">按OS与CPU架构分类</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={payloadOsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="os" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="x64" name="x64" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="x86" name="x86" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="arm64" name="ARM64" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                操作时间线
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-muted-foreground" onClick={() => setActiveModule("settings")}>
                全部 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2.5">
              {activities.slice(0, 5).map((a: any, i: number) => (
                <div key={a.id ?? i} className="flex items-start gap-2.5 group">
                  <div className="flex flex-col items-center">
                    <ActivityDot type={a.type} status={a.status} />
                    {i < 4 && <div className="w-px h-3 bg-border mt-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-foreground truncate">{a.action}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{a.target}</p>
                    {a.detail && <p className="text-[10px] text-muted-foreground/70 truncate">{a.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Projects */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-500" />
                最近项目
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-muted-foreground" onClick={() => setActiveModule("projects")}>
                全部 <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {(projects as any[]).map((p: any) => {
              const PLAT_COLOR: Record<string, string> = { windows: "bg-blue-100 text-blue-700", linux: "bg-orange-100 text-orange-700", macos: "bg-gray-100 text-gray-700", cross: "bg-purple-100 text-purple-700" };
              const LANG_COLOR: Record<string, string> = { go: "bg-cyan-100 text-cyan-700", c: "bg-gray-100 text-gray-700", cpp: "bg-blue-100 text-blue-700", python: "bg-yellow-100 text-yellow-700", rust: "bg-orange-100 text-orange-700" };
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 cursor-pointer transition-all duration-150 group border border-transparent hover:border-border"
                  onClick={() => { setActiveProjectId(p.id); setActiveModule("editor"); }}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/60 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate font-mono">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PLAT_COLOR[p.platform ?? "cross"])}>{p.platform}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-mono", LANG_COLOR[p.language ?? "go"])}>{p.language}</span>
                      {p.builds !== undefined && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Hammer className="w-2.5 h-2.5" />{p.builds}</span>}
                      {p.payloads !== undefined && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Package className="w-2.5 h-2.5" />{p.payloads}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">{typeof p.updatedAt === "string" ? p.updatedAt : new Date(p.updatedAt).toLocaleString()}</p>
                    <div className={cn("text-[10px] mt-0.5 font-medium", p.status === "active" ? "text-green-600" : "text-muted-foreground")}>
                      {p.status === "active" ? "● 活跃" : "○ 草稿"}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-border card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              快捷操作
            </CardTitle>
            <CardDescription className="text-xs">常用功能一键直达</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "新建项目", icon: Plus, grad: "from-indigo-500 to-indigo-600", action: () => { setActiveModule("projects"); dispatchAction({ type: "open_project", payload: { create: true } }); } },
                { label: "生成载荷", icon: Package, grad: "from-amber-500 to-amber-600", action: () => dispatchAction({ type: "create_payload" }) },
                { label: "AI 助手", icon: Bot, grad: "from-purple-500 to-purple-600", action: () => setActiveModule("assistant") },
                { label: "代码编辑", icon: Code2, grad: "from-blue-500 to-blue-600", action: () => setActiveModule("editor") },
                { label: "一键构建", icon: Hammer, grad: "from-green-500 to-green-600", action: () => setActiveModule("builds") },
                { label: "模板库", icon: FileCode, grad: "from-emerald-500 to-emerald-600", action: () => setActiveModule("templates") },
                { label: "载荷管理", icon: Shield, grad: "from-rose-500 to-rose-600", action: () => setActiveModule("payloads") },
                { label: "构建历史", icon: BarChart3, grad: "from-cyan-500 to-cyan-600", action: () => setActiveModule("builds") },
                { label: "系统设置", icon: Settings, grad: "from-slate-500 to-slate-600", action: () => setActiveModule("settings") },
              ].map((item) => (
                <button key={item.label} onClick={item.action}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 group">
                  <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow", item.grad)}>
                    <item.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Missing import
function Settings(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function FileCode(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/></svg>;
}
