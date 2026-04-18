'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Download, RotateCcw, ArrowDown, Sparkles } from 'lucide-react';
import { SwordsIcon } from './HandDrawnIcons';
import type { FinalOutput } from '@/lib/types';

interface FinalResultPageProps {
  finalOutput: FinalOutput;
  onRestart: () => void;
  onGoToNextLayer?: () => void;
  showNextLayer?: boolean;
  layer: number;
}

export function FinalResultPage({
  finalOutput,
  onRestart,
  onGoToNextLayer,
  showNextLayer,
  layer,
}: FinalResultPageProps) {
  const handleCopy = async () => {
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
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">最终稿</h1>
          <p className="text-muted-foreground">
            基于 {finalOutput.selected_persona}
          </p>
        </div>

        {/* 核心决策 */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">核心决策建议</h2>
            <p className="text-base leading-relaxed">{finalOutput.core_decision}</p>
          </CardContent>
        </Card>


        {/* 推荐理由 */}
        {finalOutput.reasoning && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">推荐理由</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {finalOutput.reasoning}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 条件式推荐 */}
        {finalOutput.conditional_recommendation && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2">条件式推荐</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {finalOutput.conditional_recommendation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 与用户想法的冲突处理 */}
        {finalOutput.conflict_handling && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2 text-amber-700">
                与你的想法的冲突处理
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {finalOutput.conflict_handling}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 风险提示 */}
        {finalOutput.risk_warning && (
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-2 text-red-700">
                风险提示
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {finalOutput.risk_warning}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 被放弃方向的有用碎片 */}
        {finalOutput.dropped_useful_pieces.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">被放弃方向的有用碎片</h2>
              <ul className="space-y-2">
                {finalOutput.dropped_useful_pieces.map((piece, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">·</span>
                    <span>{piece}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Button onClick={handleCopy} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            复制全文
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            导出 Markdown
          </Button>
          <Button onClick={onRestart} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            重新开始
          </Button>
          {showNextLayer && onGoToNextLayer && (
            <Button onClick={onGoToNextLayer} size="sm">
              <ArrowDown className="w-4 h-4 mr-2" />
              进入下一层
            </Button>
          )}
        </div>

        {/* 提示信息 */}
        {layer === 1 && (
          <p className="text-xs text-center text-muted-foreground/60">
            你已完成第 1 层分析。如果需要更详细的执行路径，可以进入第 2 层
          </p>
        )}
      </div>
    </div>
  );
}
