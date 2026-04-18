// ============================================================================
// V3.15 类型定义
// ============================================================================

// Stage 状态机类型
export type Stage =
  | 'input'
  | 'analyzing'
  | 'fact_result'
  | 'direct_result'      // P1 新增：direct 通路结果页（Markdown）
  | 'compete_stage1'     // P1 新增：compete 三摘要并列
  | 'compete_stage2'     // P1 新增：compete 扩写完整稿
  | 'review_stage1'      // P1 新增：review 分层勾选
  | 'review_stage2'      // P1 新增：review 改后稿
  | 'disagreement'
  | 'synthesizing'
  | 'complete'
  | 'error';

// V3.15 路由类型
export type Route = 'direct' | 'review' | 'compete' | 'decision';

// 复杂度等级
export type Complexity = 'low' | 'medium' | 'high';

// 风险等级
export type Stakes = 'low' | 'medium' | 'high';

// 模式类型（向后兼容）
export type Mode = 'review' | 'solve';
export type Prototype = 'review' | 'solve' | 'select' | 'compare';

// Agent ID 类型
export type AgentId = 'agent_radical' | 'agent_steady' | 'agent_pragmatic' | 'router';

// ============================================================================
// Claim 结构（V3.15 新增 not_now/why_not_now）
// ============================================================================

export interface Claim {
  claim_id: string;
  key_action: string;
  thesis: string;
  not_now: string;          // V3.15 新增：暂不优先做什么
  why_not_now: string;      // V3.15 新增：为什么不现在做
  rationale: string[];
  assumptions: string[];
  risks: string[];
  what_would_change_my_mind: string[];
  action_steps: string[];
  confidence: number;
  alternative: string;
  long_form?: string;       // V3.16 新增：完整自然语言叙事（agent 的"全文"）
}

// Agent 原始输出
export interface AgentClaimEnvelope {
  agent_id: AgentId;
  claims: Claim[];
}

// 前端展示用的 Claim 卡片（V3.15）
export interface ClaimCardViewModel {
  agent_id: AgentId;
  claim_id: string;
  key_action: string;
  not_now: string;          // V3.15 新增
  why_not_now: string;      // V3.15 新增
  persona_label: string;
  thesis: string;
  rationale: string[];
  assumptions: string[];
  risks: string[];
  what_would_change_my_mind: string[];
  action_steps: string[];
  confidence: number;
  alternative: string;
  long_form?: string;       // V3.16 新增：agent 完整自然语言叙事
}

// ============================================================================
// Router V3.15 输出
// ============================================================================

export interface RouterOutput {
  route: Route;
  confidence: number;
  complexity: Complexity;
  stakes: Stakes;
  review_subtype: 'content' | 'info' | 'none';
  task_summary: string;
  has_material: boolean;
  material_kind: 'none' | 'text';
  task_package: TaskPackage;
}

export interface TaskPackage {
  goal: string;
  constraints: string[];
  materials: string;
  missing: string[];
}

// ============================================================================
// Briefing（局势简报）V3.15 新增
// ============================================================================

export interface BriefingOutput {
  common_ground: string;    // 三个 Agent 都认同的要点
  king_question: string;    // 国王的选择题
  key_tradeoff: string;    // 核心取舍
  risk_alert: string;       // 风险提示
}

// ============================================================================
// 分歧状态
// ============================================================================

export type DiffState = '强共识' | '弱共识' | '强分歧' | '伪共识' | '少数派存在';

// 相似度分数
export interface SimilarityPair {
  pair: string;
  key_action_sim: number;
  thesis_sim: number;
  weighted_sim: number;
}

export interface SimilarityScores {
  avg_sim: number;
  max_sim: number;
  min_sim: number;
  pairs: SimilarityPair[];  // 前端使用 pairs
}

// 分歧引擎结果（V3.15 扁平结构）
export interface DiffResult {
  state: DiffState;
  avg_sim: number;
  max_sim: number;
  min_sim: number;
  pairwise: SimilarityPair[];  // API 返回字段名
  normalized_actions?: Record<string, string>;  // V3.15 新增
  consensus_summary: string;
  trigger_blindspot: boolean;
  trigger_observer_auto: boolean;
}

// ============================================================================
// 各通路结果类型
// ============================================================================

// 事实结果
export interface FactResult {
  result_type: 'fact';
  answer: string;
  strategic_hint: string;
}

// Direct 直通结果
export interface DirectResult {
  result_type: 'direct';
  route: 'direct';
  success?: boolean;
  complexity?: Complexity;
  stakes?: Stakes;
  task_summary: string;
  answer?: string;          // Markdown 文本
  model_used?: string;
  error?: string;
}

// Compete 阶段 1：三版本摘要
export interface CompeteDraft {
  style_id: string;
  style_label: string;
  title: string;
  outline: string[];
  style_tag: string;
  failed?: boolean;
}

export interface CompeteResult {
  result_type: 'compete';
  route: 'compete';
  stage: 1;
  success: boolean;
  success_count: number;
  total_count: number;
  drafts: CompeteDraft[];
  task_summary: string;
  next_action?: { endpoint: string; hint: string };
}

// Review 阶段 1：分层选项
export interface ReviewTitleOption {
  option_id: string;
  perspective_id: string;
  perspective_label: string;
  title: string;
  reason: string;
}

