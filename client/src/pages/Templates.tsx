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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus, Search, FileCode, Shield, Trash2, Edit, Tag, Filter,
  ChevronRight, Download, Upload, BookOpen, Code2, Layers,
  Copy, ExternalLink, MoreHorizontal, RefreshCw, Zap, Bot, Eye
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Editor from "@monaco-editor/react";
import { CreateTemplateDialog } from "@/components/CreateTemplateDialog";

const CATEGORY_INFO: Record<string, { label: string; color: string; icon: string }> = {
  injection: { label: "注入", color: "bg-red-100 text-red-700", icon: "💉" },
  privilege_escalation: { label: "提权", color: "bg-orange-100 text-orange-700", icon: "⬆️" },
  lateral_movement: { label: "横向移动", color: "bg-purple-100 text-purple-700", icon: "↔️" },
  persistence: { label: "持久化", color: "bg-blue-100 text-blue-700", icon: "🔒" },
  recon: { label: "信息收集", color: "bg-green-100 text-green-700", icon: "🔍" },
  evasion: { label: "免杀绕过", color: "bg-yellow-100 text-yellow-700", icon: "🛡️" },
  other: { label: "其他", color: "bg-gray-100 text-gray-700", icon: "📦" },
};

function TemplateDetailDialog({ template, open, onClose, onInsert }: {
  template: any; open: boolean; onClose: () => void; onInsert?: (code: string) => void
}) {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const resolveTemplate = () => {
    let code = template.codeTemplate ?? "";
    const params = template.parameters ?? [];
    params.forEach((p: any) => {
      const val = paramValues[p.name] ?? p.defaultValue ?? "";
      code = code.replace(new RegExp(`{{${p.name}}}`, "g"), val);
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
        <div className="flex gap-3 flex-wrap">
          <Badge className={cn("text-xs", CATEGORY_INFO[template.category]?.color)}>
            {CATEGORY_INFO[template.category]?.label}
          </Badge>
          {(template.mitreAttack ?? []).map((t: string) => (
            <Badge key={t} variant="outline" className="text-xs font-mono">{t}</Badge>
          ))}
          {template.platform && <Badge variant="secondary" className="text-xs">{template.platform}</Badge>}
          {template.language && <Badge variant="secondary" className="text-xs font-mono">{template.language}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{template.description}</p>

        <Tabs defaultValue="code">
          <TabsList className="h-8">
            <TabsTrigger value="code" className="text-xs">代码模板</TabsTrigger>
            <TabsTrigger value="params" className="text-xs">参数配置</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">预览结果</TabsTrigger>
          </TabsList>
          <TabsContent value="code">
            <div className="h-64 rounded-lg overflow-hidden border">
              <Editor
                height="100%"
                language={template.language ?? "c"}
                value={template.codeTemplate ?? "// No template code"}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12, lineNumbers: "on" }}
                theme="vs-dark"
              />
            </div>
          </TabsContent>
          <TabsContent value="params">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {(template.parameters ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">此模板无参数</p>
              ) : (
                (template.parameters ?? []).map((p: any) => (
                  <div key={p.name} className="space-y-1">
                    <Label className="text-xs font-mono">{`{{${p.name}}}`} <span className="text-muted-foreground font-sans">— {p.description}</span></Label>
                    <Input
                      value={paramValues[p.name] ?? p.defaultValue ?? ""}
                      onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                      placeholder={p.defaultValue ?? `输入 ${p.name}`}
                      className="font-mono text-sm h-8"
                    />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <div className="h-64 rounded-lg overflow-hidden border">
              <Editor
                height="100%"
                language={template.language ?? "c"}
                value={resolveTemplate()}
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
                theme="vs-dark"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>关闭</Button>
          <Button size="sm" onClick={() => { onInsert?.(resolveTemplate()); toast.success("模板已插入编辑器"); onClose(); }}>
            <Code2 className="w-3.5 h-3.5 mr-1.5" />
            插入编辑器
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template, onView }: { template: any; onView: (t: any) => void }) {
  const utils = trpc.useUtils();
  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => { utils.templates.list.invalidate(); toast.success("模板已删除"); }
  });
  const { setActiveModule } = useApp();
  const catInfo = CATEGORY_INFO[template.category] ?? CATEGORY_INFO.other;

  return (
    <Card className="border border-border hover:shadow-md transition-all duration-200 group cursor-pointer" onClick={() => onView(template)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg">
              {catInfo.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{template.name}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{template.description}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(template); }}>
                <Eye className="w-3.5 h-3.5 mr-2" /> 查看详情
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

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge className={cn("text-[10px] h-4 px-1.5 font-normal", catInfo.color)}>{catInfo.label}</Badge>
          {template.platform && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{template.platform}</Badge>}
          {template.language && <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">{template.language}</Badge>}
          {template.isBuiltin && <Badge className="text-[10px] h-4 px-1.5 bg-indigo-100 text-indigo-700">内置</Badge>}
        </div>

        {/* MITRE ATT&CK */}
        {(template.mitreAttack ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(template.mitreAttack ?? []).slice(0, 3).map((t: string) => (
              <span key={t} className="text-[10px] font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">{t}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2">
          <span>{(template.parameters ?? []).length} 个参数</span>
          <span>v{template.version}</span>
          <span className="text-primary font-medium">点击查看 →</span>
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
  const { pendingAction, clearAction, setActiveModule } = useApp();

  // Seed builtin templates
  const seedMutation = trpc.templates.seedBuiltin.useMutation({
    onSuccess: (data) => { utils.templates.list.invalidate(); toast.success(`已加载 ${data.count} 个内置模板`); }
  });
  const utils = trpc.useUtils();

  if (pendingAction?.type === "search_templates") {
    clearAction();
    if (pendingAction.payload?.search) setSearch(pendingAction.payload.search as string);
  }

  const { data: templates = [], isLoading } = trpc.templates.list.useQuery({
    category: filterCategory !== "all" ? filterCategory : undefined,
    search: search || undefined,
  });

  const handleInsertToEditor = (code: string) => {
    setActiveModule("editor");
  };

  return (
    <div className="p-6 space-y-5 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">模板管理</h2>
          <p className="text-sm text-muted-foreground mt-0.5">内置与自定义渗透测试代码模板库</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            <RefreshCw className={cn("w-3.5 h-3.5", seedMutation.isPending && "animate-spin")} />
            加载内置模板
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-3.5 h-3.5" />
            新建模板
          </Button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            filterCategory === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          全部 ({templates.length})
        </button>
        {Object.entries(CATEGORY_INFO).map(([key, info]) => {
          const count = templates.filter((t: any) => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setFilterCategory(key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filterCategory === key ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {info.icon} {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="搜索模板..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-lg shimmer" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">暂无模板</p>
          <p className="text-xs text-muted-foreground mt-1">点击「加载内置模板」获取预置模板库</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => seedMutation.mutate()}>
            <RefreshCw className="w-3.5 h-3.5" /> 加载内置模板
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((template: any) => (
            <TemplateCard key={template.id} template={template} onView={setSelectedTemplate} />
          ))}
        </div>
      )}

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
