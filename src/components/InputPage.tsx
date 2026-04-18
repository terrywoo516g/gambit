'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Lightbulb, FileCheck, GitCompare, Grid3X3, Loader2 } from 'lucide-react';
import type { Mode } from '@/lib/types';

interface InputPageProps {
  onSubmit: (input: string, mode: Mode) => void;
  isLoading: boolean;
}

const MODE_OPTIONS = [
  {
    value: 'solve' as Mode,
    title: '求解',
    icon: Lightbulb,
    available: true,
  },
  {
    value: 'review' as Mode,
    title: '审稿',
    icon: FileCheck,
    available: true,
  },
  {
    value: 'compare' as Mode,
    title: '比较',
    icon: GitCompare,
    available: false,
  },
  {
    value: 'pick' as Mode,
    title: '选案',
    icon: Grid3X3,
    available: false,
  },
];

export function InputPage({ onSubmit, isLoading }: InputPageProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('solve');

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSubmit(input.trim(), mode);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleModeClick = (available: boolean) => {
    if (available && !isLoading) {
      // Find the available mode and set it
      const availableMode = MODE_OPTIONS.find(m => m.available);
      if (availableMode) {
        setMode(availableMode.value);
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 工业图纸背景 */}
      <div className="absolute inset-0 bg-background">
        {/* 点阵网格 */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" className="text-muted-foreground" />
            </pattern>
            <pattern id="gridPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/50" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotPattern)" />
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>

        {/* 左侧标注 */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/40 font-mono rotate-[-90deg] origin-center whitespace-nowrap">
          SECTION A-A
        </div>

        {/* 右侧标注 */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/40 font-mono rotate-[90deg] origin-center whitespace-nowrap">
          DETAIL B
        </div>

        {/* 顶部标注线 */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <div className="w-24 h-px bg-muted-foreground/20"></div>
          <span className="text-xs text-muted-foreground/40 font-mono">GAMBIT-v2.1</span>
          <div className="w-24 h-px bg-muted-foreground/20"></div>
        </div>

        {/* 底部标注线 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <div className="w-32 h-px bg-muted-foreground/20"></div>
          <span className="text-xs text-muted-foreground/40 font-mono">REV:03</span>
          <div className="w-32 h-px bg-muted-foreground/20"></div>
        </div>
      </div>

      {/* 内容层 */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-12 text-center">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2Fimage-1775846861018.png&nonce=385abac2-2d7b-4b2f-bf6b-df70cfcc107b&project_id=7628659738854637583&sign=88660a235db2e033ee8f64b4f12e26b4a8a67590f1ee119c1746d99a4e32e48f"
                alt="Gambit Logo"
                width={120}
                height={120}
                className="rounded-xl aspect-square"
              style={{ width: '120px', height: 'auto' }}
                priority
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Gambit</h1>
            <p className="text-lg text-muted-foreground mb-1">国王的选择</p>
            {/* 副标题 */}
            <p className="text-sm text-muted-foreground/70 text-center">
              重要决定，不该只听一个 AI 的
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center px-4 pb-12">
          <div className="w-full max-w-2xl space-y-8">
            {/* 模式选择 - 胶囊式标签 */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = mode === option.value && option.available;
                return (
                  <button
                    key={option.value}
                    onClick={() => option.available ? setMode(option.value) : handleModeClick(option.available)}
                    disabled={isLoading || !option.available}
                    className={`
                      inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                      ${option.available
                        ? isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                      }
                      ${isLoading ? 'opacity-50' : ''}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{option.title}</span>
                    {!option.available && (
                      <span className="text-xs opacity-70">待开发</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 输入区域 */}
            <div className="space-y-4">
              <div className="text-left pl-4 border-l-4 border-primary">
                <span className="text-base font-semibold text-foreground">你的决策或问题</span>
              </div>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="直接输入你想解决的问题或决策"
                className="min-h-[180px] text-sm resize-none border-2 border-muted-foreground/20 focus:border-primary/50 rounded-xl text-left"
                disabled={isLoading}
              />
              <div className="text-left">
                <span className="text-sm text-muted-foreground/60 cursor-pointer hover:text-muted-foreground/80 transition-colors">
                  + 添加补充内容（可选）
                </span>
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="rounded-full px-10 py-6 text-base shadow-lg bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    评审团准备中...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    开始生成分歧
                  </>
                )}
              </Button>
            </div>

            {/* 底部提示 */}
            <div className="text-center text-xs text-muted-foreground/50 space-y-1 pt-4">
              <p>把AI的决策过程变成你能介入的选择题</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
