import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, X, FileCode } from "lucide-react";
import Editor from "@monaco-editor/react";

interface Param {
  name: string;
  type: string;
  description: string;
  defaultValue: string;
}

export function CreateTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "injection" as const,
    platform: "windows",
    language: "c",
    mitreAttack: "",
    codeTemplate: "// Template code here\n// Use {{PARAM_NAME}} for parameters\n",
    tags: "",
  });
  const [params, setParams] = useState<Param[]>([]);
  const [newParam, setNewParam] = useState<Param>({ name: "", type: "string", description: "", defaultValue: "" });

  const utils = trpc.useUtils();
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("模板创建成功");
      onClose();
    },
    onError: (e) => toast.error(`创建失败: ${e.message}`),
  });

  const addParam = () => {
    if (!newParam.name) return;
    setParams(prev => [...prev, { ...newParam }]);
    setNewParam({ name: "", type: "string", description: "", defaultValue: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-primary" />
            新建模板
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">模板名称 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Process Injection - Custom" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">分类</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as any }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="injection">注入</SelectItem>
                  <SelectItem value="privilege_escalation">提权</SelectItem>
                  <SelectItem value="lateral_movement">横向移动</SelectItem>
                  <SelectItem value="persistence">持久化</SelectItem>
                  <SelectItem value="recon">信息收集</SelectItem>
                  <SelectItem value="evasion">免杀绕过</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">语言</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="powershell">PowerShell</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">描述</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="模板功能描述..." className="text-sm resize-none" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">MITRE ATT&CK（逗号分隔）</Label>
              <Input value={form.mitreAttack} onChange={e => setForm(f => ({ ...f, mitreAttack: e.target.value }))} placeholder="T1055, T1059.001" className="text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">标签（逗号分隔）</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="injection, windows" className="text-sm" />
            </div>
          </div>

          {/* Code Template */}
          <div className="space-y-1.5">
            <Label className="text-xs">代码模板（使用 {"{{PARAM_NAME}}"} 作为参数占位符）</Label>
            <div className="h-48 rounded-lg overflow-hidden border">
              <Editor
                height="100%"
                language={form.language}
                value={form.codeTemplate}
                onChange={v => setForm(f => ({ ...f, codeTemplate: v ?? "" }))}
                theme="vs-dark"
                options={{ fontSize: 12, minimap: { enabled: false }, lineNumbers: "on" }}
              />
            </div>
          </div>

          {/* Parameters */}
          <div className="space-y-2">
            <Label className="text-xs">模板参数</Label>
            {params.length > 0 && (
              <div className="space-y-1.5">
                {params.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-xs">
                    <span className="font-mono text-primary">{`{{${p.name}}}`}</span>
                    <span className="text-muted-foreground">{p.description}</span>
                    {p.defaultValue && <Badge variant="outline" className="text-[10px]">{p.defaultValue}</Badge>}
                    <button onClick={() => setParams(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              <Input value={newParam.name} onChange={e => setNewParam(p => ({ ...p, name: e.target.value }))} placeholder="参数名" className="text-xs h-8 font-mono" />
              <Input value={newParam.description} onChange={e => setNewParam(p => ({ ...p, description: e.target.value }))} placeholder="描述" className="text-xs h-8" />
              <Input value={newParam.defaultValue} onChange={e => setNewParam(p => ({ ...p, defaultValue: e.target.value }))} placeholder="默认值" className="text-xs h-8" />
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addParam} disabled={!newParam.name}>
                <Plus className="w-3 h-3" /> 添加
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" disabled={!form.name || createMutation.isPending}
            onClick={() => createMutation.mutate({
              name: form.name,
              description: form.description || undefined,
              category: form.category,
              platform: form.platform,
              language: form.language,
              mitreAttack: form.mitreAttack ? form.mitreAttack.split(",").map(t => t.trim()).filter(Boolean) : [],
              codeTemplate: form.codeTemplate,
              parameters: params,
              tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
            })}>
            {createMutation.isPending ? "创建中..." : "创建模板"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
