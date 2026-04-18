// ============================================================================
// 洞察官（Insight Officer）类型定义
// ============================================================================
// P0：类型预留，API 未实现
// P2：实际启用
// ============================================================================

import type { ClaimCardViewModel, DiffResult, BriefingOutput } from '../types';

export interface InsightRequest {
  userId: string;
  sessionId: string;
  userInput: string;
  coreTension: string;
  claims: ClaimCardViewModel[];
  diffResult: DiffResult;
  briefing?: BriefingOutput;
  userThoughts?: string;
}

export type InsightKind =
  | 'hidden_variable'      // 揭示隐藏变量
  | 'redefine_question'    // 重定义问题
  | 'second_order'         // 二阶效应
  | 'contrarian_reframe';  // 反共识重构

export interface InsightResponse {
  kind: InsightKind;
  insight: string;           // ≤200 字
  quota_remaining: number;   // 当日剩余次数
}

export interface InsightError {
  code:
    | 'QUOTA_EXCEEDED'
    | 'CONTENT_BLOCKED'      // 合规拦截
    | 'MODEL_ERROR'
    | 'INPUT_INVALID';
  user_message: string;
  retryable: boolean;
}
