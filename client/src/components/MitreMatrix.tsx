import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Shield, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

// ─── ATT&CK Tactics & Techniques ──────────────────────────────────────────
export const ATTACK_TACTICS = [
  {
    id: "TA0001", name: "初始访问", shortName: "初始访问",
    techniques: [
      { id: "T1190", name: "利用面向公众的应用" },
      { id: "T1133", name: "外部远程服务" },
      { id: "T1566", name: "网络钓鱼" },
      { id: "T1078", name: "有效账户" },
      { id: "T1091", name: "可移动媒体复制" },
    ]
  },
  {
    id: "TA0002", name: "执行", shortName: "执行",
    techniques: [
      { id: "T1059", name: "命令与脚本解释器" },
      { id: "T1059.001", name: "PowerShell" },
      { id: "T1059.003", name: "Windows命令Shell" },
      { id: "T1106", name: "本机API" },
      { id: "T1053", name: "计划任务/作业" },
    ]
  },
  {
    id: "TA0003", name: "持久化", shortName: "持久化",
    techniques: [
      { id: "T1547", name: "启动或登录自动启动" },
      { id: "T1547.001", name: "注册表Run键" },
      { id: "T1543", name: "创建或修改系统进程" },
      { id: "T1136", name: "创建账户" },
      { id: "T1505", name: "服务器软件组件" },
    ]
  },
  {
    id: "TA0004", name: "权限提升", shortName: "提权",
    techniques: [
      { id: "T1134", name: "访问令牌操纵" },
      { id: "T1134.001", name: "令牌模拟/窃取" },
      { id: "T1548", name: "滥用提升控制机制" },
      { id: "T1055", name: "进程注入" },
      { id: "T1068", name: "利用提权漏洞" },
    ]
  },
  {
    id: "TA0005", name: "防御绕过", shortName: "绕过",
    techniques: [
      { id: "T1562", name: "削弱防御" },
      { id: "T1070", name: "清除指标" },
      { id: "T1036", name: "伪装" },
      { id: "T1027", name: "混淆文件或信息" },
      { id: "T1055", name: "进程注入" },
    ]
  },
  {
    id: "TA0006", name: "凭据访问", shortName: "凭据",
    techniques: [
      { id: "T1003", name: "OS凭据转储" },
      { id: "T1110", name: "暴力破解" },
      { id: "T1555", name: "密码存储中的凭据" },
      { id: "T1558", name: "窃取或伪造Kerberos票据" },
      { id: "T1552", name: "不安全的凭据" },
    ]
  },
  {
    id: "TA0007", name: "发现", shortName: "发现",
    techniques: [
      { id: "T1087", name: "账户发现" },
      { id: "T1083", name: "文件和目录发现" },
      { id: "T1046", name: "网络服务扫描" },
      { id: "T1057", name: "进程发现" },
      { id: "T1018", name: "远程系统发现" },
    ]
  },
  {
    id: "TA0008", name: "横向移动", shortName: "横移",
    techniques: [
      { id: "T1550", name: "使用替代认证材料" },
      { id: "T1550.002", name: "哈希传递" },
      { id: "T1021", name: "远程服务" },
      { id: "T1210", name: "利用远程服务" },
      { id: "T1534", name: "内部鱼叉式网络钓鱼" },
    ]
  },
  {
    id: "TA0011", name: "命令与控制", shortName: "C2",
    techniques: [
      { id: "T1071", name: "应用层协议" },
      { id: "T1071.001", name: "Web协议" },
      { id: "T1071.004", name: "DNS" },
      { id: "T1573", name: "加密通道" },
      { id: "T1090", name: "代理" },
    ]
  },
];

interface MitreMatrixProps {
  coveredTechniques: string[]; // technique IDs covered by templates
  onTechniqueClick?: (techniqueId: string) => void;
  selectedTechnique?: string | null;
  compact?: boolean;
}

