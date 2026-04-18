'use client';

import { useCallback, useEffect, useRef } from 'react';
import { InputPage } from '@/components/InputPage';
import { FactResultPage } from '@/components/FactResultPage';
import { DirectResultPage } from '@/components/DirectResultPage';
import { CompetePage } from '@/components/CompetePage';
import { ReviewPage } from '@/components/ReviewPage';
import { ErrorPage } from '@/components/ErrorPage';
import { Workbench } from '@/components/Workbench';
import { useGambit } from '@/lib/useGambit';
import { gambitDiverge, gambitSynthesize, gambitInvokeObserver } from '@/lib/gambit-api';
import type { Mode, GambitError, DecisionResult } from '@/lib/types';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const gambit = useGambit();
  const { state } = gambit;
  
  // 防止 API 重复调用的 ref
  const divergeCalledRef = useRef(false);

  // stage 变成 input 时重置 ref
  useEffect(() => {
    if (state.stage === 'input') {
      divergeCalledRef.current = false;
    }
  }, [state.stage]);

  // 进入 analyzing 立即触发 API，不再等待假进度条
  useEffect(() => {
    if (
      state.stage === 'analyzing' &&
      !divergeCalledRef.current
    ) {
      divergeCalledRef.current = true;
      
      // 直接内联处理，避免闭包问题
      const doDiverge = async () => {
        try {
          const currentLayer = gambit.getCurrentLayer();
          const response = await gambitDiverge({
            userInput: currentLayer?.input || '',
            sessionId: state.sessionId,
            mode: state.mode,
            layer: state.current_depth as 1 | 2,
            skipRouter: state.current_depth === 2,
          });

          gambit.handleDivergeResponse(response);
        } catch (error) {
          console.error('Diverge 失败:', error);
          divergeCalledRef.current = false;  // 重置标记
          gambit.setError({
            code: 'API_ERROR',
            user_message: '请求失败，请重试',
            retryable: true,
          } as GambitError);
        }
      };
      doDiverge();
    }
  }, [state.stage, state.analyzing_progress, state.sessionId, state.mode, state.current_depth, gambit]);

  // 处理分歧请求
  const handleDiverge = useCallback(async () => {
    try {
      const currentLayer = gambit.getCurrentLayer();
      const response = await gambitDiverge({
        userInput: currentLayer?.input || '',
        sessionId: state.sessionId,
        mode: state.mode,
        layer: state.current_depth as 1 | 2,
        skipRouter: state.current_depth === 2,
      });

      gambit.handleDivergeResponse(response);

      // 如果需要自动调用 Observer
      const decisionResult = response as DecisionResult;
      if (
        response.result_type === 'decision' &&
        decisionResult.diff_result?.trigger_observer_auto
      ) {
        try {
          const observerResult = await gambitInvokeObserver(state.sessionId);
          gambit.setObserver(observerResult);
        } catch (e) {
          console.error('Observer 调用失败:', e);
        }
      }
    } catch (error) {
      console.error('Diverge 失败:', error);
      gambit.setError({
        code: 'API_ERROR',
        user_message: '请求失败，请重试',
        retryable: true,
      } as GambitError);
    }
  }, [gambit, state.sessionId, state.mode, state.current_depth]);

  // 处理输入提交
  const handleInputSubmit = useCallback(
    (input: string, mode: Mode) => {
      gambit.setInput(input, mode);
    },
    [gambit]
  );

  // 处理合成（V3.15 完整上下文）
  const handleSynthesize = useCallback(
    async (directCaptain: boolean = false) => {
      gambit.startSynthesizing();
      const currentLayerData = gambit.getCurrentLayer();

      try {
        const user_choice = {
          selected_claim_id: directCaptain ? undefined : state.selected_claim_id,
          direct_captain: directCaptain,
        };

        const result = await gambitSynthesize({
          sessionId: state.sessionId,
          user_choice,
          user_thoughts: state.user_thoughts,
          // V3.15 完整上下文
          goal: currentLayerData?.task_package?.goal,
          constraints: currentLayerData?.task_package?.constraints,
          core_tension: currentLayerData?.core_tension,
          claims: currentLayerData?.claims,
          briefing: currentLayerData?.briefing,
          diff_state: currentLayerData?.diff_result?.state,
          blindspot: currentLayerData?.blindspot,
          observer: currentLayerData?.observer,
        });

        gambit.setFinalOutput(result);
      } catch (error) {
        console.error('Synthesize 失败:', error);
        // 合成失败，返回审阅台
        gambit.updateState({ stage: 'disagreement' });
      }
    },
    [gambit, state.sessionId, state.selected_claim_id, state.user_thoughts]
  );

  // 处理重试
  const handleRetry = useCallback(() => {
    gambit.retry();
    handleDiverge();
  }, [gambit, handleDiverge]);

  // 获取当前层数据
  const currentLayer = gambit.getCurrentLayer();

  // 根据 stage 渲染不同页面
  const renderPage = () => {
    switch (state.stage) {
      case 'input':
        return <InputPage onSubmit={handleInputSubmit} isLoading={false} />;

      case 'analyzing':
        // 直接进入审阅台骨架态，不再显示过渡页
        return (
          <div className="min-h-screen bg-background flex flex-col">
            <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b z-50">
              <div className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => gambit.updateState({ stage: 'input' })}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← 返回
                  </button>
                  <span className="text-lg font-bold tracking-tight">决策模式</span>
                  <span className="text-xs text-primary animate-pulse">三方 Agent 正在生成...</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => gambit.resetSession()} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              </div>
            </header>
            <div className="flex-1 p-4">
              <Workbench
                input={currentLayer?.input || ''}
                mode={state.mode}
                layer={state.current_depth}
                coreTension=""
                diffResult={{
                  state: '弱共识',
                  consensus_summary: '',
                  trigger_blindspot: false,
                  trigger_observer_auto: false,
                  avg_sim: 0,
                  max_sim: 0,
                  min_sim: 0,
                  pairwise: [],
                }}
                claims={[]}
                briefing={undefined}
                blindspot={undefined}
                observer={undefined}
                selectedClaimId={undefined}
                userThoughts={state.user_thoughts}
                finalOutput={undefined}
                isStale={false}
                isSynthesizing={false}
                isLoading={true}
                onSelectClaim={() => {}}
                onUserThoughtsChange={gambit.setUserThoughts}
                onSynthesize={() => {}}
                onCaptainDecide={() => {}}
              />
            </div>
          </div>
        );

      case 'fact_result':
        return (
          <FactResultPage
            answer="这是一个事实查询的结果。"
            strategicHint="这个问题背后如果有决策要做（比如基于这个事实规划下一步），我可以帮你调用评审团来拆解。"
            onForceDecision={() => {
              // 强制进入决策模式
              handleInputSubmit(
                currentLayer?.input || '',
                state.mode
              );
            }}
            onRestart={gambit.resetSession}
          />
        );

      case 'direct_result':
        return currentLayer?.direct_result ? (
          <DirectResultPage
            input={currentLayer.input}
            result={currentLayer.direct_result}
            onRestart={gambit.resetSession}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        ) : (
          <ErrorPage
            error={{ code: 'NO_DATA', user_message: 'direct 数据缺失', retryable: true }}
            onRetry={handleRetry}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        );

      case 'compete_stage1':
      case 'compete_stage2':
        return currentLayer?.compete_result ? (
          <CompetePage
            input={currentLayer.input}
            result={currentLayer.compete_result}
            onRestart={gambit.resetSession}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        ) : (
          <ErrorPage
            error={{ code: 'NO_DATA', user_message: 'compete 数据缺失', retryable: true }}
            onRetry={handleRetry}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        );

      case 'review_stage1':
      case 'review_stage2':
        return currentLayer?.review_result ? (
          <ReviewPage
            input={currentLayer.input}
            result={currentLayer.review_result}
            onRestart={gambit.resetSession}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        ) : (
          <ErrorPage
            error={{ code: 'NO_DATA', user_message: 'review 数据缺失', retryable: true }}
            onRetry={handleRetry}
            onGoBack={() => gambit.updateState({ stage: 'input' })}
          />
        );

      case 'disagreement':
        return (
          <div className="min-h-screen bg-background flex flex-col">
            {/* 顶部导航栏 */}
            <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b z-50">
              <div className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => gambit.updateState({ stage: 'input' })}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← 返回
                  </button>
                  <span className="text-lg font-bold tracking-tight">
                    决策模式
                  </span>
                  <span className="text-xs text-muted-foreground">AI 们正在争论...</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => gambit.resetSession()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              </div>
            </header>
            <div className="flex-1 p-4">
            <Workbench
              input={currentLayer?.input || ''}
              mode={state.mode}
              layer={state.current_depth}
              coreTension={currentLayer?.core_tension || ''}
              diffResult={
                currentLayer?.diff_result || {
                  state: '弱共识',
                  consensus_summary: '正在分析...',
                  trigger_blindspot: false,
                  trigger_observer_auto: false,
                  avg_sim: 0,
                  max_sim: 0,
                  min_sim: 0,
                  pairwise: [],
                }
              }
              claims={currentLayer?.claims || []}
              briefing={currentLayer?.briefing}
              blindspot={currentLayer?.blindspot}
              observer={currentLayer?.observer}
              selectedClaimId={state.selected_claim_id}
              userThoughts={state.user_thoughts}
              finalOutput={state.final_output}
              isStale={state.final_output_stale}
              isSynthesizing={false}
              onSelectClaim={gambit.selectClaim}
              onUserThoughtsChange={gambit.setUserThoughts}
              onSynthesize={() => handleSynthesize(false)}
              onCaptainDecide={() => handleSynthesize(true)}
              onOpenCompete={() => alert('一键比稿：Step 2.6 接入 /compete-expand')}
              onOpenReview={() => {
                const target = window.prompt('请粘贴要审阅的文本：');
                if (target && target.trim()) {
                  alert('已接收审稿目标（前 80 字）：\n' + target.slice(0, 80) + '\n\nStep 2.6 将接入 /review-apply');
                }
              }}
            />
            </div>
          </div>
        );

      case 'synthesizing':
        return (
          <div className="min-h-screen bg-background flex flex-col">
            {/* 顶部导航栏 */}
            <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b z-50">
              <div className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => gambit.updateState({ stage: 'input' })}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← 返回
                  </button>
                  <span className="text-lg font-bold tracking-tight">
                    决策模式
                  </span>
                  <span className="text-xs text-primary animate-pulse">正在生成最终稿...</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => gambit.resetSession()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              </div>
            </header>
            <div className="flex-1 p-4">
            <Workbench
              input={currentLayer?.input || ''}
              mode={state.mode}
              layer={state.current_depth}
              coreTension={currentLayer?.core_tension || ''}
              diffResult={
                currentLayer?.diff_result || {
                  state: '弱共识',
                  consensus_summary: '',
                  trigger_blindspot: false,
                  trigger_observer_auto: false,
                  avg_sim: 0,
                  max_sim: 0,
                  min_sim: 0,
                  pairwise: [],
                }
              }
              claims={currentLayer?.claims || []}
              briefing={currentLayer?.briefing}
              blindspot={currentLayer?.blindspot}
              observer={currentLayer?.observer}
              selectedClaimId={state.selected_claim_id}
              userThoughts={state.user_thoughts}
              finalOutput={state.final_output}
              isStale={state.final_output_stale}
              isSynthesizing={true}
              onSelectClaim={gambit.selectClaim}
              onUserThoughtsChange={gambit.setUserThoughts}
              onSynthesize={() => {}}
              onCaptainDecide={() => {}}
            />
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="min-h-screen bg-background flex flex-col">
            {/* 顶部导航栏 */}
            <header className="shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b z-50">
              <div className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => gambit.updateState({ stage: 'input' })}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← 返回
                  </button>
                  <span className="text-lg font-bold tracking-tight">
                    决策模式
                  </span>
                  <span className="text-xs text-green-600">✓ 最终稿已生成</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => gambit.resetSession()}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新开始
                </Button>
              </div>
            </header>
            <div className="flex-1 p-4">
            <Workbench
              input={currentLayer?.input || ''}
              mode={state.mode}
              layer={state.current_depth}
              coreTension={currentLayer?.core_tension || ''}
              diffResult={
                currentLayer?.diff_result || {
                  state: '弱共识',
                  consensus_summary: '',
                  trigger_blindspot: false,
                  trigger_observer_auto: false,
                  avg_sim: 0,
                  max_sim: 0,
                  min_sim: 0,
                  pairwise: [],
                }
              }
              claims={currentLayer?.claims || []}
              briefing={currentLayer?.briefing}
              blindspot={currentLayer?.blindspot}
              observer={currentLayer?.observer}
              selectedClaimId={state.selected_claim_id}
              userThoughts={state.user_thoughts}
              finalOutput={state.final_output}
              isStale={state.final_output_stale}
              isSynthesizing={false}
              isComplete={true}
              showNextLayer={
                currentLayer?.route === 'decision' &&
                state.current_depth === 1
              }
              onSelectClaim={gambit.selectClaim}
              onUserThoughtsChange={gambit.setUserThoughts}
              onSynthesize={() => {}}
              onCaptainDecide={() => {}}
              onRestart={gambit.resetSession}
              onGoToNextLayer={() => {
                const nextInput = `${currentLayer?.input}\n\n基于以上分析，请提供更详细的执行路径和落地细节。`;
                gambit.goToNextLayer(nextInput);
              }}
            />
            </div>
          </div>
        );

      case 'error':
        return (
          <ErrorPage
            error={state.error}
            onRetry={handleRetry}
            onGoBack={() => {
              // 返回输入页，保留内容
              gambit.updateState({ stage: 'input' });
            }}
            preservedInput={currentLayer?.input}
          />
        );

      default:
        return <InputPage onSubmit={handleInputSubmit} isLoading={false} />;
    }
  };

  return <div className="min-h-screen">{renderPage()}</div>;
}
