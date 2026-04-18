'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import type { CompeteResult } from '@/lib/types';

interface CompetePageProps {
  input: string;
  result: CompeteResult;
  onRestart: () => void;
  onGoBack: () => void;
}

export function CompetePage({ input, result, onRestart, onGoBack }: CompetePageProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
            <span className="text-lg font-bold tracking-tight">比稿模式</span>
            <span className="text-xs text-muted-foreground">
              阶段 1 · {result.success_count}/{result.total_count} 份成稿
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            重新开始
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        <div className="text-xs text-muted-foreground mb-2">需求</div>
        <div className="mb-6 text-sm bg-muted/30 rounded-lg p-3 border">{input}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {result.drafts.map((draft) => (
            <Card key={draft.style_id} className={draft.failed ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{draft.style_label}</span>
                  {draft.failed && <Badge variant="destructive" className="text-[10px]">失败</Badge>}
                </div>
                {draft.style_tag && (
                  <div className="text-[11px] text-muted-foreground">{draft.style_tag}</div>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                {draft.title && (
                  <div className="text-sm font-medium">{draft.title}</div>
                )}
                {draft.outline && draft.outline.length > 0 && (
                  <ul className="space-y-1">
                    {draft.outline.map((pt, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="shrink-0">·</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <div className="border-t px-3 py-2">
                <Button variant="outline" size="sm" className="w-full text-xs h-7" disabled>
                  展开完整稿（Step 3 实装）
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-[11px] text-muted-foreground/70 text-center">
          P1 Step 1 占位：三份摘要已展示，阶段 2 扩写按钮将在 Step 3 接入 /compete-expand。
        </div>
      </main>
    </div>
  );
}
