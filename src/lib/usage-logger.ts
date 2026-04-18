// ============================================================================
// 调用量埋点
// ============================================================================
// P0：只写本地日志，不做任何计费逻辑
// P3：对接计费系统，支持按 userId 出账
// ============================================================================

export interface UsageRecord {
  userId: string;
  model: string;
  channel: 'coze' | 'relay';
  feature: string;
  tokens: number;
  latencyMs: number;
  timestamp: string;
}

export async function logUsage(record: UsageRecord): Promise<void> {
  // P0：简单 console，后续可换成持久化
  // 扣子运行时环境没有本地文件系统持久化保障，先用 console
  if (process.env.NODE_ENV !== 'production' || process.env.LOG_USAGE === '1') {
    console.log('[USAGE]', JSON.stringify(record));
  }
}

// ============================================================================
// 额度检查（P2 洞察官启用前必须实现）
// ============================================================================

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
}

export async function checkQuota(_userId: string, _feature: string): Promise<QuotaCheckResult> {
  // TODO(P2)：实现每日额度检查
  // 洞察官：免费用户每日 3 次，付费无限
  return { allowed: true, remaining: 999 };
}
