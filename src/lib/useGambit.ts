import { useState, useCallback } from 'react';
import type {
  SessionState,
  LayerState,
  Mode,
  FinalOutput,
  GambitDivergeResponse,
  GambitError,
  BriefingOutput,
  DecisionResult,
  DirectResult,
  CompeteResult,
  ReviewResult,
  ObserverOutput,
} from './types';

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createInitialState(): SessionState {
  return {
    sessionId: generateSessionId(),
    mode: 'solve',
    current_depth: 1,
    layers: [],
    stage: 'input',
    user_thoughts: '',
  };
}

export function useGambit() {
  const [state, setState] = useState<SessionState>(createInitialState);

  // 更新 session 状态
  const updateState = useCallback((updates: Partial<SessionState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // 设置当前层状态
  const setCurrentLayer = useCallback((updates: Partial<LayerState>) => {
    setState((prev) => {
      const newLayers = [...prev.layers];
      const currentIndex = prev.current_depth - 1;
      newLayers[currentIndex] = {
        ...newLayers[currentIndex],
        ...updates,
      } as LayerState;
      return { ...prev, layers: newLayers };
    });
  }, []);

  // 开始新会话
  const resetSession = useCallback(() => {
    setState(createInitialState());
  }, []);

  // 设置输入
  const setInput = useCallback(
    (userInput: string, mode: Mode) => {
      setState((prev): SessionState => {
        const newState: SessionState = {
          ...prev,
          mode,
          user_thoughts: '',
          selected_claim_id: undefined,
          final_output: undefined,
          final_output_stale: false,
          layers: [
            {
              input: userInput,
            },
          ],
          stage: 'analyzing',
          analyzing_progress: {
            radical_done: false,
            steady_done: false,
            pragmatic_done: false,
            briefing_done: false,
          },
        };
        return newState;
      });
    },
    []
  );

  // 更新分析进度（V3.15）
  const updateAnalyzingProgress = useCallback(
    (
      key: 'radical_done' | 'steady_done' | 'pragmatic_done' | 'briefing_done'
    ) => {
      setState((prev) => ({
        ...prev,
        analyzing_progress: {
          radical_done: prev.analyzing_progress?.radical_done ?? false,
          steady_done: prev.analyzing_progress?.steady_done ?? false,
          pragmatic_done: prev.analyzing_progress?.pragmatic_done ?? false,
          briefing_done: prev.analyzing_progress?.briefing_done ?? false,
          [key]: true,
        },
      }));
    },
    []
  );

  // 处理分歧响应（V3.15 适配）- 不依赖外部 state
  const handleDivergeResponse = useCallback(
    (response: GambitDivergeResponse) => {
      if (response.result_type === 'fact') {
        setState((prev) => ({
          ...prev,
          stage: 'fact_result',
          analyzing_progress: undefined,
        }));
      } else if (response.result_type === 'decision') {
        // V3.15 decision 类型 - 直接使用 response 数据
        const decisionResponse = response as DecisionResult;

        const currentLayer: LayerState = {
          // 从 response 中提取所有必要数据
          // task_package 可能为 null，使用空字符串作为 fallback
          input: decisionResponse.task_package?.goal || '',
          route: decisionResponse.route,
          task_package: decisionResponse.task_package || undefined,
          core_tension: decisionResponse.core_tension,
          claims: decisionResponse.claims,
          diff_result: decisionResponse.diff_result,
          blindspot: decisionResponse.blindspot,
          briefing: decisionResponse.briefing,
        };

        setState((prev): SessionState => {
          const newLayers: LayerState[] = [...prev.layers];
          // 确保 layers 数组足够长
          while (newLayers.length < prev.current_depth) {
            newLayers.push({ input: '' });
          }
          newLayers[prev.current_depth - 1] = currentLayer;
          const newState: SessionState = {
            ...prev,
            stage: 'disagreement',
            analyzing_progress: undefined,
            layers: newLayers,
          };
          return newState;
        });
      } else if (response.result_type === 'direct') {
        // P1 重写：direct 独立渲染，不再塞假 claim
        const directResponse = response as DirectResult;
        setState((prev): SessionState => {
          const newLayers: LayerState[] = [...prev.layers];
          while (newLayers.length < prev.current_depth) {
            newLayers.push({ input: '' });
          }
          const idx = prev.current_depth - 1;
          newLayers[idx] = {
            ...newLayers[idx],
            input: newLayers[idx]?.input || directResponse.task_summary || '',
            route: 'direct',
            direct_result: directResponse,
          };
          return {
            ...prev,
            stage: 'direct_result',
            analyzing_progress: undefined,
            layers: newLayers,
          };
        });
      } else if (response.result_type === 'compete') {
        // P1 新增：compete 阶段 1
        const competeResponse = response as CompeteResult;
        setState((prev): SessionState => {
          const newLayers: LayerState[] = [...prev.layers];
          while (newLayers.length < prev.current_depth) {
            newLayers.push({ input: '' });
          }
          const idx = prev.current_depth - 1;
          newLayers[idx] = {
            ...newLayers[idx],
            input: newLayers[idx]?.input || competeResponse.task_summary || '',
            route: 'compete',
            compete_result: competeResponse,
          };
          return {
            ...prev,
            stage: 'compete_stage1',
            analyzing_progress: undefined,
            layers: newLayers,
          };
        });
      } else if (response.result_type === 'review') {
        // P1 新增：review 阶段 1
        const reviewResponse = response as ReviewResult;
        setState((prev): SessionState => {
          const newLayers: LayerState[] = [...prev.layers];
          while (newLayers.length < prev.current_depth) {
            newLayers.push({ input: '' });
          }
          const idx = prev.current_depth - 1;
          newLayers[idx] = {
            ...newLayers[idx],
            input: newLayers[idx]?.input || reviewResponse.task_summary || '',
            route: 'review',
            review_result: reviewResponse,
          };
          return {
            ...prev,
            stage: 'review_stage1',
            analyzing_progress: undefined,
            layers: newLayers,
          };
        });
      }
    },
    [] // 不依赖外部 state，使用 response 数据
  );

  // 设置错误
  const setError = useCallback((error: GambitError) => {
    setState((prev) => ({
      ...prev,
      stage: 'error',
      error,
      analyzing_progress: undefined,
    }));
  }, []);

  // 选择卡片
  const selectClaim = useCallback((claimId: string | undefined) => {
    setState((prev) => ({
      ...prev,
      selected_claim_id: claimId,
      final_output_stale: claimId !== prev.selected_claim_id ? true : prev.final_output_stale,
    }));
  }, []);

  // 设置用户想法
  const setUserThoughts = useCallback((thoughts: string) => {
    setState((prev) => ({
      ...prev,
      user_thoughts: thoughts,
      final_output_stale: true,
    }));
  }, []);

  // 开始合成
  const startSynthesizing = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: 'synthesizing',
    }));
  }, []);

  // 设置最终稿
  const setFinalOutput = useCallback((output: FinalOutput) => {
    setState((prev) => ({
      ...prev,
      stage: 'complete',
      final_output: output,
      final_output_stale: false,
    }));
  }, []);

  // 设置旁观者意见
  const setObserver = useCallback((observer: ObserverOutput) => {
    setState((prev) => {
      const newLayers = [...prev.layers];
      const currentIndex = prev.current_depth - 1;
      newLayers[currentIndex] = {
        ...newLayers[currentIndex],
        observer,
      } as LayerState;
      return { ...prev, layers: newLayers };
    });
  }, []);

  // 设置 Briefing（V3.15 新增）
  const setBriefing = useCallback((briefing: BriefingOutput) => {
    setState((prev) => {
      const newLayers = [...prev.layers];
      const currentIndex = prev.current_depth - 1;
      newLayers[currentIndex] = {
        ...newLayers[currentIndex],
        briefing,
      } as LayerState;
      return { ...prev, layers: newLayers };
    });
  }, []);

  // 进入下一层
  const goToNextLayer = useCallback(
    (nextInput: string) => {
      setState((prev) => ({
        ...prev,
        current_depth: prev.current_depth + 1,
        layers: [
          ...prev.layers,
          {
            input: nextInput,
          },
        ],
        stage: 'analyzing',
        selected_claim_id: undefined,
        final_output: undefined,
        final_output_stale: false,
        user_thoughts: '',
        analyzing_progress: {
          radical_done: false,
          steady_done: false,
          pragmatic_done: false,
          briefing_done: false,
        },
      }));
    },
    []
  );

  // 返回上一层
  const goToPreviousLayer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      current_depth: prev.current_depth - 1,
      selected_claim_id: undefined,
      final_output: undefined,
      final_output_stale: false,
    }));
  }, []);

  // 重试
  const retry = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: 'analyzing',
      error: undefined,
      analyzing_progress: {
        radical_done: false,
        steady_done: false,
        pragmatic_done: false,
        briefing_done: false,
      },
    }));
  }, []);

  // 获取当前层数据
  const getCurrentLayer = useCallback((): LayerState | undefined => {
    return state.layers[state.current_depth - 1];
  }, [state.layers, state.current_depth]);

  return {
    state,
    updateState,
    setCurrentLayer,
    resetSession,
    setInput,
    updateAnalyzingProgress,
    handleDivergeResponse,
    setError,
    selectClaim,
    setUserThoughts,
    startSynthesizing,
    setFinalOutput,
    setObserver,
    setBriefing,
    goToNextLayer,
    goToPreviousLayer,
    retry,
    getCurrentLayer,
  };
}

export type UseGambitReturn = ReturnType<typeof useGambit>;