export function MitreMatrix({ coveredTechniques, onTechniqueClick, selectedTechnique, compact = false }: MitreMatrixProps) {
  const [hoveredTechnique, setHoveredTechnique] = useState<string | null>(null);
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);

  const coverageMap = useMemo(() => {
    const map: Record<string, number> = {};
    coveredTechniques.forEach(id => {
      map[id] = (map[id] ?? 0) + 1;
    });
    return map;
  }, [coveredTechniques]);

  const tacticCoverage = useMemo(() => {
    return ATTACK_TACTICS.map(tactic => {
      const covered = tactic.techniques.filter(t => coverageMap[t.id] > 0).length;
      return { id: tactic.id, covered, total: tactic.techniques.length, rate: covered / tactic.techniques.length };
    });
  }, [coverageMap]);

  const totalCovered = Object.keys(coverageMap).length;
  const totalTechniques = ATTACK_TACTICS.reduce((s, t) => s + t.techniques.length, 0);

  return (
    <div className="space-y-3">
      {/* Coverage summary */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <span className="text-sm font-semibold text-red-900">ATT&CK 覆盖率</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-red-700">{totalCovered}<span className="text-sm font-normal text-red-500">/{totalTechniques}</span></p>
            <p className="text-[10px] text-red-600">技术覆盖</p>
          </div>
          <div className="w-16 h-16 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fee2e2" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3"
                strokeDasharray={`${(totalCovered / totalTechniques) * 100} 100`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px] font-bold text-red-700">{Math.round(totalCovered / totalTechniques * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Matrix grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Tactic headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `repeat(${ATTACK_TACTICS.length}, minmax(90px, 1fr))` }}>
            {ATTACK_TACTICS.map((tactic, i) => {
              const cov = tacticCoverage[i];
              return (
                <div key={tactic.id} className="text-center">
                  <div className={cn(
                    "px-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all",
                    "bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600"
                  )}
                    onClick={() => setExpandedTactic(expandedTactic === tactic.id ? null : tactic.id)}
                  >
                    <p className="truncate">{tactic.shortName}</p>
                    <p className="text-[9px] opacity-80 mt-0.5">{cov.covered}/{cov.total}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technique cells */}
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ATTACK_TACTICS.length}, minmax(90px, 1fr))` }}>
            {ATTACK_TACTICS.map(tactic => (
              <div key={tactic.id} className="space-y-0.5">
                {tactic.techniques.map(technique => {
                  const count = coverageMap[technique.id] ?? 0;
                  const isSelected = selectedTechnique === technique.id;
                  const isHovered = hoveredTechnique === technique.id;
                  const hasCoverage = count > 0;

                  return (
                    <Tooltip key={technique.id} delayDuration={200}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onTechniqueClick?.(technique.id)}
                          onMouseEnter={() => setHoveredTechnique(technique.id)}
                          onMouseLeave={() => setHoveredTechnique(null)}
                          className={cn(
                            "w-full px-1.5 py-1 rounded text-[10px] text-left transition-all duration-150 border",
                            hasCoverage
                              ? isSelected
                                ? "bg-red-600 text-white border-red-700 shadow-sm"
                                : "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
                              : isSelected
                                ? "bg-gray-400 text-white border-gray-500"
                                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate font-medium leading-tight">{technique.name}</span>
                            {hasCoverage && (
                              <span className={cn(
                                "shrink-0 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none",
                                isSelected ? "bg-white/30 text-white" : "bg-red-200 text-red-700"
                              )}>
                                {count}
                              </span>
                            )}
                          </div>
                          <p className={cn("text-[9px] mt-0.5 font-mono opacity-70", hasCoverage && !isSelected && "text-red-600")}>
                            {technique.id}
                          </p>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                        <p className="font-semibold">{technique.name}</p>
                        <p className="text-muted-foreground font-mono text-[10px]">{technique.id}</p>
                        {hasCoverage ? (
                          <p className="text-green-600 mt-1">✓ {count} 个模板覆盖此技术</p>
                        ) : (
                          <p className="text-muted-foreground mt-1">暂无模板覆盖</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span>有模板覆盖</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-600" />
          <span>已选中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-muted border border-border" />
          <span>未覆盖</span>
        </div>
        <a href="https://attack.mitre.org" target="_blank" rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> MITRE ATT&CK
        </a>
      </div>
    </div>
  );
}
