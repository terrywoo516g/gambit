# Gambit V3.15 工程落地执行单

**文档用途**：供扣子编程基于当前 V2.1 项目结构，升级到 V3.15 架构
**包含内容**：Prompt 微调 + 节点变更 + 工程改造指引

---

## 一、基于测试结果的 Prompt 微调（3处）

以下修改直接应用到 `Gambit V3.15 完整 Prompt 集.md` 中的对应 prompt。

### 1.1 Router Prompt 补充边界澄清

**位置**：Router V3.15 Prompt → 【硬边界规则】之后

**新增内容**：

```
【边界澄清——测试暴露的易混淆场景】

澄清 1：解释类带字数限制仍属 direct
如果用户目标是解释、介绍、说明、总结某个概念，即使附带字数限制（如"用500字解释"），仍优先归为 direct，不是 compete。
compete 是生成可交付作品（文案、邮件、方案），不是知识解释。

澄清 2：多候选版本择优归 compete
如果用户提供多个标题/文案/邮件/草稿/作品版本，并询问"哪个好/选哪个/帮我挑"，优先归为 compete，不是 decision。
decision 是帮用户做人生/业务的取舍权衡，不是帮选最佳文案版本。

澄清 3：翻译准确性判断可归 direct 或 review
"翻译有没有偏差"可以是 direct(high)（用户想要判断结论）或 review（用户想要问题清单）。
优先看用户表述：
- "有没有偏差" → direct(high)
- "帮我检查/审一下" → review
```

**新增 few-shot 示例**（插入到示例 10 后面）：

```
示例 10-A（新增）：
输入："用500字解释区块链的工作原理"
输出：route=direct, complexity=medium, stakes=low
理由：知识解释类，不是生成可交付作品。字数限制不改变任务性质。

示例 10-B（新增）：
输入："这三个slogan哪个好：A.让生活更美好 B.品质源于专注 C.创新引领未来"
输出：route=compete, complexity=medium, stakes=medium, has_material=true
理由：用户提供多个候选版本要择优，是比稿，不是决策。
```

---

### 1.2 Agent Prompt 强化 not_now/why_not_now 必填

**位置**：三个 Agent Prompt（激进/稳健/务实）→ 【输出要求】之后

**新增内容**（三个 Agent 都要加）：

```
【硬约束——必填字段检查】

not_now 和 why_not_now 是必填字段，不允许省略，不允许输出空字符串。

自检规则：输出前逐字段确认以下字段均存在且非空：
- claim_id ✓
- key_action ✓
- thesis ✓
- not_now ✓（必须明确写出"暂不优先做什么"）
- why_not_now ✓（必须解释"为什么现在不优先"）
- rationale ✓
- confidence ✓

如果无法给出 not_now，说明你的方案缺乏锋利度——三个视角不应该在"暂不做什么"上达成一致，请重新思考你这个视角独特的取舍。
```

---

### 1.3 核心张力节点换模型

**变更**：

| 节点 | 原模型 | 新模型 | 理由 |
|------|--------|--------|------|
| core_tension | deepseek-r1-250528 | **glm-5-turbo-260316** | R1 长思考导致超时，核心张力不需要深度推理，需要快速抽象提炼 |

**备选模型**（如 glm-5-turbo 仍不稳定）：
- qwen-3-5-plus-260215
- doubao-seed-2-0-lite-260215

**Prompt 本身不变**，只换模型。

---

## 二、节点变更清单

### 2.1 现有节点升级

| 节点 | 变更类型 | 具体变更 |
|------|----------|---------|
| **router** | Prompt 替换 | 升级为 Router V3.15（四分类 + 补充边界澄清） |
| **core_tension** | Prompt 替换 + 换模型 | 使用核心张力 V3.15 prompt + 换成 glm-5-turbo |
| **agent_radical** | Prompt 替换 | 使用激进派 V3.15 prompt（含 not_now/why_not_now） |
| **agent_steady** | Prompt 替换 | 使用稳健派 V3.15 prompt |
| **agent_pragmatic** | Prompt 替换 | 使用务实派 V3.15 prompt |
| **blindspot** | Prompt 替换 | 使用 Blindspot V3.15 prompt（含空值协议） |
| **observer** | Prompt 替换 | 使用 Observer V3.15 prompt（含空值协议） |
| **captain_synthesize** | Prompt 替换 + 重命名 | 重命名为 decision_captain，使用决策 Captain V3.15 prompt |

### 2.2 新增节点（决策通路）

