import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FolderOpen, Archive, Trash2, Copy, ExternalLink,
  Package, FileCode, Hammer, Users, Tag, MoreHorizontal,
  Shield, Globe, Terminal, Code2, ChevronRight, Download, Upload,
  Star, Clock, Activity, Zap, Layers, LayoutGrid, List,
  CheckCircle2, Circle, X, UserPlus, Lock, Eye, Edit3,
  Crown, Settings, GitBranch, Hash
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  name: string;
  email: string;
  avatar: string;
  permission: "readonly" | "editor" | "admin";
}

const PERMISSION_CONFIG = {
  readonly: { label: "只读", icon: Eye, color: "text-gray-600 bg-gray-50 border-gray-200", desc: "仅可查看项目内容" },
  editor: { label: "编辑", icon: Edit3, color: "text-blue-600 bg-blue-50 border-blue-200", desc: "可编辑代码和文件" },
  admin: { label: "管理员", icon: Crown, color: "text-amber-600 bg-amber-50 border-amber-200", desc: "完全控制权限" },
};

// Demo users
const DEMO_USERS = [
  { id: "u1", name: "Alice Chen", email: "alice@redteam.io", avatar: "A" },
  { id: "u2", name: "Bob Wang", email: "bob@redteam.io", avatar: "B" },
  { id: "u3", name: "Carol Liu", email: "carol@redteam.io", avatar: "C" },
  { id: "u4", name: "Dave Zhang", email: "dave@redteam.io", avatar: "D" },
  { id: "u5", name: "Eve Li", email: "eve@redteam.io", avatar: "E" },
];

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  windows: { icon: Shield, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "Windows" },
  linux: { icon: Terminal, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", label: "Linux" },
  macos: { icon: Globe, color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", label: "macOS" },
  cross: { icon: Layers, color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", label: "跨平台" },
};

const LANG_CONFIG: Record<string, { color: string; bg: string }> = {
  go: { color: "text-cyan-700", bg: "bg-cyan-50 border-cyan-200" },
  c: { color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
  cpp: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  python: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  rust: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  powershell: { color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  active: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle2, label: "活跃" },
  archived: { color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", icon: Archive, label: "已归档" },
  draft: { color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: Circle, label: "草稿" },
};

const DEMO_PROJECTS = [
  { id: 101, name: "Operation-Phantom", platform: "windows", language: "go", status: "active", description: "针对 Windows 企业环境的高级持续性威胁模拟", tags: ["apt", "evasion"], builds: 12, payloads: 5, templates: 3, buildSuccessRate: 91.7, lastBuild: "2分钟前", members: [{ ...DEMO_USERS[0], permission: "admin" as const }, { ...DEMO_USERS[1], permission: "editor" as const }, { ...DEMO_USERS[2], permission: "readonly" as const }], updatedAt: new Date().toISOString(), starred: true },
  { id: 102, name: "APT-Simulation-2024", platform: "linux", language: "c", status: "active", description: "Linux 服务器渗透测试，专注于提权与信息收集", tags: ["linux", "privesc"], builds: 8, payloads: 3, templates: 2, buildSuccessRate: 75.0, lastBuild: "1小时前", members: [{ ...DEMO_USERS[3], permission: "admin" as const }, { ...DEMO_USERS[4], permission: "editor" as const }], updatedAt: new Date().toISOString(), starred: false },
  { id: 103, name: "RedTeam-Infrastructure", platform: "cross", language: "python", status: "active", description: "跨平台红队基础设施搭建工具", tags: ["c2", "infrastructure"], builds: 4, payloads: 7, templates: 5, buildSuccessRate: 100, lastBuild: "3小时前", members: [{ ...DEMO_USERS[0], permission: "admin" as const }, { ...DEMO_USERS[2], permission: "editor" as const }, { ...DEMO_USERS[3], permission: "editor" as const }, { ...DEMO_USERS[4], permission: "readonly" as const }], updatedAt: new Date().toISOString(), starred: true },
  { id: 104, name: "Evasion-Research", platform: "windows", language: "rust", status: "draft", description: "Rust 语言实现的免杀技术研究项目", tags: ["evasion", "rust"], builds: 2, payloads: 1, templates: 1, buildSuccessRate: 50.0, lastBuild: "昨天", members: [{ ...DEMO_USERS[1], permission: "admin" as const }], updatedAt: new Date().toISOString(), starred: false },
  { id: 105, name: "WebShell-Collection", platform: "cross", language: "python", status: "active", description: "多语言 WebShell 管理与免杀处理工具集", tags: ["webshell", "php"], builds: 6, payloads: 12, templates: 4, buildSuccessRate: 83.3, lastBuild: "5小时前", members: [{ ...DEMO_USERS[2], permission: "admin" as const }, { ...DEMO_USERS[3], permission: "editor" as const }], updatedAt: new Date().toISOString(), starred: false },
  { id: 106, name: "Privilege-Escalation-Kit", platform: "linux", language: "c", status: "active", description: "Linux 提权漏洞利用工具集", tags: ["privesc", "kernel"], builds: 9, payloads: 4, templates: 6, buildSuccessRate: 88.9, lastBuild: "2天前", members: [{ ...DEMO_USERS[4], permission: "admin" as const }, { ...DEMO_USERS[0], permission: "editor" as const }], updatedAt: new Date().toISOString(), starred: false },
];

// ─── Member Permission Row ─────────────────────────────────────────────────
function MemberRow({ member, onPermissionChange, onRemove, isOwner = false }: {
  member: Member; onPermissionChange: (id: string, perm: Member["permission"]) => void;
  onRemove: (id: string) => void; isOwner?: boolean;
}) {
  const permConf = PERMISSION_CONFIG[member.permission];
  const PermIcon = permConf.icon;
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:bg-muted/30 transition-colors">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="text-xs bg-grad-primary text-white font-bold">{member.avatar}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{member.name}</p>
          {isOwner && <Badge className="text-[9px] h-3.5 px-1 bg-amber-100 text-amber-700 border-amber-200">创建者</Badge>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <Select value={member.permission} onValueChange={(v) => onPermissionChange(member.id, v as Member["permission"])} disabled={isOwner}>
        <SelectTrigger className={cn("w-24 h-7 text-xs border", permConf.color)}>
          <div className="flex items-center gap-1">
            <PermIcon className="w-3 h-3" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PERMISSION_CONFIG).map(([key, conf]) => {
            const Icon = conf.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <div>
                    <p className="text-xs font-medium">{conf.label}</p>
                    <p className="text-[10px] text-muted-foreground">{conf.desc}</p>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {!isOwner && (
        <button onClick={() => onRemove(member.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Create Project Dialog ─────────────────────────────────────────────────
function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [form, setForm] = useState({ name: "", description: "", platform: "windows", language: "go", tags: "" });
  const [members, setMembers] = useState<Member[]>([]);
  const [searchUser, setSearchUser] = useState("");
  const utils = trpc.useUtils();

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: async (data) => {
      utils.projects.list.invalidate();
      toast.success(`项目「${form.name}」创建成功 🎉`);
      onClose();
      setForm({ name: "", description: "", platform: "windows", language: "go", tags: "" });
      setMembers([]);
      setActiveTab("basic");
    },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });

  const addMember = (user: typeof DEMO_USERS[0]) => {
    if (members.find(m => m.id === user.id)) { toast.warning("该成员已添加"); return; }
    setMembers(prev => [...prev, { ...user, permission: "editor" }]);
    setSearchUser("");
  };

  const updatePermission = (id: string, perm: Member["permission"]) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, permission: perm } : m));
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const filteredUsers = DEMO_USERS.filter(u =>
    !members.find(m => m.id === u.id) &&
    (u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()))
  );

  const handleCreate = () => {
    if (!form.name) { toast.warning("请填写项目名称"); setActiveTab("basic"); return; }
    createMutation.mutate({
      name: form.name,
      description: form.description || undefined,
      platform: form.platform,
      language: form.language,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-grad-primary flex items-center justify-center">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
            新建渗透测试项目
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="basic" className="flex-1 text-xs gap-1.5">
              <Settings className="w-3.5 h-3.5" /> 基本信息
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" /> 成员权限
              {members.length > 0 && <Badge className="text-[9px] h-4 px-1 bg-primary text-white">{members.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">项目名称 *</Label>
              <Input
                placeholder="e.g. Operation-Phantom"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">目标平台</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2"><v.icon className="w-3.5 h-3.5" />{v.label}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">编程语言</Label>
                <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["go", "c", "cpp", "python", "rust", "powershell"].map(l => (
                      <SelectItem key={l} value={l}><span className="font-mono">{l}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">项目描述</Label>
              <Textarea
                placeholder="描述项目目标、范围和技术要点..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="resize-none text-sm"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">标签 <span className="text-muted-foreground font-normal">（逗号分隔）</span></Label>
              <Input
                placeholder="apt, evasion, windows"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setActiveTab("members")}>
                下一步：成员权限 <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold">项目创建者（你）</span>
                <Badge className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-200 ml-auto">管理员</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">创建者拥有完全控制权限，无法修改</p>
            </div>

            {/* Search & Add */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">添加成员</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="搜索成员姓名或邮箱..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {searchUser && filteredUsers.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                  {filteredUsers.slice(0, 4).map(user => (
                    <button
                      key={user.id}
                      onClick={() => addMember(user)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0"
                    >
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-xs bg-grad-primary text-white font-bold">{user.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <UserPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Member list */}
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl">
                <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">暂未添加成员</p>
                <p className="text-xs text-muted-foreground mt-1">搜索并添加团队成员，设置访问权限</p>
              </div>
            ) : (
              <ScrollArea className="max-h-52">
                <div className="space-y-2">
                  {members.map(member => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      onPermissionChange={updatePermission}
                      onRemove={removeMember}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Permission legend */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(PERMISSION_CONFIG).map(([key, conf]) => {
                const Icon = conf.icon;
                return (
                  <div key={key} className={cn("flex items-center gap-1.5 p-2 rounded-lg border text-xs", conf.color)}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{conf.label}</p>
                      <p className="text-[10px] opacity-80">{conf.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button
            size="sm"
            disabled={!form.name || createMutation.isPending}
            className="bg-grad-primary border-0"
            onClick={handleCreate}
          >
            {createMutation.isPending ? "创建中..." : `创建项目${members.length > 0 ? `（${members.length + 1} 人）` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project Members Dialog ────────────────────────────────────────────────
function ProjectMembersDialog({ project, open, onClose }: { project: any; open: boolean; onClose: () => void }) {
  const [members, setMembers] = useState<Member[]>(project.members ?? []);
  const [searchUser, setSearchUser] = useState("");

  const filteredUsers = DEMO_USERS.filter(u =>
    !members.find((m: Member) => m.id === u.id) &&
    (u.name.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-primary" />
            成员权限管理 — {project.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="搜索成员..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
          {searchUser && filteredUsers.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              {filteredUsers.slice(0, 3).map(user => (
                <button key={user.id} onClick={() => { setMembers(prev => [...prev, { ...user, permission: "editor" }]); setSearchUser(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left border-b border-border last:border-0">
                  <Avatar className="w-7 h-7 shrink-0"><AvatarFallback className="text-xs bg-grad-primary text-white font-bold">{user.avatar}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                  <UserPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {members.map((member: Member, i: number) => (
                <MemberRow key={member.id} member={member} onPermissionChange={(id, perm) => setMembers(prev => prev.map(m => m.id === id ? { ...m, permission: perm } : m))} onRemove={(id) => setMembers(prev => prev.filter(m => m.id !== id))} isOwner={i === 0} />
              ))}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" className="bg-grad-primary border-0" onClick={() => { toast.success("成员权限已更新"); onClose(); }}>保存更改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────
function ProjectCard({ project, onOpen }: { project: any; onOpen: (id: number) => void }) {
  const [starred, setStarred] = useState(project.starred ?? false);
  const [showMembers, setShowMembers] = useState(false);
  const utils = trpc.useUtils();
  const archiveMutation = trpc.projects.archive.useMutation({ onSuccess: () => { utils.projects.list.invalidate(); toast.success("已归档"); } });
  const deleteMutation = trpc.projects.delete.useMutation({ onSuccess: () => { utils.projects.list.invalidate(); toast.success("已删除"); } });
  const cloneMutation = trpc.projects.clone.useMutation({ onSuccess: () => { utils.projects.list.invalidate(); toast.success("克隆成功"); } });
  const { setActiveModule, dispatchAction } = useApp();

  const platConf = PLATFORM_CONFIG[project.platform ?? "cross"];
  const langConf = LANG_CONFIG[project.language ?? "go"];
  const statConf = STATUS_CONFIG[project.status ?? "active"];
  const PlatIcon = platConf?.icon ?? Shield;
  const StatIcon = statConf?.icon ?? Circle;
  const successRate = project.buildSuccessRate ?? 0;
  const members: Member[] = project.members ?? [];

  return (
    <>
      <Card className={cn("border card-hover card-glow-primary overflow-hidden group", project.status === "archived" && "opacity-60")}>
        <div className={cn("h-0.5 w-full", project.status === "active" ? "bg-grad-primary" : "bg-muted")} />
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", platConf?.bg, platConf?.border)}>
              <PlatIcon className={cn("w-5 h-5", platConf?.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="text-sm font-bold text-foreground truncate font-mono">{project.name}</h3>
                {starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{project.description ?? "无描述"}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs text-muted-foreground">项目操作</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onOpen(project.id)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2 text-blue-500" /> 打开编辑器
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setActiveModule("builds"); dispatchAction({ type: "trigger_build", payload: { projectId: project.id } }); }}>
                  <Hammer className="w-3.5 h-3.5 mr-2 text-green-500" /> 一键构建
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMembers(true)}>
                  <Users className="w-3.5 h-3.5 mr-2 text-purple-500" /> 成员权限
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStarred(!starred)}>
                  <Star className="w-3.5 h-3.5 mr-2 text-amber-400" /> {starred ? "取消收藏" : "收藏"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => cloneMutation.mutate({ id: project.id, newName: `${project.name}-copy` })}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> 克隆
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("ZIP 导出即将上线")}>
                  <Download className="w-3.5 h-3.5 mr-2" /> 导出 ZIP
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {project.status !== "archived" && (
                  <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: project.id })}>
                    <Archive className="w-3.5 h-3.5 mr-2" /> 归档
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate({ id: project.id })}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border", platConf?.bg, platConf?.border, platConf?.color)}>{platConf?.label}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono border", langConf?.bg, langConf?.color)}>{project.language}</span>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1", statConf?.bg, statConf?.border, statConf?.color)}>
              <StatIcon className="w-2.5 h-2.5" />{statConf?.label}
            </span>
            {(project.tags ?? []).slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">#{tag}</span>
            ))}
          </div>

          {/* Build rate */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Hammer className="w-3 h-3" />构建成功率</span>
              <span className={cn("text-[11px] font-bold", successRate >= 80 ? "text-green-600" : successRate >= 60 ? "text-yellow-600" : "text-red-500")}>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className={cn("h-1.5 progress-animated", successRate >= 80 ? "[&>[data-slot=progress-indicator]]:bg-green-500" : successRate >= 60 ? "[&>[data-slot=progress-indicator]]:bg-yellow-500" : "[&>[data-slot=progress-indicator]]:bg-red-500")} />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
            <span className="flex items-center gap-1"><Hammer className="w-3 h-3 text-green-500" /><span className="font-medium text-foreground">{project.builds ?? 0}</span></span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3 text-amber-500" /><span className="font-medium text-foreground">{project.payloads ?? 0}</span></span>
            <span className="flex items-center gap-1"><FileCode className="w-3 h-3 text-blue-500" /><span className="font-medium text-foreground">{project.templates ?? 0}</span></span>
          </div>

          {/* Footer: Members + Open */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 group/members hover:opacity-80 transition-opacity"
              title="管理成员权限"
            >
              <div className="flex -space-x-1.5">
                {members.slice(0, 4).map((m: Member, i: number) => {
                  const permConf = PERMISSION_CONFIG[m.permission];
                  return (
                    <div key={m.id} className="relative">
                      <Avatar className="w-6 h-6 ring-1.5 ring-white">
                        <AvatarFallback className="text-[9px] bg-grad-primary text-white font-bold">{m.avatar}</AvatarFallback>
                      </Avatar>
                      <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center",
                        m.permission === "admin" ? "bg-amber-400" : m.permission === "editor" ? "bg-blue-400" : "bg-gray-400"
                      )}>
                        {m.permission === "admin" ? <Crown className="w-1.5 h-1.5 text-white" /> : m.permission === "editor" ? <Edit3 className="w-1.5 h-1.5 text-white" /> : <Eye className="w-1.5 h-1.5 text-white" />}
                      </div>
                    </div>
                  );
                })}
                {members.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[8px] text-muted-foreground font-medium ring-1 ring-white">+{members.length - 4}</div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground group-hover/members:text-primary transition-colors">{members.length} 成员</span>
            </button>
            <button onClick={() => onOpen(project.id)} className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors">
              打开 <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </CardContent>
      </Card>

      {showMembers && (
        <ProjectMembersDialog project={project} open={showMembers} onClose={() => setShowMembers(false)} />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterLang, setFilterLang] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { setActiveModule, setActiveProjectId, pendingAction, clearAction } = useApp();

  if (pendingAction?.type === "open_project" && pendingAction.payload?.create) {
    clearAction();
    setTimeout(() => setShowCreate(true), 100);
  }

  const { data: dbProjects = [], isLoading } = trpc.projects.list.useQuery({
    search: search || undefined,
    status: filterStatus !== "all" ? filterStatus as any : undefined,
    platform: filterPlatform !== "all" ? filterPlatform : undefined,
    language: filterLang !== "all" ? filterLang : undefined,
  });

  const allProjects = dbProjects.length > 0 ? dbProjects.map((p: any) => ({ ...p, members: [], builds: 0, payloads: 0, templates: 0, buildSuccessRate: 0, starred: false })) : DEMO_PROJECTS;

  const handleOpenProject = (id: number) => {
    setActiveProjectId(id);
    setActiveModule("editor");
  };

  const stats = {
    total: allProjects.length,
    active: allProjects.filter((p: any) => p.status === "active").length,
    draft: allProjects.filter((p: any) => p.status === "draft").length,
    archived: allProjects.filter((p: any) => p.status === "archived").length,
  };

  return (
    <div className="p-6 space-y-5 max-w-[1600px] animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">项目管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">管理渗透测试项目，配置成员权限，关联载荷与模板</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => toast.info("ZIP 导入即将上线")}>
            <Upload className="w-3.5 h-3.5" /> 导入
          </Button>
          <Button size="sm" className="gap-1.5 h-8 bg-grad-primary border-0 shadow-md shadow-indigo-900/20" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> 新建项目
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 stagger-children">
        {[
          { label: "全部项目", value: stats.total, icon: FolderOpen, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
          { label: "活跃中", value: stats.active, icon: Activity, color: "text-green-600 bg-green-50 border-green-200" },
          { label: "草稿", value: stats.draft, icon: Circle, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
          { label: "已归档", value: stats.archived, icon: Archive, color: "text-gray-500 bg-gray-50 border-gray-200" },
        ].map(s => (
          <div key={s.label} className={cn("flex items-center gap-3 p-3 rounded-xl border card-hover", s.color)}>
            <s.icon className="w-5 h-5 shrink-0" />
            <div><p className="text-xl font-bold leading-none">{s.value}</p><p className="text-xs opacity-80 mt-0.5">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="搜索项目..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="平台" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            {Object.entries(PLATFORM_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLang} onValueChange={setFilterLang}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="语言" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部语言</SelectItem>
            {["go", "c", "cpp", "python", "rust", "powershell"].map(l => <SelectItem key={l} value={l}><span className="font-mono">{l}</span></SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{allProjects.length} 个项目</span>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={cn("p-1.5 transition-colors", viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}><LayoutGrid className="w-3.5 h-3.5" /></button>
            <button onClick={() => setViewMode("list")} className={cn("p-1.5 transition-colors", viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted")}><List className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 rounded-xl shimmer" />)}
        </div>
      ) : allProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4"><FolderOpen className="w-8 h-8 text-muted-foreground/40" /></div>
          <p className="text-base font-semibold text-muted-foreground">暂无项目</p>
          <Button size="sm" className="mt-5 gap-1.5 bg-grad-primary border-0" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5" /> 新建项目</Button>
        </div>
      ) : (
        <div className={cn("stagger-children", viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3")}>
          {allProjects.map((project: any) => (
            <ProjectCard key={project.id} project={project} onOpen={handleOpenProject} />
          ))}
        </div>
      )}

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
