'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw, Copy } from 'lucide-react';
import type { DirectResult } from '@/lib/types';
import { MiniMarkdown } from './MiniMarkdown';

interface DirectResultPageProps {
  input: string;
  result: DirectResult;
  onRestart: () => void;
  onGoBack: () => void;
}

export function DirectResultPage({ input, result, onRestart, onGoBack }: DirectResultPageProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.answer || '');
      alert('已复制');
    } catch {
      alert('复制失败');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onGoBack} className="text-sm text-muted-foreground hover:text-foreground">← 返回</button>
            <span className="text-lg font-bold tracking-tight">直答模式</span>
            {result.model_used && (
              <span className="text-xs text-muted-foreground">· {result.model_used}</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onRestart} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            重新开始
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        <div className="text-xs text-muted-foreground mb-2">你的问题</div>
        <div className="mb-6 text-sm bg-muted/30 rounded-lg p-3 border">{input}</div>

        {result.success === false ? (
          <div className="bg-red-50/50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {result.error || '模型调用失败'}
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-2">回答</div>
            <article className="text-sm leading-relaxed bg-card border rounded-lg p-4">
              <MiniMarkdown content={result.answer || '(空)'} />
            </article>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCopy} variant="outline" size="sm">
                <Copy className="w-3 h-3 mr-1" /> 复制
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
