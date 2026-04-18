'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Flame, Shield, Target, AlertTriangle, Sparkles, Eye, Copy, Download, RotateCcw, ArrowDown, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SwordsIcon } from './HandDrawnIcons';
import type { ClaimCardViewModel, DiffResult, BlindspotOutput, ObserverOutput, DiffState, FinalOutput, BriefingOutput } from '@/lib/types';

interface SourcesPanelProps {
  input: string;
  mode: string;
  layer: number;
  observer?: ObserverOutput;
  userThoughts: string;
  onUserThoughtsChange: (thoughts: string) => void;
  canRunActions?: boolean;
  onOpenCompete?: () => void;
  onOpenReview?: () => void;
}

export function SourcesPanel({ input, mode, layer, observer, userThoughts, onUserThoughtsChange, canRunActions, onOpenCompete, onOpenReview }: SourcesPanelProps) {
  const [observerExpanded, setObserverExpanded] = useState(false);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 我的问题 + 模式信息 */}
      <div className="flex-shrink-0">
        <div className="p-3 border-b bg-muted/30">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            信息源
          </h3>
        </div>
        <div className="p-3 space-y-4">
          {/* 我的问题 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              我的问题
            </label>
            <div className="bg-background rounded-lg px-3 py-2 border text-xs text-muted-foreground">
              {input}
            </div>
          </div>

          {/* 模式信息 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              当前模式
            </label>
            <Badge variant="outline" className="text-xs">
              {mode === 'solve' ? '求解' : '审稿'}
            </Badge>
          </div>

          {/* 层信息 */}
          {layer > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                当前层数
              </label>
              <Badge variant="secondary" className="text-xs">
                第 {layer} 层
              </Badge>
            </div>
          )}

          {/* 一键动作（决策后可选） */}
          {canRunActions && (onOpenCompete || onOpenReview) && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                一键动作
              </label>
              <div className="flex flex-col gap-1.5">
                {onOpenCompete && (
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start" onClick={onOpenCompete}>
                    ✍️ 一键比稿
                  </Button>
                )}
                {onOpenReview && (
                  <Button variant="outline" size="sm" className="h-7 text-xs justify-start" onClick={onOpenReview}>
                    📋 一键审稿
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 我的想法 - 固定在底部 */}
      <div className="flex-shrink-0 border-t mt-auto">
        <div className="p-3 border-b bg-muted/30">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            我的想法
          </h3>
        </div>
        <div className="p-3">
          <div className="relative">
            <Textarea
              value={userThoughts}
              onChange={(e) => onUserThoughtsChange(e.target.value)}
              placeholder="在这里补充你的想法..."
              className="min-h-[80px] text-sm resize-none pr-10"
            />
            <Button
              size="icon"
              className="absolute bottom-2 right-2 h-8 w-8 bg-muted-foreground hover:bg-muted-foreground/80 rounded-lg"
              disabled={!userThoughts.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12V4M8 4L5 7M8 4L11 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12H13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* 旁观者 - 在我的想法上方，点击向上展开 */}
      <div className="flex-shrink-0 border-t">
        <button
          onClick={() => setObserverExpanded(!observerExpanded)}
          className="w-full p-3 border-b bg-purple-50/50 dark:bg-purple-950/20 flex items-center justify-between hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
              旁观者
            </h3>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`text-purple-600 transition-transform ${observerExpanded ? 'rotate-180' : ''}`}
          >
            <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {observerExpanded && (
          <div className="p-3 space-y-2">
            {observer ? (
              <>
                <div>
                  <span className="text-xs font-medium text-purple-600">共同忽略的维度</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{observer.missed_dimension}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-purple-600">全新角度</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{observer.fresh_angle}</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic">暂无旁观者意见</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Agent 图标映射
const AGENT_ICONS = {
  agent_radical: Flame,
  agent_steady: Shield,
  agent_pragmatic: Target,
  router: Sparkles,
};

interface StanceCardProps {
  claim: ClaimCardViewModel;
  isSelected: boolean;
  onSelect: () => void;
}

export function StanceCard({ claim, isSelected, onSelect }: StanceCardProps) {
  const {
    agent_id,
    persona_label,
    key_action,
    thesis,
    rationale,
    assumptions,
    risks,
    action_steps,
    confidence,
    not_now,
    why_not_now,
    what_would_change_my_mind,
    alternative,
    long_form,
  } = claim;
  const [expanded, setExpanded] = useState(false);

  const Icon = AGENT_ICONS[agent_id];
  const colorClass =
    agent_id === 'agent_radical'
      ? { icon: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800' }
      : agent_id === 'agent_steady'
      ? { icon: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800' }
      : agent_id === 'router'
      ? { icon: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800' }
      : { icon: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800' };

  return (
    <Card className={`stance-card-compact ${colorClass.border}`} style={{ paddingBlock: 0, gap: 0 }}>
      <CardContent className="stance-card-content px-3 pt-1.5 pb-2">
        <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
          <div className="flex items-center gap-1" style={{ lineHeight: 1 }}>
            <Icon className={`w-3.5 h-3.5 ${colorClass.icon}`} />
            <span className="text-[11px] font-medium text-muted-foreground">{persona_label}</span>
          </div>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 leading-none">
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
        {/* 摘要层（默认可见，折叠时尽量精简） */}
        <div className="text-sm font-semibold leading-snug">{key_action}</div>
        {!expanded && (
          <p className="text-xs text-muted-foreground summary-line-clamp-2">{thesis}</p>
        )}
        {!expanded && rationale.length > 0 && (
          <div className="flex gap-1">
            <span className="text-[10px] font-medium text-emerald-600 shrink-0">理由</span>
            <p className="text-[10px] text-muted-foreground summary-line-clamp">{rationale[0]}</p>
          </div>
        )}

        {/* 展开全文：优先显示 agent 自然语言叙事 */}
        {expanded && (
          <div className="mt-2 pt-2 border-t border-dashed text-[12px] text-foreground/90 leading-relaxed space-y-2">
            {long_form ? (
              long_form.split(/\n\s*\n/).map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">{para.trim()}</p>
              ))
            ) : (
              <>
                <div>
                  <span className="font-semibold">核心主张：</span>
                  <span>{thesis}</span>
                </div>
                {rationale.length > 0 && (
                  <div>
                    <div className="font-semibold mb-0.5">支持理由</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {rationale.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {assumptions && assumptions.length > 0 && (
                  <div>
                    <div className="font-semibold mb-0.5">前提假设</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {assumptions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {risks.length > 0 && (
                  <div>
                    <div className="font-semibold mb-0.5">关键风险</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {risks.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {action_steps.length > 0 && (
                  <div>
                    <div className="font-semibold mb-0.5">执行步骤</div>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      {action_steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}
                {not_now && (
                  <div>
                    <span className="font-semibold">暂不做：</span>
                    <span>{not_now}</span>
                    {why_not_now && <span className="text-muted-foreground">（{why_not_now}）</span>}
                  </div>
                )}
                {what_would_change_my_mind && what_would_change_my_mind.length > 0 && (
                  <div>
                    <div className="font-semibold mb-0.5">什么会改变我的判断</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {what_would_change_my_mind.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                {alternative && (
                  <div>
                    <span className="font-semibold">备选角度：</span>
                    <span>{alternative}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 展开 / 收起按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="mt-1 w-full text-[10px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-0.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> 收起
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> 展开完整内容
            </>
          )}
        </button>
      </CardContent>

      <div className="stance-card-actions border-t px-3 py-2">
        <Button
          variant={isSelected ? 'default' : 'outline'}
          onClick={onSelect}
          className="w-full text-xs h-7"
          size="sm"
        >
          {isSelected ? '✓ 已选择' : '选择此方向'}
        </Button>
      </div>
    </Card>
  );
}

// 分歧状态 Badge 映射
const DIFF_STATE_STYLES: Record<DiffState, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  '强共识': { variant: 'default', label: '强共识' },
  '弱共识': { variant: 'secondary', label: '弱共识' },
  '强分歧': { variant: 'destructive', label: '强分歧' },
  '伪共识': { variant: 'outline', label: '伪共识' },
  '少数派存在': { variant: 'outline', label: '少数派存在' },
};

interface DecisionPanelProps {
  coreTension: string;
  diffResult: DiffResult;
  claims: ClaimCardViewModel[];
  briefing?: BriefingOutput;  // V3.15 新增
  blindspot?: BlindspotOutput;
  selectedClaimId?: string;
  onSelectClaim: (claimId: string) => void;
  onSynthesize: () => void;
  onCaptainDecide: () => void;
  isSynthesizing: boolean;
  isComplete?: boolean;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse" style={{ paddingBlock: 0, gap: 0 }}>
      <CardContent className="space-y-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-8 bg-muted rounded" />
        </div>
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </CardContent>
      <div className="border-t px-3 py-2">
        <div className="h-7 bg-muted rounded w-full" />
      </div>
    </Card>
  );
}

export function DecisionPanel({
  diffResult,
  claims,
  briefing,
  blindspot,
  selectedClaimId,
  onSelectClaim,
  onSynthesize,
  onCaptainDecide,
  isSynthesizing,
  isComplete,
  isLoading,
}: DecisionPanelProps) {
  const { state: diffState, consensus_summary } = diffResult;
  const stateStyle = DIFF_STATE_STYLES[diffState];

  return (
    <div className="h-full flex flex-col">
      {/* 标题 */}
      <div className="px-3 py-2 border-b bg-primary/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <path d="M3 18L4.5 9L8 13L12 6L16 13L19.5 9L21 18H3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M3 18H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="4.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="12" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="19.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
            国王的检阅台
          </h3>
        </div>
      </div>

      {/* 顶部 meta 汇总：共识 + 分歧核心 + 状态 */}
      <div className="px-3 py-2 border-b bg-muted/20 space-y-2 flex-shrink-0">
        {isLoading ? (
          <>
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded w-full animate-pulse" />
            <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
          </>
        ) : briefing ? (
          <>
            {briefing.common_ground && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-200/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">共识点</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{briefing.common_ground}</p>
              </div>
            )}
            {briefing.key_tradeoff && (
              <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-lg px-3 py-2 border border-rose-200/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">分歧核心</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{briefing.key_tradeoff}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={stateStyle.variant} className="shrink-0">{stateStyle.label}</Badge>
              {consensus_summary && (
                <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{consensus_summary}</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant={stateStyle.variant} className="shrink-0">{stateStyle.label}</Badge>
            {consensus_summary && (
              <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{consensus_summary}</p>
            )}
          </div>
        )}
      </div>

      {/* 三联分歧卡 */}
      <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
        <div className="grid grid-cols-3 gap-3 mb-3 items-stretch">
          {isLoading
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : claims.map((claim) => (
                <StanceCard
                  key={claim.claim_id}
                  claim={claim}
                  isSelected={selectedClaimId === claim.claim_id}
                  onSelect={() => onSelectClaim(selectedClaimId === claim.claim_id ? '' : claim.claim_id)}
                />
              ))}
        </div>

        {/* Blindspot 警告区 */}
        {blindspot && diffState === '伪共识' && (
          <Card className="mb-4 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">盲点探测</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{blindspot.core_blindspot}</p>
              <p className="text-xs text-muted-foreground">{blindspot.why_blind}</p>
              <p className="text-xs text-muted-foreground">{blindspot.extra_consideration}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 底部操作区 */}
      {!isComplete && !isLoading && (
        <div className="p-4 border-t bg-muted/20 flex gap-3 flex-shrink-0">
          <Button
            onClick={onSynthesize}
            disabled={!selectedClaimId || isSynthesizing}
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成最终稿
          </Button>
          <Button
            onClick={onCaptainDecide}
            disabled={isSynthesizing}
            variant="outline"
          >
            ▶ 让 Captain 决定
          </Button>
        </div>
      )}
    </div>
  );
}

interface ResultPanelProps {
  finalOutput?: FinalOutput;
  isStale?: boolean;
  isSynthesizing?: boolean;
  isComplete?: boolean;
  showNextLayer?: boolean;
  layer?: number;
  onRestart?: () => void;
  onGoToNextLayer?: () => void;
}

export function ResultPanel({ 
  finalOutput, 
  isStale, 
  isSynthesizing, 
  isComplete,
  showNextLayer,
  layer,
  onRestart,
  onGoToNextLayer,
}: ResultPanelProps) {
  
  const handleCopy = async () => {
    if (!finalOutput) return;
    const content = `
# 最终决策建议

## 基于 ${finalOutput.selected_persona}

${finalOutput.core_decision}

## 推荐理由
${finalOutput.reasoning}

${finalOutput.conditional_recommendation ? `## 条件式推荐\n${finalOutput.conditional_recommendation}` : ''}

${finalOutput.conflict_handling ? `## 与你的想法的冲突处理\n${finalOutput.conflict_handling}` : ''}

${finalOutput.risk_warning ? `## 风险提示\n${finalOutput.risk_warning}` : ''}

${finalOutput.dropped_useful_pieces.length > 0 ? `## 被放弃方向的有用碎片\n${finalOutput.dropped_useful_pieces.map(p => `- ${p}`).join('\n')}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(content);
      alert('已复制到剪贴板');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const handleExport = () => {
    if (!finalOutput) return;
    const content = `# 最终决策建议

## 基于 ${finalOutput.selected_persona}

${finalOutput.core_decision}

## 推荐理由
${finalOutput.reasoning}

${finalOutput.conditional_recommendation ? `## 条件式推荐\n${finalOutput.conditional_recommendation}` : ''}

${finalOutput.conflict_handling ? `## 与你的想法的冲突处理\n${finalOutput.conflict_handling}` : ''}

${finalOutput.risk_warning ? `## 风险提示\n${finalOutput.risk_warning}` : ''}

${finalOutput.dropped_useful_pieces.length > 0 ? `## 被放弃方向的有用碎片\n${finalOutput.dropped_useful_pieces.map(p => `- ${p}`).join('\n')}` : ''}
    `.trim();

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gambit-recommendation.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b bg-muted/30 flex-shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          最终稿
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isSynthesizing ? (
          <div className="space-y-3">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <SwordsIcon className="w-4 h-4" />
                <span>Captain 正在基于你的选择合成最终建议...</span>
              </div>
              <p className="text-xs">→ 正在对比三个方向的 Tradeoff...</p>
              <p className="text-xs">→ 正在整合你的想法...</p>
              <p className="text-xs">→ 正在生成条件式推荐...</p>
            </div>
          </div>
        ) : finalOutput ? (
          <div className="space-y-4">
            {/* 失效提示 */}
            {isStale && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                内容已变更，请重新生成最终稿
              </div>
            )}

            {/* 基于视角 */}
            <div className="text-sm">
              <span className="text-muted-foreground">基于 </span>
              <span className="font-medium">{finalOutput.selected_persona}</span>
            </div>

            {/* 核心决策建议 */}
            {finalOutput.core_decision && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">核心决策建议</h4>
                <p className="text-sm font-medium">{finalOutput.core_decision}</p>
              </div>
            )}

            {/* 推荐理由 */}
            {finalOutput.reasoning && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">推荐理由</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-y-auto max-h-40">
                  {finalOutput.reasoning}
                </p>
              </div>
            )}

            {/* 条件式推荐 */}
            {finalOutput.conditional_recommendation && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">条件式推荐</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-y-auto max-h-32">
                  {finalOutput.conditional_recommendation}
                </p>
              </div>
            )}

            {/* 与用户想法的冲突处理 */}
            {finalOutput.conflict_handling && (
              <div className="bg-amber-50/50 rounded-lg p-2">
                <h4 className="text-xs font-semibold text-amber-700 mb-1">与你的想法的冲突处理</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-y-auto max-h-24">
                  {finalOutput.conflict_handling}
                </p>
              </div>
            )}

            {/* 风险提示 */}
            {finalOutput.risk_warning && (
              <div className="bg-red-50/50 rounded-lg p-2">
                <h4 className="text-xs font-semibold text-red-700 mb-1">风险提示</h4>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap overflow-y-auto max-h-24">
                  {finalOutput.risk_warning}
                </p>
              </div>
            )}

            {/* 被放弃方向的有用碎片 */}
            {finalOutput.dropped_useful_pieces.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                  被放弃方向的有用碎片
                </h4>
                <ul className="space-y-1 overflow-y-auto max-h-32">
                  {finalOutput.dropped_useful_pieces.map((piece, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span>·</span>
                      <span>{piece}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">选择你的方向</p>
            <p className="text-xs mt-1">或让 Captain 帮你决定</p>
          </div>
        )}
      </div>

      {/* 功能按钮区 */}
      {isComplete && finalOutput && (
        <div className="flex-shrink-0 border-t p-3 space-y-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={handleCopy} variant="outline" size="sm" className="text-xs h-8">
              <Copy className="w-3 h-3 mr-1" />
              复制全文
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" className="text-xs h-8">
              <Download className="w-3 h-3 mr-1" />
              导出MD
            </Button>
            <Button onClick={onRestart} variant="outline" size="sm" className="text-xs h-8">
              <RotateCcw className="w-3 h-3 mr-1" />
              重新开始
            </Button>
            {showNextLayer && (
              <Button onClick={onGoToNextLayer} size="sm" className="text-xs h-8 bg-primary text-primary-foreground">
                <ArrowDown className="w-3 h-3 mr-1" />
                进入第{layer! + 1}层
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center">
            第{layer}层分析完毕
          </p>
        </div>
      )}
    </div>
  );
}

interface WorkbenchProps {
  input: string;
  mode: string;
  layer: number;
  coreTension: string;
  diffResult: DiffResult;
  claims: ClaimCardViewModel[];
  briefing?: BriefingOutput;  // V3.15 新增
  blindspot?: BlindspotOutput;
  observer?: ObserverOutput;
  selectedClaimId?: string;
  userThoughts: string;
  finalOutput?: FinalOutput;
  isStale?: boolean;
  isSynthesizing?: boolean;
  isComplete?: boolean;
  isLoading?: boolean;
  showNextLayer?: boolean;
  onSelectClaim: (claimId: string) => void;
  onUserThoughtsChange: (thoughts: string) => void;
  onSynthesize: () => void;
  onCaptainDecide: () => void;
  onOpenCompete?: () => void;
  onOpenReview?: () => void;
  onRestart?: () => void;
  onGoToNextLayer?: () => void;
}

export function Workbench(props: WorkbenchProps) {
  return (
    <div className="gambit-workbench min-h-[calc(100vh-100px)]">
      {/* 左栏：信息源 + 旁观者 + 我的想法 */}
      <aside className="sources-panel rounded-xl border bg-card">
        <SourcesPanel
          input={props.input}
          mode={props.mode}
          layer={props.layer}
          observer={props.observer}
          userThoughts={props.userThoughts}
          onUserThoughtsChange={props.onUserThoughtsChange}
          canRunActions={!props.isLoading && !props.isComplete && (props.claims?.length ?? 0) > 0}
          onOpenCompete={props.onOpenCompete}
          onOpenReview={props.onOpenReview}
        />
      </aside>

      {/* 中栏：国王的检阅台 */}
      <main className="decision-panel rounded-xl border bg-card">
        <DecisionPanel
          coreTension={props.coreTension}
          diffResult={props.diffResult}
          claims={props.claims}
          briefing={props.briefing}
          blindspot={props.blindspot}
          selectedClaimId={props.selectedClaimId}
          onSelectClaim={props.onSelectClaim}
          onSynthesize={props.onSynthesize}
          onCaptainDecide={props.onCaptainDecide}
          isSynthesizing={props.isSynthesizing ?? false}
          isComplete={props.isComplete}
          isLoading={props.isLoading}
        />
      </main>

      {/* 右栏：最终稿 */}
      <section className="result-panel rounded-xl border bg-card">
        <ResultPanel
          finalOutput={props.finalOutput}
          isStale={props.isStale}
          isSynthesizing={props.isSynthesizing}
          isComplete={props.isComplete}
          showNextLayer={props.showNextLayer}
          layer={props.layer}
          onRestart={props.onRestart}
          onGoToNextLayer={props.onGoToNextLayer}
        />
      </section>
    </div>
  );
}
