'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react';
import type { GambitError } from '@/lib/types';

interface ErrorPageProps {
  error: GambitError | undefined;
  onRetry: () => void;
  onGoBack: () => void;
  preservedInput?: string;
}

export function ErrorPage({
  error,
  onRetry,
  onGoBack,
  preservedInput,
}: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 错误图标 */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>

        {/* 标题 */}
        <h2 className="text-xl font-semibold mb-2">评审团遇到了问题</h2>
        <p className="text-muted-foreground mb-6">
          请稍后重试，或返回修改输入
        </p>

        {/* 错误信息 */}
        {error && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground">
              {error.user_message}
            </p>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex flex-col gap-3">
          <Button onClick={onRetry} size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            重试
          </Button>
          <Button onClick={onGoBack} variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回修改
          </Button>
        </div>

        {preservedInput && (
          <p className="text-xs text-muted-foreground/60 mt-6">
            你的输入已保存，可以返回修改
          </p>
        )}
      </div>
    </div>
  );
}
