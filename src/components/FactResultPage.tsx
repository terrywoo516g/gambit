'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, RotateCcw, MessageSquare } from 'lucide-react';

interface FactResultPageProps {
  answer: string;
  strategicHint: string;
  onForceDecision: () => void;
  onRestart: () => void;
}

export function FactResultPage({
  answer,
  strategicHint,
  onForceDecision,
  onRestart,
}: FactResultPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* 标签 */}
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium dark:bg-blue-900/30 dark:text-blue-400">
            事实查询
          </span>
        </div>

        {/* 回答内容 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {answer}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 战略联想 */}
        {strategicHint && (
          <Card className="mb-8 bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {strategicHint}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 底部按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onForceDecision} variant="default" size="lg">
            <MessageSquare className="w-4 h-4 mr-2" />
            仍想调用评审团拆解
          </Button>
          <Button onClick={onRestart} variant="outline" size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            重新开始
          </Button>
        </div>
      </div>
    </div>
  );
}
