import type {
  GambitDivergeResponse,
  GambitSynthesizeInput,
  FinalOutput,
  ObserverOutput,
  GambitError,
} from './types';

const API_BASE = '/api/gambit';

// 错误处理
function handleError(response: Response): never {
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json() as never;
}

// 阶段1: 输入 → 获取分歧结果
export async function gambitDiverge(input: {
  userInput: string;
  sessionId: string;
  mode: 'review' | 'solve';
  layer?: 1 | 2;
  skipRouter?: boolean;
  forceDecision?: boolean;
}): Promise<GambitDivergeResponse> {
  const response = await fetch(`${API_BASE}/diverge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      user_message: '请求失败，请重试',
      retryable: true,
    }));
    throw error as GambitError;
  }

  return response.json();
}

// 阶段2: 用户选择 → Captain 合成最终稿
export async function gambitSynthesize(
  input: GambitSynthesizeInput
): Promise<FinalOutput> {
  const response = await fetch(`${API_BASE}/synthesize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'CAPTAIN_TIMEOUT',
      user_message: '合成超时，请重试',
      retryable: true,
    }));
    throw error as GambitError;
  }

  return response.json();
}

// 旁观者意见
export async function gambitInvokeObserver(
  sessionId: string
): Promise<ObserverOutput> {
  const response = await fetch(`${API_BASE}/observer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: 'OBSERVER_ERROR',
      user_message: '旁观者调用失败',
      retryable: true,
    }));
    throw error as GambitError;
  }

  return response.json();
}

// 检查 API 可用性
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