| 节点 | 模型 | Prompt 来源 | 说明 |
|------|------|-------------|------|
| **briefing** | glm-5-turbo-260316 | 局势简报 V3.15 | 在 diff_engine 之后、workbench 之前新增 |

### 2.3 新增节点（审查通路）

| 节点 | 模型 | Prompt 来源 |
|------|------|-------------|
| **review_logic** | kimi-k2-5-260127 | 审查：逻辑视角 V3.15 |
| **review_audience** | glm-5-0-260211 | 审查：受众视角 V3.15 |
| **review_risk** | deepseek-v3-2-251201 | 审查：风险视角 V3.15 |
| **review_summary** | glm-5-turbo-260316 | 审查汇总 V3.15 |
| **review_captain** | deepseek-r1-250528 | 审查 Captain V3.15 |

### 2.4 新增节点（比稿通路）

| 节点 | 模型 | Prompt 来源 |
|------|------|-------------|
| **compete_gen_a** | kimi-k2-5-260127 | 无特殊 prompt，直接执行用户创作需求 |
| **compete_gen_b** | glm-5-0-260211 | 同上 |
| **compete_gen_c** | deepseek-v3-2-251201 | 同上 |
| **compete_review** | glm-5-turbo-260316 | 比稿：交叉评审 V3.15 |
| **compete_captain** | deepseek-r1-250528 | 比稿：Captain 合成 V3.15 |

### 2.5 新增节点（直通通路）

| 节点 | 模型 | Prompt 来源 | 触发条件 |
|------|------|-------------|---------|
| **direct_single** | 按 Router 分配 | 无特殊 prompt | complexity=low 且 stakes≠high |
| **direct_gen_a/b/c** | 三个异源模型 | 无特殊 prompt | complexity=high 或 stakes=high |
| **direct_captain** | deepseek-r1-250528 | 直通 Captain V3.15 | 三模型合成时 |

---

## 三、工作流连接关系

### 3.1 入口分流（Router）

```
用户输入
    ↓
[router_v3]
    ↓
    ├─ route=direct   → 直通通路
    ├─ route=review   → 审查通路
    ├─ route=compete  → 比稿通路
    └─ route=decision → 决策通路
```

### 3.2 决策通路（在 V2.1 基础上新增 briefing）

```
[router_v3] route=decision
    ↓
[core_tension] ← 换模型为 glm-5-turbo
    ↓
[agent_radical] ─┐
[agent_steady]  ├─ 并行执行
[agent_pragmatic]┘
    ↓
[diff_engine] HTTP POST /diff
    ↓
    ├─ trigger_blindspot=true → [blindspot]
    │
[briefing] ← 新增节点
    ↓
[审阅台/Workbench] ← 展示 briefing 内容
    ↓ 用户选择卡 or 直接点 Captain
[decision_captain]
    ↓
最终稿输出
```

### 3.3 审查通路（新增）

```
[router_v3] route=review
    ↓
[review_logic]    ─┐
[review_audience] ├─ 并行执行
[review_risk]     ─┘
    ↓
[review_summary]
    ↓
[review_captain]
    ↓
审查报告输出（Markdown）
```

### 3.4 比稿通路（新增）

```
[router_v3] route=compete
    ↓
    ├─ has_material=true → 跳过生成，直接用用户素材
    │
[compete_gen_a] ─┐
[compete_gen_b] ├─ 并行执行（无素材时）
[compete_gen_c] ─┘
    ↓
[compete_review] 交叉评审
    ↓
[compete_captain] 合成
    ↓
最终稿输出（正文 + 融合说明）
```

### 3.5 直通通路（新增）

```
[router_v3] route=direct
    ↓
    ├─ complexity=low 且 stakes≠high
    │     ↓
    │  [direct_single] 单模型直答
    │     ↓
    │  直接输出
    │
    └─ complexity=high 或 stakes=high
          ↓
       [direct_gen_a] ─┐
       [direct_gen_b] ├─ 并行执行
       [direct_gen_c] ─┘
          ↓
       [direct_captain] 合成
          ↓
       输出（含保守提示 if stakes=high）
```

---

## 四、输出 Schema 变更

### 4.1 Router 输出（替换旧结构）

```typescript
// 旧结构（废弃）
interface OldRouterOutput {
  type: 'fact' | 'decision';
  confidence: number;
  answer?: string;
  task_package?: TaskPackage;
}

// 新结构
interface RouterOutput {
  route: 'direct' | 'review' | 'compete' | 'decision';
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  stakes: 'low' | 'medium' | 'high';
  review_subtype: 'content' | 'info' | 'none';
  task_summary: string;
  has_material: boolean;
  material_kind: 'none' | 'text';
  task_package: {
    goal: string;
    constraints: string[];
    materials: string;
    missing: string[];
  };
}
```

