'use client';

import { Check, X, Loader2 } from 'lucide-react';
import { FlameIcon, ShieldIcon, TargetIcon, MagnifierIcon, SwordsIcon } from './HandDrawnIcons';
import type { SessionState } from '@/lib/types';

interface AnalyzingPageProps {
  progress: SessionState['analyzing_progress'];
}

const STEPS = [
  { key: 'radical_done' as const, label: '激进视角正在思考...', doneLabel: '激进视角已就位', Icon: FlameIcon },
  { key: 'steady_done' as const, label: '稳健视角正在思考...', doneLabel: '稳健视角已就位', Icon: ShieldIcon },
  { key: 'pragmatic_done' as const, label: '务实视角正在思考...', doneLabel: '务实视角已就位', Icon: TargetIcon },
  { key: 'briefing_done' as const, label: '局势简报正在生成...', doneLabel: '审阅台已就绪', Icon: MagnifierIcon },
];

export function AnalyzingPage({ progress }: AnalyzingPageProps) {
  if (!progress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">准备中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="text-center mb-8">
          <div className="mb-4 animate-breathe">
            <SwordsIcon className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-semibold mb-2">评审团正在分析</h2>
          <p className="text-sm text-muted-foreground">
            三个视角正在并行思考，请稍候
          </p>
        </div>

        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const isDone = progress[step.key];
            const isPending = !isDone;

            return (
              <div
                key={step.key}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border transition-all duration-300
                  ${
                    isDone
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                      : 'bg-muted/30 border-border'
                  }
                `}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <step.Icon className={isDone ? 'opacity-60' : ''} />
                </div>
                <div className="flex-1">
                  <p
                    className={`
                      text-sm font-medium transition-all duration-300
                      ${isDone ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}
                      ${isPending && index < 3 ? 'animate-pulse' : ''}
                    `}
                  >
                    {isDone ? step.doneLabel : step.label}
                  </p>
                </div>
                <div className="w-6 h-6 flex items-center justify-center">
                  {isDone ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground/60">
            通常需要 15-30 秒，请保持页面打开
          </p>
        </div>
      </div>
    </div>
  );
}
