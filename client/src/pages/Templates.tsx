import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FileCode, Shield, Trash2, Edit, Tag, Filter,
  ChevronRight, Download, Upload, BookOpen, Code2, Layers,
  Copy, ExternalLink, MoreHorizontal, RefreshCw, Zap, Bot, Eye,
  Target, Grid3x3, List, Star, GitBranch, Lock, Activity,
  CheckCircle2, AlertTriangle, X, Hash, Cpu
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Editor from "@monaco-editor/react";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";
import { MitreMatrix, ATTACK_TACTICS } from "@/components/MitreMatrix";

const CATEGORY_INFO: Record<string, { label: string; color: string; bg: string; border: string; icon: string; grad: string }> = {
  injection: { label: "注入", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: "💉", grad: "from-red-500 to-red-600" },
  privilege_escalation: { label: "提权", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: "⬆️", grad: "from-orange-500 to-orange-600" },
  lateral_movement: { label: "横向移动", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", icon: "↔️", grad: "from-purple-500 to-purple-600" },
  persistence: { label: "持久化", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: "🔒", grad: "from-blue-500 to-blue-600" },
  recon: { label: "信息收集", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: "🔍", grad: "from-green-500 to-green-600" },
  evasion: { label: "免杀绕过", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: "🛡️", grad: "from-yellow-500 to-yellow-600" },
  other: { label: "其他", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", icon: "📦", grad: "from-gray-500 to-gray-600" },
};

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

function TemplateDetailDialog({ template, open, onClose, onInsert }: {
  template: any; open: boolean; onClose: () => void; onInsert?: (code: string) => void
}) {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const resolveTemplate = () => {
    let code = template.codeTemplate ?? "";
    (template.parameters ?? []).forEach((p: any) => {
      code = code.replace(new RegExp(`{{${p.name}}}`, "g"), paramValues[p.name] ?? p.defaultValue ?? "");
    });
    return code;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {(() => { const ci = CATEGORY_INFO[template.category]; return ci ? <Badge className={cn("text-xs border", ci.bg, ci.border, ci.color)}>{ci.icon} {ci.label}</Badge> : null; })()}
          {(template.mitreAttack ?? []).map((t: string) => (
            <Badge key={t} className="text-[10px] font-mono bg-red-50 text-red-700 border-red-200">{t}</Badge>
          ))}
          {template.platform && <Badge variant="secondary" className="text-xs">{template.platform}</Badge>}
          {template.language && <Badge variant="outline" className="text-xs font-mono">{template.language}</Badge>}
          {template.isBuiltin && <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">内置</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{template.description}</p>
        <Tabs defaultValue="code">
          <TabsList className="h-8">
            <TabsTrigger value="code" className="text-xs">代码模板</TabsTrigger>
            <TabsTrigger value="params" className="text-xs">参数配置</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">预览结果</TabsTrigger>
          </TabsList>
          <TabsContent value="code">
            <div className="h-64 rounded-xl overflow-hidden border">
              <Editor height="100%" language={template.language ?? "c"} value={template.codeTemplate ?? "// No template code"} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }} theme="vs-dark" />
            </div>
          </TabsContent>
          <TabsContent value="params">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(template.parameters ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">此模板无参数</p>
              ) : (
                (template.parameters ?? []).map((p: any) => (
                  <div key={p.name} className="space-y-1">
                    <Label className="text-xs font-mono text-primary">{`{{${p.name}}}`} <span className="text-muted-foreground font-sans">— {p.description}</span></Label>
                    <Input value={paramValues[p.name] ?? p.defaultValue ?? ""} onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))} placeholder={p.defaultValue} className="font-mono text-sm h-8" />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <div className="h-64 rounded-xl overflow-hidden border">
              <Editor height="100%" language={template.language ?? "c"} value={resolveTemplate()} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }} theme="vs-dark" />
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
          <Button size="sm" className="bg-grad-primary border-0" onClick={() => { onInsert?.(resolveTemplate()); toast.success("模板已插入编辑器"); onClose(); }}>
            <Code2 className="w-3.5 h-3.5 mr-1.5" /> 插入编辑器
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onView, searchQuery }: { template: any; onView: (t: any) => void; searchQuery: string }) {
  const [starred, setStarred] = useState(false);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.templates.delete.useMutation({ onSuccess: () => { utils.templates.list.invalidate(); toast.success("已删除"); } });
  const { setActiveModule } = useApp();
  const ci = CATEGORY_INFO[template.category] ?? CATEGORY_INFO.other;

  return (
    <Card className="border card-hover card-glow-primary overflow-hidden group cursor-pointer" onClick={() => onView(template)}>
      <div className={cn("h-0.5 bg-gradient-to-r", ci.grad)} />
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-xl", ci.bg, ci.border)}>
            {ci.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-sm font-bold text-foreground truncate">
                <HighlightText text={template.name} query={searchQuery} />
              </h3>
              {starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(template); }}>
                <Eye className="w-3.5 h-3.5 mr-2" /> 查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setStarred(!starred); }}>
                <Star className="w-3.5 h-3.5 mr-2 text-amber-400" /> {starred ? "取消收藏" : "收藏"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveModule("editor"); toast.success("已跳转到编辑器"); }}>
                <Code2 className="w-3.5 h-3.5 mr-2" /> 在编辑器中打开
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!template.isBuiltin && (
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: template.id }); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold border", ci.bg, ci.border, ci.color)}>{ci.label}</span>
          {template.platform && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">{template.platform}</span>}
          {template.language && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-mono">{template.language}</span>}
          {template.isBuiltin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">内置</span>}
        </div>

        {/* MITRE ATT&CK badges */}
        {(template.mitreAttack ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(template.mitreAttack ?? []).slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">{t}</span>
            ))}
            {(template.mitreAttack ?? []).length > 3 && (
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{(template.mitreAttack ?? []).length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5">
          <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{(template.parameters ?? []).length} 参数</span>
          <span className="text-[10px] font-mono">v{template.version}</span>
          <span className="text-primary font-medium text-[11px]">点击查看 →</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("templates");
  const [selectedMitreTechnique, setSelectedMitreTechnique] = useState<string | null>(null);
  const { pendingAction, clearAction, setActiveModule } = useApp();

  const seedMutation = trpc.templates.seedBuiltin.useMutation({
    onSuccess: (data) => { utils.templates.list.invalidate(); toast.success(`已加载 ${data.count} 个内置模板`); }
  });
  const utils = trpc.useUtils();

  if (pendingAction?.type === "search_templates") {
    clearAction();
    if (pendingAction.payload?.search) setSearch(pendingAction.payload.search as string);
  }

  const { data: templates = [], isLoading } = trpc.templates.list.useQuery({
    category: filterCategory !== "all" && !selectedMitreTechnique ? filterCategory : undefined,
    search: search || undefined,
  });

  // Filter by MITRE technique
  const filteredTemplates = useMemo(() => {
    if (!selectedMitreTechnique) return templates;
    return templates.filter((t: any) => (t.mitreAttack ?? []).includes(selectedMitreTechnique));
  }, [templates, selectedMitreTechnique]);

  // Collect all covered techniques from templates
  const coveredTechniques = useMemo(() => {
    return templates.flatMap((t: any) => t.mitreAttack ?? []);
  }, [templates]);

  const handleInsertToEditor = () => setActiveModule("editor");

  const handleMitreTechniqueClick = (techniqueId: string) => {
    setSelectedMitreTechnique(prev => prev === techniqueId ? null : techniqueId);
    setActiveTab("templates");
    setFilterCategory("all");
  };

  const selectedTechniqueInfo = selectedMitreTechnique
    ? ATTACK_TACTICS.flatMap(t => t.techniques).find(t => t.id === selectedMitreTechnique)
    : null;

  return (
    <div className="p-6 space-y-5 max-w-[1600px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">模板管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">内置与自定义渗透测试代码模板库，支持 MITRE ATT&CK 映射</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <RefreshCw className={cn("w-3.5 h-3.5", seedMutation.isPending && "animate-spin")} />
            加载内置模板
          </Button>
          <Button size="sm" className="gap-1.5 h-8 bg-grad-primary border-0 shadow-md shadow-indigo-900/20" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-3.5 h-3.5" /> 新建模板
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 stagger-children">
        {[
          { label: "模板总数", value: templates.length, color: "text-indigo-600 bg-indigo-50 border-indigo-200", icon: FileCode },
          { label: "ATT&CK覆盖", value: Array.from(new Set(coveredTechniques)).length, color: "text-red-600 bg-red-50 border-red-200", icon: Target },
          { label: "内置模板", value: templates.filter((t: any) => t.isBuiltin).length, color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: Shield },
          { label: "自定义模板", value: templates.filter((t: any) => !t.isBuiltin).length, color: "text-purple-600 bg-purple-50 border-purple-200", icon: Code2 },
        ].map(s => (
          <div key={s.label} className={cn("flex items-center gap-3 p-3.5 rounded-xl border card-hover", s.color)}>
            <s.icon className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="templates" className="text-xs gap-1.5"><FileCode className="w-3.5 h-3.5" />模板库</TabsTrigger>
          <TabsTrigger value="matrix" className="text-xs gap-1.5"><Grid3x3 className="w-3.5 h-3.5" />ATT&CK 矩阵</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {/* Active filter indicator */}
          {selectedMitreTechnique && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
              <Target className="w-4 h-4 text-red-600 shrink-0" />
              <span className="text-sm text-red-800">
                筛选技术: <span className="font-bold font-mono">{selectedMitreTechnique}</span>
                {selectedTechniqueInfo && <span className="ml-1">— {selectedTechniqueInfo.name}</span>}
              </span>
              <span className="text-xs text-red-600 ml-1">({filteredTemplates.length} 个模板)</span>
              <button onClick={() => setSelectedMitreTechnique(null)} className="ml-auto text-red-500 hover:text-red-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterCategory("all")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors border", filterCategory === "all" ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")}>
              全部 ({templates.length})
            </button>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => {
              const count = templates.filter((t: any) => t.category === key).length;
              if (count === 0) return null;
              return (
                <button key={key} onClick={() => setFilterCategory(key)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors border", filterCategory === key ? "bg-primary text-white border-primary" : cn("bg-white border-border hover:border-primary/30", info.color))}>
                  {info.icon} {info.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="搜索模板名称、描述或标签..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-xl shimmer" />)}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-base font-semibold text-muted-foreground">暂无模板</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMitreTechnique ? `技术 ${selectedMitreTechnique} 暂无对应模板` : "点击「加载内置模板」获取预置模板库"}
              </p>
              {!selectedMitreTechnique && (
                <Button size="sm" className="mt-5 gap-1.5" onClick={() => seedMutation.mutate()}>
                  <RefreshCw className="w-3.5 h-3.5" /> 加载内置模板
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
              {filteredTemplates.map((template: any) => (
                <TemplateCard key={template.id} template={template} onView={setSelectedTemplate} searchQuery={search} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ATT&CK Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm">
                    <Target className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">MITRE ATT&CK® 矩阵</CardTitle>
                    <CardDescription className="text-xs">点击技术格子可筛选对应模板，红色表示有模板覆盖</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMitreTechnique && (
                    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
                      <Target className="w-3 h-3" />
                      已选: {selectedMitreTechnique}
                      <button onClick={() => setSelectedMitreTechnique(null)} className="ml-1 hover:text-red-900">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {templates.length === 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => seedMutation.mutate()}>
                      <RefreshCw className="w-3 h-3" /> 加载模板
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MitreMatrix
                coveredTechniques={coveredTechniques}
                onTechniqueClick={handleMitreTechniqueClick}
                selectedTechnique={selectedMitreTechnique}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTemplateDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />

      {selectedTemplate && (
        <TemplateDetailDialog
          template={selectedTemplate}
          open={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onInsert={handleInsertToEditor}
        />
      )}
    </div>
  );
}