### 4.2 Agent Claim 输出（新增字段）

```typescript
interface AgentClaim {
  claim_id: string;
  key_action: string;
  thesis: string;
  not_now: string;        // 新增
  why_not_now: string;    // 新增
  rationale: string[];
  assumptions: string[];
  risks: string[];
  what_would_change_my_mind: string[];
  action_steps: string[];
  confidence: number;
  alternative: string;
}
```

### 4.3 Briefing 输出（新增）

```typescript
interface BriefingOutput {
  common_ground: string[];  // 可为空数组
  key_differences: {
    dimension: string;
    radical: string;
    steady: string;
    pragmatic: string;
  }[];
  king_question: string;    // 必须是选择题格式
  quick_take: string;       // 40-60字
}
```

### 4.4 审查相关输出（新增）

```typescript
interface ReviewIssue {
  title: string;
  severity: 'high' | 'medium' | 'low';
  evidence: string;
  explanation: string;
  suggestion: string;
}

interface ReviewAgentOutput {
  perspective: 'logic' | 'audience' | 'risk';
  issues: ReviewIssue[];
  overall_assessment: string;
}

interface ReviewSummaryOutput {
  consensus_issues: {
    issue: ReviewIssue;
    detected_by: string[];  // 统一为数组
  }[];
  unique_issues: {
    issue: ReviewIssue;
    detected_by: string[];  // 统一为数组
  }[];
  conflicts: [];  // 通常为空，不硬造
  overall_verdict: string;
}
```

### 4.5 比稿相关输出（新增）

```typescript
interface CompeteReviewOutput {
  version_summaries: {
    version: 'A' | 'B' | 'C';
    label: string;
    top_strength: string;
    top_weakness: string;
  }[];
  key_differences: {
    dimension: string;
    version_a: string;
    version_b: string;
    version_c: string;
  }[];
  recommended_base: 'A' | 'B' | 'C';
  recommendation_reason: string;
}

// compete_captain 输出为 Markdown 字符串，结构：
// [正文]
// ---
// **融合说明：**
// - ...
```

---

## 五、API 路由改造

### 5.1 保留不变

| 路由 | 用途 |
|------|------|
| `/api/gambit/observer` | 触发旁观者（决策通路） |
| `/api/gambit/health` | 健康检查 |

### 5.2 需要改造

| 路由 | 原用途 | 新用途 |
|------|--------|--------|
| `/api/gambit/diverge` | 触发决策流程 | 改为统一入口，内部按 route 分流 |
| `/api/gambit/synthesize` | 触发 Captain 合成 | 仅用于决策通路第二阶段 |

### 5.3 建议的 /diverge 内部逻辑

```typescript
async function handleDiverge(input: string) {
  // 1. 调用 Router
  const routerResult = await callRouter(input);
  
  // 2. 按 route 分流
  switch (routerResult.route) {
    case 'direct':
      return await handleDirectFlow(routerResult);
    case 'review':
      return await handleReviewFlow(routerResult);
    case 'compete':
      return await handleCompeteFlow(routerResult);
    case 'decision':
      return await handleDecisionFlow(routerResult);
  }
}
```

---

## 六、前端改造要点

### 6.1 Stage 枚举扩展

```typescript
// 原 Stage
type Stage = 'input' | 'analyzing' | 'fact_result' | 'disagreement' | 'synthesizing' | 'complete' | 'error';

// 新 Stage
type Stage = 
  | 'input'
  | 'routing'           // 新增：Router 分流中
  | 'direct_result'     // 新增：直通结果
  | 'review_analyzing'  // 新增：审查分析中
  | 'review_result'     // 新增：审查结果
  | 'compete_analyzing' // 新增：比稿生成中
  | 'compete_result'    // 新增：比稿结果
  | 'decision_analyzing'// 原 analyzing
  | 'decision_workbench'// 原 disagreement
  | 'decision_synthesizing' // 原 synthesizing
  | 'decision_complete' // 原 complete
  | 'error';
```

### 6.2 SessionState 扩展

