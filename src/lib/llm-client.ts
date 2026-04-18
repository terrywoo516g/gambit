// ============================================================================
// 统一大模型调用抽象层
// ============================================================================
// 设计目标：
//   1. 业务代码通过统一接口调用，不直接依赖具体 SDK
//   2. 底层可切换：扣子 SDK（国产）/ 后端中转（海外 Opus 等）
//   3. 自动记录 usage 埋点（为 P3 付费计量预留）
//
// 当前状态：P0 预留接口，底层仍走扣子 SDK
// P2 洞察官功能启用时，接入海外中转通道
// ============================================================================

import { LLMClient as CozeClient, Config } from 'coze-coding-dev-sdk';
import { logUsage } from './usage-logger';

export type Channel = 'coze' | 'relay';

export interface LLMRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  channel?: Channel;
  userId?: string;
  feature?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ============================================================================
// 主入口
// ============================================================================

export async function invokeLLM(
  req: LLMRequest,
  headers?: Record<string, string>
): Promise<LLMResponse> {
  const channel = req.channel || 'coze';
  const start = Date.now();

  let result: LLMResponse;
  try {
    if (channel === 'coze') {
      result = await invokeCoze(req, headers);
    } else if (channel === 'relay') {
      result = await invokeRelay(req);
    } else {
      throw new Error(`Unknown channel: ${channel}`);
    }
  } finally {
    // 后续可以把错误也记进 usage
  }

  // 埋点（失败不影响主流程）
  logUsage({
    userId: req.userId || 'anonymous',
    model: req.model,
    channel,
    feature: req.feature || 'unknown',
    tokens: result.usage?.total_tokens || 0,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return result;
}

// ============================================================================
// 通道 1：扣子 SDK（国产模型）
// ============================================================================

async function invokeCoze(
  req: LLMRequest,
  headers?: Record<string, string>
): Promise<LLMResponse> {
  const config = new Config({ timeout: 20000 });
  const client = new CozeClient(config, headers);

  const result = await client.invoke(
    req.messages,
    { model: req.model, temperature: req.temperature ?? 0.7 }
  );

  return {
    content: result.content,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usage: (result as any).usage,
  };
}

// ============================================================================
// 通道 2：后端中转（海外模型，P2 阶段启用）
// ============================================================================

async function invokeRelay(_req: LLMRequest): Promise<LLMResponse> {
  // TODO(P2)：实现中转调用
  // - 从环境变量读取中转站 endpoint 和 key
  // - 前端绝不暴露 API key，所有调用必须从 server route 发起
  // - 失败时降级到 Coze 通道
  throw new Error('Relay channel not implemented until P2');
}
