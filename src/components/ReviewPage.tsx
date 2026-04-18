'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import type { ReviewResult } from '@/lib/types';

interface ReviewPageProps {
  input: string;
  result: ReviewResult;
  onRestart: () => void;
  onGoBack: () => void;
}

export function ReviewPage({ input, result, onRestart, onGoBack }: ReviewPageProps) {
  const { layers, layer_visibility } = result;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
            <span className="text-lg font-bold tracking-tight">审稿模式</span>
            <span className="text-xs text-muted-foreground">
              阶段 1 · {result.success_count}/{result.total_count} 视角
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            重新开始
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        <div className="text-xs text-muted-foreground mb-2">需求</div>
        <div className="mb-4 text-sm bg-muted/30 rounded-lg p-3 border">{input}</div>

        <div className="text-xs text-muted-foreground mb-2">审阅对象</div>
        <div className="mb-6 text-sm bg-muted/30 rounded-lg p-3 border whitespace-pre-wrap max-h-40 overflow-y-auto">
          {result.review_target}
        </div>

        {/* 标题层 */}
        {layer_visibility.title && layers.title_options.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-semibold mb-2">标题建议（单选）</h3>
            <div className="space-y-2">
              {layers.title_options.map((opt) => (
                <Card key={opt.option_id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{opt.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{opt.reason}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{opt.perspective_label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 方向层 */}
        {layer_visibility.direction && layers.direction_options.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-semibold mb-2">方向建议（单选）</h3>
            <div className="space-y-2">
              {layers.direction_options.map((opt) => (
                <Card key={opt.option_id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{opt.direction}</div>
                        <div className="text-xs text-muted-foreground mt-1">{opt.reason}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{opt.perspective_label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 内容层 */}
        {layer_visibility.content && layers.content_options.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-semibold mb-2">内容修订（多选）</h3>
            <div className="space-y-2">
              {layers.content_options.map((opt) => (
                <Card key={opt.option_id}>
                  <CardContent className="py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{opt.perspective_label}</Badge>
                    </div>
                    <div className="text-xs"><span className="text-muted-foreground">原文：</span>{opt.quote}</div>
                    <div className="text-xs"><span className="text-amber-600">问题：</span>{opt.issue}</div>
                    <div className="text-xs"><span className="text-emerald-600">建议：</span>{opt.suggestion}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <Button className="w-full" disabled>
          生成改后稿（Step 4 实装）
        </Button>

        <div className="mt-4 text-[11px] text-muted-foreground/70 text-center">
          P1 Step 1 占位：三层已展示；勾选 + /review-apply 将在 Step 4 接入。
        </div>
      </main>
    </div>
  );
}