```typescript
interface SessionState {
  // 新增
  route?: 'direct' | 'review' | 'compete' | 'decision';
  router_result?: RouterOutput;
  
  // 按通路存结果
  direct_result?: string;
  review_result?: {
    summary: ReviewSummaryOutput;
    report: string;  // Markdown
  };
  compete_result?: {
    review: CompeteReviewOutput;
    final: string;  // Markdown
  };
  
  // 决策通路（原有，新增 briefing）
  decision_state?: {
    core_tension?: string;
    claims?: AgentClaimEnvelope[];
    diff_result?: DiffResult;
    blindspot?: BlindspotOutput;
    briefing?: BriefingOutput;  // 新增
    observer?: ObserverOutput;
    final_output?: DecisionFinalOutput;
  };
  
  // 保留
  stage: Stage;
  error?: GambitError;
}
```

### 6.3 页面/组件新增

| 页面 | 对应 Stage | 渲染数据 |
|------|-----------|---------|
| **DirectResultPage** | direct_result | direct_result 字符串 |
| **ReviewResultPage** | review_result | review_result.summary + review_result.report |
| **CompeteResultPage** | compete_result | compete_result.review + compete_result.final |

### 6.4 Workbench 改造（决策通路）

**顶部摘要区改造**：

| 原展示内容 | 新展示内容 |
|-----------|-----------|
| core_tension | core_tension（保留） |
| diff_result.consensus_summary | briefing.quick_take |
| — | briefing.common_ground |
| — | briefing.key_differences |
| — | briefing.king_question |

**立场卡改造**：

每张卡新增展示：
- `not_now`
- `why_not_now`

---

## 七、实施顺序建议

| 阶段 | 内容 | 预计工作量 |
|------|------|-----------|
| **Phase 1** | Router 升级 + 决策通路升级（含 briefing） | 2-3 天 |
| **Phase 2** | 审查通路完整实现 | 1-2 天 |
| **Phase 3** | 比稿通路完整实现 | 2 天 |
| **Phase 4** | 直通通路完整实现 | 0.5 天 |
| **Phase 5** | 前端页面适配 + 测试 | 2-3 天 |

**建议先完成 Phase 1**，因为决策通路是现有主链路，升级后可以立即验证效果。

---

## 八、验收标准

### 8.1 Router 验收

- [ ] 20 个测试 case 通过率 ≥ 90%
- [ ] 边界 case（#15/#16/#17）全部正确
- [ ] 新增边界 case（解释类/多候选择优）正确

### 8.2 决策通路验收

- [ ] 三张卡稳定输出 not_now/why_not_now
- [ ] briefing.king_question 是选择题格式
- [ ] briefing.common_ground 不是空话（或为空数组）
- [ ] decision_captain 能引用 briefing 内容

### 8.3 审查通路验收

- [ ] 三视角 issue title 具体（无"存在问题"等空泛标题）
- [ ] review_summary.conflicts 默认为空数组（不硬造）
- [ ] review_captain 报告每项标注检出来源

### 8.4 比稿通路验收

- [ ] 最终稿正文干净，无括号来源标注
- [ ] 融合说明提到版本来源
- [ ] recommended_base 理由清晰

### 8.5 直通通路验收

- [ ] low complexity + low stakes → 单模型直答
- [ ] high stakes → 三模型合成 + 保守提示

---

## 附录：Prompt 文件清单

所有 Prompt 来源：`Gambit V3.15 完整 Prompt 集.md`

| 节点 | Prompt 文件名 |
|------|--------------|
| router | `prompts/router_v3.15.md`（含本文档补充的边界澄清） |
| core_tension | `prompts/captain_core_tension_v3.15.md` |
| agent_radical | `prompts/agent_radical_v3.15.md`（含本文档补充的必填约束） |
| agent_steady | `prompts/agent_steady_v3.15.md`（含本文档补充的必填约束） |
| agent_pragmatic | `prompts/agent_pragmatic_v3.15.md`（含本文档补充的必填约束） |
| briefing | `prompts/briefing_v3.15.md` |
| blindspot | `prompts/blindspot_v3.15.md` |
| observer | `prompts/observer_v3.15.md` |
| decision_captain | `prompts/decision_captain_v3.15.md` |
| review_logic | `prompts/review_logic_v3.15.md` |
| review_audience | `prompts/review_audience_v3.15.md` |
| review_risk | `prompts/review_risk_v3.15.md` |
| review_summary | `prompts/review_summary_v3.15.md` |
| review_captain | `prompts/review_captain_v3.15.md` |
| compete_review | `prompts/compete_review_v3.15.md` |
| compete_captain | `prompts/compete_captain_v3.15.md` |
| direct_captain | `prompts/direct_captain_v3.15.md` |

---

*执行单版本：V3.15-final*
*生成时间：2026-04-15*