export interface ReviewDirectionOption {
  option_id: string;
  perspective_id: string;
  perspective_label: string;
  direction: string;
  reason: string;
}

export interface ReviewContentOption {
  option_id: string;
  perspective_id: string;
  perspective_label: string;
  quote: string;
  issue: string;
  suggestion: string;
}

export interface ReviewResult {
  result_type: 'review';
  route: 'review';
  stage: 1;
  success: boolean;
  success_count: number;
  total_count: number;
  failed_perspectives?: string[];
  review_target: string;
  layers: {
    title_options: ReviewTitleOption[];
    direction_options: ReviewDirectionOption[];
    content_options: ReviewContentOption[];
  };
  layer_visibility: {
    title: boolean;
    direction: boolean;
    content: boolean;
  };
  task_summary: string;
  next_action?: { endpoint: string; hint: string };
}

// 决策结果（V3.15 新增 briefing）
export interface DecisionResult {
  result_type: 'decision';
  depth: 1 | 2;
  route: 'decision';
  core_tension: string;
  claims: ClaimCardViewModel[];
  diff_result: DiffResult;
  blindspot?: BlindspotOutput;
  observer?: ObserverOutput;
  briefing?: BriefingOutput;  // V3.15 新增
  task_package?: TaskPackage;
}

// 分歧 API 响应
export type GambitDivergeResponse = FactResult | DirectResult | ReviewResult | CompeteResult | DecisionResult;

// ============================================================================
// Blindspot 输出
// ============================================================================

export interface BlindspotOutput {
  core_blindspot: string;
  why_blind: string;
  extra_consideration: string;
}

// ============================================================================
// Observer 输出
// ============================================================================

export interface ObserverOutput {
  missed_dimension: string;
  shared_blindspot: string;
  fresh_angle: string;
}

// ============================================================================
// 用户选择
// ============================================================================

export interface UserChoice {
  selected_claim_id?: string;
  direct_captain?: boolean;
}

// ============================================================================
// FinalOutput（最终稿）V3.15
// ============================================================================

export interface FinalOutput {
  selected_persona: string;
  tradeoff_matrix: string;
  core_decision: string;
  reasoning: string;
  conditional_recommendation: string;
  conflict_handling: string;
  risk_warning: string;
  dropped_useful_pieces: string[];
}

// 合成输入（V3.15 完整版）
export interface GambitSynthesizeInput {
  sessionId: string;
  user_choice: UserChoice;
  user_thoughts: string;
  // V3.15 新增：完整上下文
  goal?: string;
  constraints?: string[];
  core_tension?: string;
  claims?: ClaimCardViewModel[];
  briefing?: BriefingOutput;
  diff_state?: string;
  blindspot?: BlindspotOutput;
  observer?: ObserverOutput;
}

// 错误信息
export interface GambitError {
  code: string;
  user_message: string;
  retryable: boolean;
}

// ============================================================================
// 状态管理
// ============================================================================

// 单层状态
export interface LayerState {
  input: string;
  route?: Route;           // V3.15 新增
  task_package?: TaskPackage;
  core_tension?: string;
  claims?: ClaimCardViewModel[];
  diff_result?: DiffResult;
  blindspot?: BlindspotOutput;
  observer?: ObserverOutput;
  briefing?: BriefingOutput;  // V3.15 新增
  // P1 新增：非 decision 路由载荷
  direct_result?: DirectResult;
  compete_result?: CompeteResult;
  review_result?: ReviewResult;
}

// 全局 Session 状态
export interface SessionState {
  sessionId: string;
  mode: Mode;
  current_depth: number;
  layers: LayerState[];
  stage: Stage;
  final_output?: FinalOutput;
  final_output_stale?: boolean;
  user_thoughts: string;
  selected_claim_id?: string;
  error?: GambitError;
  // 分析阶段进度
  analyzing_progress?: {
    radical_done: boolean;
    steady_done: boolean;
    pragmatic_done: boolean;
    briefing_done?: boolean;  // V3.15 新增
  };
}

// 分析步骤
export interface AnalyzingStep {
  id: 'radical' | 'steady' | 'pragmatic' | 'briefing';  // V3.15: reflection → briefing
  label: string;
  status: 'pending' | 'loading' | 'done' | 'error';
}

// ============================================================================
// Agent 配置
// ============================================================================

export interface AgentConfig {
  id: AgentId;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Agent 标识色映射
export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  agent_radical: {
    id: 'agent_radical',
    label: '激进视角',
    icon: 'flame',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    borderColor: 'border-orange-200',
  },
  agent_steady: {
    id: 'agent_steady',
    label: '稳健视角',
    icon: 'shield',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    borderColor: 'border-blue-200',
  },
  agent_pragmatic: {
    id: 'agent_pragmatic',
    label: '务实视角',
    icon: 'target',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    borderColor: 'border-purple-200',
  },
  router: {
    id: 'router',
    label: '直答',
    icon: 'sparkles',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
    borderColor: 'border-green-200',
  },
};

// persona_label 映射
export const PERSONA_LABELS: Record<AgentId, string> = {
  agent_radical: '激进视角',
  agent_steady: '稳健视角',
  agent_pragmatic: '务实视角',
  router: '直答',
};
