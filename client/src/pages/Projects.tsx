import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FolderOpen, Archive, Trash2, Copy, ExternalLink,
  Package, FileCode, Hammer, Users, Tag, Filter, MoreHorizontal,
  Shield, Globe, Terminal, Code2, ChevronRight, Download, Upload
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  windows: Shield,
  linux: Terminal,
  macos: Globe,
  cross: Code2,
};

const PLATFORM_COLORS: Record<string, string> = {
  windows: "bg-blue-100 text-blue-700",
  linux: "bg-orange-100 text-orange-700",
  macos: "bg-gray-100 text-gray-700",
  cross: "bg-purple-100 text-purple-700",
};

const LANG_COLORS: Record<string, string> = {
  go: "bg-cyan-100 text-cyan-700",
  c: "bg-gray-100 text-gray-700",
  cpp: "bg-blue-100 text-blue-700",
  python: "bg-yellow-100 text-yellow-700",
  rust: "bg-orange-100 text-orange-700",
  powershell: "bg-indigo-100 text-indigo-700",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
  draft: "bg-yellow-100 text-yellow-700",
};

function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", description: "", platform: "windows", language: "go", tags: ""
  });
  const utils = trpc.useUtils();
  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("项目创建成功");
      onClose();
      setForm({ name: "", description: "", platform: "windows", language: "go", tags: "" });
    },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            新建项目
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">项目名称 *</Label>
            <Input
              placeholder="e.g. Operation-Phantom"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">目标平台</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="windows">Windows</SelectItem>
                  <SelectItem value="linux">Linux</SelectItem>
                  <SelectItem value="macos">macOS</SelectItem>
                  <SelectItem value="cross">跨平台</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">编程语言</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="powershell">PowerShell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">项目描述</Label>
            <Textarea
              placeholder="描述项目目标、范围和技术要点..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="text-sm resize-none"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">标签（逗号分隔）</Label>
            <Input
              placeholder="e.g. apt, evasion, windows"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">取消</Button>
          <Button
            size="sm"
            disabled={!form.name || createMutation.isPending}
            onClick={() => createMutation.mutate({
              name: form.name,
              description: form.description || undefined,
              platform: form.platform,
              language: form.language,
              tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            })}
          >
            {createMutation.isPending ? "创建中..." : "创建项目"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectCard({ project, onOpen }: { project: any; onOpen: (id: number) => void }) {
  const utils = trpc.useUtils();
  const archiveMutation = trpc.projects.archive.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); toast.success("项目已归档"); }
  });
  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); toast.success("项目已删除"); }
  });
  const cloneMutation = trpc.projects.clone.useMutation({
    onSuccess: () => { utils.projects.list.invalidate(); toast.success("项目已克隆"); }
  });

  const { setActiveModule, dispatchAction } = useApp();
  const PlatformIcon = PLATFORM_ICONS[project.platform ?? "cross"] ?? Shield;

  return (
    <Card className={cn(
      "border border-border hover:shadow-md transition-all duration-200 cursor-pointer group",
      project.status === "archived" && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PlatformIcon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate font-mono">{project.name}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description ?? "无描述"}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem onClick={() => onOpen(project.id)}>
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> 打开编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setActiveModule("builds");
                dispatchAction({ type: "trigger_build", payload: { projectId: project.id } });
              }}>
                <Hammer className="w-3.5 h-3.5 mr-2" /> 一键构建
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => cloneMutation.mutate({ id: project.id, newName: `${project.name}-copy` })}>
                <Copy className="w-3.5 h-3.5 mr-2" /> 克隆项目
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("ZIP 导出功能即将上线")}>
                <Download className="w-3.5 h-3.5 mr-2" /> 导出 ZIP
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {project.status !== "archived" && (
                <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: project.id })}>
                  <Archive className="w-3.5 h-3.5 mr-2" /> 归档
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteMutation.mutate({ id: project.id })}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={cn("text-[10px] h-4 px-1.5 font-normal", PLATFORM_COLORS[project.platform ?? "cross"])}>
            {project.platform ?? "cross"}
          </Badge>
          <Badge className={cn("text-[10px] h-4 px-1.5 font-mono font-normal", LANG_COLORS[project.language ?? "go"])}>
            {project.language ?? "go"}
          </Badge>
          <Badge className={cn("text-[10px] h-4 px-1.5 font-normal", STATUS_COLORS[project.status])}>
            {project.status === "active" ? "活跃" : project.status === "archived" ? "已归档" : "草稿"}
          </Badge>
          {(project.tags ?? []).slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">{tag}</Badge>
          ))}
        </div>

        {/* Linked resources */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2.5">
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {(project.linkedPayloadIds ?? []).length} 载荷
          </span>
          <span className="flex items-center gap-1">
            <FileCode className="w-3 h-3" />
            {(project.linkedTemplateIds ?? []).length} 模板
          </span>
          <button
            onClick={() => onOpen(project.id)}
            className="ml-auto flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            打开 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterLang, setFilterLang] = useState<string>("all");

  const { setActiveModule, setActiveProjectId, pendingAction, clearAction } = useApp();

  // Auto-open create dialog if triggered from overview
  if (pendingAction?.type === "open_project" && pendingAction.payload?.create) {
    clearAction();
    setTimeout(() => setShowCreate(true), 100);
  }

  const { data: projects = [], isLoading } = trpc.projects.list.useQuery({
    search: search || undefined,
    status: filterStatus !== "all" ? filterStatus as any : undefined,
    platform: filterPlatform !== "all" ? filterPlatform : undefined,
    language: filterLang !== "all" ? filterLang : undefined,
  });

  const handleOpenProject = (id: number) => {
    setActiveProjectId(id);
    setActiveModule("editor");
  };

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">项目管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理渗透测试项目，关联载荷与模板</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toast.info("ZIP 导入功能即将上线")}>
            <Upload className="w-3.5 h-3.5" />
            导入 ZIP
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />
            新建项目
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索项目名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <Filter className="w-3 h-3 mr-1.5" />
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="windows">Windows</SelectItem>
            <SelectItem value="linux">Linux</SelectItem>
            <SelectItem value="macos">macOS</SelectItem>
            <SelectItem value="cross">跨平台</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue placeholder="语言" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部语言</SelectItem>
            <SelectItem value="go">Go</SelectItem>
            <SelectItem value="c">C</SelectItem>
            <SelectItem value="cpp">C++</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="rust">Rust</SelectItem>
            <SelectItem value="powershell">PowerShell</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          共 {projects.length} 个项目
        </span>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg shimmer" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">暂无项目</p>
          <p className="text-xs text-muted-foreground mt-1">点击「新建项目」开始第一个渗透测试项目</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> 新建项目
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <ProjectCard key={project.id} project={project} onOpen={handleOpenProject} />
          ))}
        </div>
      )}

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
