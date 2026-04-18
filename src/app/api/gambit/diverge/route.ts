import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { invokeLLM } from '@/lib/llm-client';

// ============================================================================
// 类型定义
// ============================================================================

interface Claim {
  claim_id: string;
  key_action: string;
  thesis: string;
  not_now: string;
  why_not_now: string;
  rationale: string[];
  assumptions: string[];
  risks: string[];
  what_would_change_my_mind: string[];
  action_steps: string[];
  confidence: number;
  alternative: string;
}

interface AgentClaim {
  agent_id: string;
  claims: Claim[];
}

// Router V3.15 输出
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

// Briefing 输出
interface BriefingOutput {
  common_ground: string;
  king_question: string;
  key_tradeoff: string;
  risk_alert: string;
}

// 分歧引擎结果
interface DiffResult {
  state: string;
  consensus_summary: string;
  trigger_blindspot: boolean;
  trigger_observer_auto: boolean;
  similarity_scores: {
    avg_sim: number;
    max_sim: number;
    min_sim: number;
    pairs: Array<{
      pair: string;
      key_action_sim: number;
      thesis_sim: number;
      weighted_sim: number;
    }>;
  };
}

// ============================================================================
// Agent 配置 - 异源部署
// ============================================================================

// 豆包统一兜底模型（扣子内最稳定）
const FALLBACK_MODEL = 'doubao-seed-2-0-lite-260215';

const AGENTS = [
  {
    id: 'agent_radical',
    model: 'kimi-k2-5-260127',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.6,
    persona: '激进派',
    personaCore: '你追求速度、增长、颠覆。"先跑起来再说"，不完美的快比完美的慢强。警惕过度分析、风险厌恶、温水煮青蛙。不怕激进但不鲁莽——要"高风险高回报里 ROI 最高的"。',
    prefix: 'A',
  },
  {
    id: 'agent_steady',
    model: 'glm-5-0-260211',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.7,
    persona: '稳健派',
    personaCore: '你追求确定性、可持续、抗风险。"活下来才有明天"，ROI≠最终回报。警惕速胜逻辑、爆款幻想、赌徒思维。不反对增长，要"可控风险下的稳定增长"。',
    prefix: 'B',
  },
  {
    id: 'agent_pragmatic',
    model: 'deepseek-v3-2-251201',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.7,
    persona: '务实派',
    personaCore: '你追求可执行、投入产出比、资源匹配。"方案再好做不出来等于零"。警惕纸上谈兵、资源错配、理想主义。不站激进或稳健，站"当前资源下最能落地的"。',
    prefix: 'C',
  },
  // P0 预留：付费版解锁的 3 个 Agent（公测前最终定）
  // {
  //   id: 'agent_longterm',    persona: '长期派',   model: 'xxx', fallbackModel: FALLBACK_MODEL, ...
  // },
  // {
  //   id: 'agent_contrarian',  persona: '逆向派',   model: 'xxx', fallbackModel: FALLBACK_MODEL, ...
  // },
  // {
  //   id: 'agent_user',        persona: '用户派',   model: 'xxx', fallbackModel: FALLBACK_MODEL, ...
  // },
];

// ============================================================================
// Router V3.15 Prompt（含边界澄清补充）
// ============================================================================

function buildRouterPrompt(userInput: string) {
  return `你是 Gambit 的 Router，只做一件事：判断用户输入是否是【纯事实查询/确定性转换】。

【两条通路定义】

1. direct（直通）：用户要的是**有唯一正确答案**的信息。典型如：
   - "今天几点"、"1+1=?"、"Python 怎么读 CSV"、"把这段话翻译成英文"
   - "介绍一下 RAG 的原理"、"React Hooks 是什么"
   - 解释/介绍/翻译/查询/计算/格式转换类任务
2. decision（决策）：所有其他情况——包括但不限于权衡、取舍、选择、调研、比较、开放性问题、"要不要/该不该/怎么选"、多对象对比、生成文案、审阅文本等等。

【判断原则——简单粗暴】

- 能一句话给出**唯一正确答案**的 → direct
- 需要分析、讨论、列利弊、多视角的 → decision
- **拿不准时一律走 decision**（宁可多跑 3 个 agent，也不要把需要讨论的问题糊弄成一句答案）

【示例】

✅ direct：
- "Python 怎么读 CSV 文件"
- "把这段话翻译成英文：今天天气很好"
- "介绍一下 Next.js App Router"
- "RAG 是什么"
- "用 500 字解释区块链原理"

✅ decision：
- "该不该现在换工作"
- "了解市面上性价比高的舆情监控产品，为选择提供参考"（调研+决策辅助）
- "团队 3 人，Q3 做增长还是商业化"
- "帮我写一篇咖啡店周年庆推文"（生成类，走决策让多视角给候选）
- "审一下这段文案：[文本]"（审阅类，走决策让多视角给意见）
- "国产和海外 AI 的差距"（对比权衡）
- "梳理一下私募行业现状"（调研性开放问题）

注意：原本会走 compete/review 的情形（生成文案、审阅文本）现在**全部归 decision**，由用户在审阅台里主动触发比稿/审稿子功能。Router 不再做这类分类。

【task_package 提取原则】
- constraints 只提取用户明确表达的内容，没有就 []
- materials 只在用户明确粘了素材时填，没有就 ""
- 不要脑补，宁可空数组也不要编造

【输出：严格 JSON，不要 \`\`\`json 包裹，不要前后多余文字】

{
  "route": "direct|decision",
  "confidence": 0.9,
  "complexity": "low|medium|high",
  "stakes": "low|medium|high",
  "review_subtype": "none",
  "task_summary": "一句话描述用户要做什么",
  "has_material": false,
  "material_kind": "none|text",
  "task_package": {
    "goal": "用户的核心目标",
    "constraints": [],
    "materials": "",
    "missing": []
  }
}

【用户输入】
${userInput}`;
}

// ============================================================================
// 核心张力 V3.15 Prompt
// ============================================================================

function buildCoreTensionPrompt(goal: string, constraints: string[], materials: string, userInput: string) {
  return `你是 Gambit 的 Captain。在 Agent 发言之前，先定义这个问题的核心张力。

【任务】
用一句话描述这个决策问题的本质矛盾

格式："核心张力: X vs Y vs Z"

X/Y/Z 是 2-3 个互相拉扯的核心维度（不是综合/平衡/优化这种空话，而是具体对立的目标或约束）。
这个张力定义将传递给 3 个 Agent 和分歧引擎，确保所有人在同一坐标系下辩论。

【核心张力要求】
- 必须具体，不能用"综合"、"平衡"、"优化"等万能词
- 必须体现"取舍"，不是"既要又要"
- 如果问题确实简单，输出"单一维度"即可

【约束条件】
${constraints.length > 0 ? constraints.join(', ') : '（无明确约束）'}

【素材】
${materials || '（无素材）'}

【用户原始输入】
${userInput}

【输出：严格只输出一句话，不要多余解释，不要 JSON 包裹】
核心张力: ...`;
}

// ============================================================================
// 三个 Agent V3.15 Prompt（含 not_now/why_not_now 必填约束）
// ============================================================================

function buildAgentPrompt(
  agent: typeof AGENTS[0],
  coreTension: string,
  goal: string,
  constraints: string[],
  materials: string,
  userInput: string
) {
  const personaFocusMap = {
    agent_radical: '更快见效的路径?最激进的打法?慢就是死。',
    agent_steady: '最稳妥路径?怎么留退路?单点失败还能活吗?',
    agent_pragmatic: '现有资源下最可行的?砍掉"理论对但做不到"的。',
  };

  return `你是 Gambit 评审团的【${agent.persona}】视角。

【核心人格】
${agent.personaCore}

【关注点】
${personaFocusMap[agent.id as keyof typeof personaFocusMap]}

【核心张力】
${coreTension}

【用户原始问题】（最高优先级——你的输出必须围绕这个问题展开）
${userInput}

【Router 提取的任务包】（仅供参考）
目标: ${goal}
约束: ${constraints.length > 0 ? constraints.join(', ') : '（无明确约束）'}
素材: ${materials || '（无素材）'}

【重要锚定规则】
- 你的输出内容必须紧扣【用户原始问题】的主题与范围
- 如果【Router 提取的任务包】的 goal 与【用户原始问题】有出入或偏离主题，以【用户原始问题】为准
- 不要脑补用户没有问的话题（如用户问"了解X"，就不要擅自转为"如何商业化X"）
- 先理解用户真正在问什么，再从你的视角给出立场

【你的任务】
产出 1 个主 claim，从你的视角给出独特的立场和建议。

【claim 字段说明】
- key_action: 核心动作（≤15字，必须是具体动作主张，不是原则）
  - 必须是**行动主张**，能让用户**不读正文就知道这个方案在建议什么**
  - 格式：动词开头，≤15字
  - 禁止："在XX场景上做XX"（太绕）、"XX视角下的XX"（没有主张）
  - 示例对比：
    - ❌ "押注长链推理场景"
    - ✅ "All in 金融建模，48小时出标杆"
- thesis: 核心主张（一句话，立场鲜明）
- not_now: 暂不优先做什么（≤15字，必须明确）
- why_not_now: 为什么现在不优先（≤15字，解释原因）
- rationale: 2 条支持理由
- assumptions: 1-2 个关键假设
- risks: 1-2 个核心风险
- what_would_change_my_mind: 条件变化会改变判断
- action_steps: 2-3 步具体执行步骤
- confidence: 0.0-1.0
- alternative: 备选角度摘要（一句话）
- long_form: 完整自然语言叙事（350-500 字），以"我是 ${agent.persona}视角"口吻，把 thesis/rationale/风险/执行步骤/何时换道这些点揉成**一篇行文流畅的小论述**，不要分点、不要标题、不要表格。用户点击卡片"展开完整内容"时看到的就是这段。

【硬约束——必填字段检查】

not_now 和 why_not_now 是必填字段，不允许省略，不允许输出空字符串。

自检规则：输出前逐字段确认以下字段均存在且非空：
- claim_id ✓
- key_action ✓（必须≤15字，动词开头，是行动主张）
- thesis ✓
- not_now ✓（必须明确写出"暂不优先做什么"）
- why_not_now ✓（必须解释"为什么现在不优先"）
- rationale ✓
- confidence ✓

如果无法给出 not_now，说明你的方案缺乏锋利度——三个视角不应该在"暂不做什么"上达成一致，请重新思考你这个视角独特的取舍。

【原则】
- 不讨好、不骑墙、立场鲜明
- key_action 要到"动作"层（动词开头，≤15字）
- action_steps 要到"可执行"层
- 只代表【${agent.persona}】视角
- 敢标低 confidence
- 总字数控制 600 字内

【输出：严格 JSON，不要 \`\`\`json 包裹，不要前后多余文字】

{
  "agent_id": "${agent.id}",
  "claims": [
    {
      "claim_id": "${agent.prefix}1",
      "key_action": "...",
      "thesis": "...",
      "not_now": "...",
      "why_not_now": "...",
      "rationale": ["...", "..."],
      "assumptions": ["..."],
      "risks": ["..."],
      "what_would_change_my_mind": ["..."],
      "action_steps": ["步骤1", "步骤2", "步骤3"],
      "confidence": 0.7,
      "alternative": "",
      "long_form": "（350-500 字自然语言叙事，必填）"
    }
  ]
}`;
}

// ============================================================================
// Briefing（局势简报）V3.15 Prompt
// ============================================================================

function buildBriefingPrompt(agentResults: AgentClaim[], diffResult: DiffResult) {
  const claimsJson = JSON.stringify(agentResults, null, 2);
  const n = agentResults.length;
  const nWord = n === 3 ? '三方' : `${n}方`;
  const personas = agentResults
    .map((a) => a.agent_id)
    .join('、');

  return `你是 Gambit 系统的局势简报官。基于 ${n} 个 Agent 的分析结果，生成简报。

## 输出要求
1. **common_ground**（${nWord}共识）
   - 必须是具体判断，不是框架描述
   - 格式："${nWord}都认为：[具体结论]"
   - 禁止：泛泛的权衡框架、显而易见的废话

2. **king_question**（国王的选择题）
   - 把决策简化为一个"A还是B"的选择
   - 示例："是'先占坑再算账'，还是'先算账再占坑'？"

3. **key_tradeoff**（核心分歧）
   - **用 1-2 句自然语言**把${nWord}到底在哪里分叉说清楚
   - **禁止**使用"A vs B"/"X 轴 vs Y 轴"这种简化轴式表达
   - **禁止**只简单列出"X 派认为 A，Y 派认为 B"的堆砌式复述（那是在重复下方的卡片）
   - 要抽象出**他们在什么问题上真正分歧**，给出 meta 层面的描述
   - 好的示例："三方在'是否值得承担首月漏报风险换取更快的决策速度'这件事上分歧最大——速度派愿意赌，稳健派不接受底线风险。"
   - 坏的示例（不要这样写）："激进派认为 72 小时试跑，稳健派认为组合采购，务实派认为先免费版。"

4. **risk_alert**（风险提示，可选）
   - 只在有明显风险时输出
   - 示例："注意：${nWord}都低估了交付人力瓶颈的影响。"

## 参考信息
【参与视角】${personas}

【主评审团输出】
${claimsJson}

【分歧引擎判定】
${diffResult.state}：${diffResult.consensus_summary}

## JSON 输出格式（严格 JSON，不要 \`\`\`json 包裹）

{
  "common_ground": "${nWord}都认为：...",
  "king_question": "是...还是...？",
  "key_tradeoff": "1-2 句自然语言描述 meta 层面的核心分歧",
  "risk_alert": "注意：..."
}`;
}

// ============================================================================
// Blindspot V3.15 Prompt
// ============================================================================

function buildBlindspotPrompt(agentResults: AgentClaim[], coreTension: string, diffResult: DiffResult) {
  const claimsJson = JSON.stringify(agentResults, null, 2);

  return `你是 Gambit 的 Blindspot Probe，不参与主流辩论，专门挑战集体判断。

【主评审团输出】
${claimsJson}

【核心张力】
${coreTension}

【分歧状态】
${diffResult.state}

【职责】
如果所有视角高度一致，反而值得警惕。请挑战他们的集体判断：
1. 如果他们都错了，最可能错在哪个假设？
2. 有没有被集体忽视的关键视角或变量？
3. 这种一致性是否来自训练数据的共同偏见？

【空值协议】
如果分歧明显，不需要强行制造盲点，输出空字符串即可：
{
  "core_blindspot": "",
  "why_blind": "",
  "extra_consideration": ""
}

【输出：严格 JSON，不要 \`\`\`json 包裹，不要前后多余文字】

{
  "core_blindspot": "核心盲点一句话（如果没有明显盲点则为空）",
  "why_blind": "为什么这可能是盲点",
  "extra_consideration": "用户应额外考虑什么"
}`;
}

// ============================================================================
// Observer V3.15 Prompt
// ============================================================================

function buildObserverPrompt(agentResults: AgentClaim[], diffState: string) {
  const claimsJson = JSON.stringify(agentResults, null, 2);

  return `你是 Gambit 评审团的【旁观者】，不参与主流辩论，专门挑战集体判断。

【主评审团输出】
${claimsJson}

【分歧状态】
${diffState}

【职责】
不站队激进、稳健、务实任何一方。你的任务：
1. 指出三个主视角共同忽略的维度
2. 挑战他们共同的底层假设
3. 提出一个他们都没考虑的角度

【空值协议】
如果三个视角已经覆盖得比较全面，可以输出：
{
  "missed_dimension": "未发现明显遗漏维度",
  "shared_blindspot": "",
  "fresh_angle": ""
}

【输出：严格 JSON，不要 \`\`\`json 包裹，不要前后多余文字】

{
  "missed_dimension": "共同忽略的维度",
  "shared_blindspot": "共同的底层假设（可能错）",
  "fresh_angle": "一个全新角度"
}`;
}

// ============================================================================
// 分歧引擎 HTTP API
// ============================================================================

// ============================================================================
// 带重试的 LLM 调用（P0-C）
// ============================================================================

async function invokeWithRetry(
  req: Parameters<typeof invokeLLM>[0],
  headers: Record<string, string>,
  maxRetries = 1
): Promise<{ content: string } | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await invokeLLM(req, headers);
    } catch (err) {
      if (attempt === maxRetries) {
        console.error(`[invokeWithRetry] 最终失败 model=${req.model} feature=${req.feature}:`, err);
        return null;
      }
      console.warn(`[invokeWithRetry] 第 ${attempt + 1} 次失败，重试 model=${req.model}`);
    }
  }
  return null;
}

async function callDiffEngine(claims: AgentClaim[]) {
  try {
    const response = await fetch('http://43.155.171.45:8000/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claims }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error('分歧引擎调用失败');
    }

    return await response.json() as DiffResult;
  } catch {
    // 分歧引擎失败时返回默认结果
    return {
      state: '弱共识',
      consensus_summary: '各视角各有侧重，正在分析中...',
      trigger_blindspot: false,
      trigger_observer_auto: false,
      similarity_scores: {
        avg_sim: 0.5,
        max_sim: 0.6,
        min_sim: 0.4,
        pairs: [],
      },
    };
  }
}

// ============================================================================
// JSON 解析辅助函数
// ============================================================================

function safeParseJSON(content: string): any {
  let jsonStr = content || '{}';
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  jsonStr = jsonStr.trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ============================================================================
// direct 通路：单模型直答
// ============================================================================

function buildDirectPrompt(userInput: string, router: RouterOutput) {
  const goal = router.task_package?.goal || userInput;
  return `你是 Gambit 的直答模块。用户的问题属于"信息查询 / 知识解释 / 确定性转换"类，请直接给出清晰、结构化、准确的答案。

【用户原始问题】
${userInput}

【Router 识别的目标】
${goal}

【输出要求】
1. 直接回答用户的问题，不要套话、不要"好的，我来为你介绍"之类的开场白。
2. 结构清晰：如果信息量大，用分点/小标题组织；如果信息量小，直接自然语言作答。
3. 篇幅控制：简单问题 100-300 字；复杂或知识梳理类 500-1000 字；除非用户明确指定字数。
4. 基于常识与广泛共识作答。不确定的信息明确说"不确定"，不编造具体数字/日期/人名。
5. 如果问题本身歧义大，先一句话点明你的理解，再作答。
6. 不要输出 JSON，直接输出 Markdown 文本。`;
}

async function runDirectRoute(
  userInput: string,
  router: RouterOutput,
  customHeaders: Record<string, string>,
  sessionId: string
) {
  const prompt = buildDirectPrompt(userInput, router);

  // 主模型：DeepSeek v3（质量好、速度中等）；兜底：豆包
  const PRIMARY = 'deepseek-v3-2-251201';

  let result = await invokeWithRetry(
    {
      model: PRIMARY,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      feature: 'direct_answer',
      userId: sessionId,
    },
    customHeaders,
    1
  );

  let usedModel = PRIMARY;
  if (!result) {
    console.warn(`[Direct] 主模型 ${PRIMARY} 失败，切换豆包兜底`);
    result = await invokeWithRetry(
      {
        model: FALLBACK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        feature: 'direct_answer_fallback',
        userId: sessionId,
      },
      customHeaders,
      0
    );
    usedModel = FALLBACK_MODEL;
  }

  if (!result) {
    return {
      result_type: 'direct',
      route: 'direct',
      success: false,
      error: '模型调用失败，请稍后重试',
      task_summary: router.task_summary,
    };
  }

  return {
    result_type: 'direct',
    route: 'direct',
    success: true,
    answer: result.content,
    model_used: usedModel,
    complexity: router.complexity,
    stakes: router.stakes,
    task_summary: router.task_summary,
  };
}

// ============================================================================
// compete 通路：阶段 1 - 三版本摘要并列
// ============================================================================

// compete 风格配置（复用 AGENTS 模型，但风格语义改为"写作视角"）
const COMPETE_STYLES = [
  {
    id: 'style_punchy',
    label: '冲击力派',
    model: 'kimi-k2-5-260127',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.85,
    styleCore: '你追求冲击力、记忆点、情绪唤起。敢于用强烈措辞、反直觉表达、金句化结构。警惕平庸、套话、自我审查。',
  },
  {
    id: 'style_balanced',
    label: '平衡稳妥派',
    model: 'glm-5-0-260211',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.7,
    styleCore: '你追求稳妥、专业、可信。措辞克制、逻辑清晰、事实优先。警惕浮夸、空喊口号、未验证断言。',
  },
  {
    id: 'style_grounded',
    label: '落地务实派',
    model: 'deepseek-v3-2-251201',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.7,
    styleCore: '你追求可落地、可执行、直给价值。结构清楚、卖点具体、用户利益优先。警惕空泛、抽象口号、堆砌修辞。',
  },
];

interface CompeteDraft {
  style_id: string;
  style_label: string;
  title: string;                // 标题/核心主张（1 句）
  outline: string[];            // 3-5 条要点
  style_tag: string;            // 一句话风格描述
  failed?: boolean;
}

function buildCompeteSummaryPrompt(userInput: string, router: RouterOutput, style: typeof COMPETE_STYLES[number]) {
  const goal = router.task_package?.goal || userInput;
  const materials = router.task_package?.materials || '';
  const constraints = (router.task_package?.constraints || []).join('；') || '无';

  return `你是 Gambit 比稿模块中的【${style.label}】。

【你的写作视角】
${style.styleCore}

【用户原始需求】
<<<USER_INPUT>>>
${userInput}
<<<END>>>

【Router 提取的目标】
${goal}

【用户提供的素材/参考】
${materials || '无'}

【已知约束】
${constraints}

【任务】
不要直接写完整稿件。按你的写作视角，输出**一个摘要方案**，让用户能在看过三个风格后决定扩展哪一个。

【输出格式——严格 JSON，不要 \`\`\`json 包裹，不要多余文字】

{
  "title": "一句话的标题或核心主张（≤25字）",
  "outline": ["要点1（≤40字）", "要点2", "要点3", "要点4（可选）", "要点5（可选）"],
  "style_tag": "一句话描述本版的风格定位和特色（≤30字），让用户快速识别你这版的差异化价值"
}

【硬要求】
- outline 必须 3-5 条，每条是这版稿的关键支柱（不是描述性的话）
- title 和 outline 要能体现你的"${style.label}"风格，和另外两版拉开差距
- 不要输出完整稿件，只出摘要结构
- 不要脑补用户没说的内容，基于原始需求展开`;
}

async function generateCompeteDraft(
  userInput: string,
  router: RouterOutput,
  style: typeof COMPETE_STYLES[number],
  customHeaders: Record<string, string>,
  sessionId: string
): Promise<CompeteDraft> {
  const prompt = buildCompeteSummaryPrompt(userInput, router, style);

  const tryModel = async (model: string, featureTag: string, retries: number) => {
    const res = await invokeWithRetry(
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: style.temperature,
        feature: featureTag,
        userId: sessionId,
      },
      customHeaders,
      retries
    );
    if (!res) return { ok: false as const, reason: 'invoke_failed' };
    const parsed = safeParseJSON(res.content);
    if (!parsed || !parsed.title || !Array.isArray(parsed.outline)) {
      console.warn(
        `[Compete ${style.id}] 模型 ${model} 输出解析失败，原文前 200 字：${String(res.content || '').slice(0, 200)}`
      );
      return { ok: false as const, reason: 'parse_failed' };
    }
    return { ok: true as const, parsed };
  };

  let attempt = await tryModel(style.model, `compete_summary_${style.id}`, 1);

  if (!attempt.ok && style.fallbackModel && style.fallbackModel !== style.model) {
    console.warn(`[Compete ${style.id}] 主模型 ${style.model} 失败（${attempt.reason}），切换豆包兜底`);
    attempt = await tryModel(style.fallbackModel, `compete_summary_${style.id}_fallback`, 0);
  }

  if (!attempt.ok) {
    return {
      style_id: style.id,
      style_label: style.label,
      title: attempt.reason === 'parse_failed' ? '解析失败' : '生成失败',
      outline: ['模型输出异常，请点击重试'],
      style_tag: '失败',
      failed: true,
    };
  }

  const parsed = attempt.parsed;
  return {
    style_id: style.id,
    style_label: style.label,
    title: String(parsed.title).slice(0, 40),
    outline: (parsed.outline as any[]).slice(0, 5).map((x) => String(x).slice(0, 60)),
    style_tag: String(parsed.style_tag || '').slice(0, 40),
  };
}

async function runCompeteStage1(
  userInput: string,
  router: RouterOutput,
  customHeaders: Record<string, string>,
  sessionId: string
) {
  // 三风格并行
  const drafts = await Promise.all(
    COMPETE_STYLES.map((s) =>
      generateCompeteDraft(userInput, router, s, customHeaders, sessionId)
    )
  );

  const successCount = drafts.filter((d) => !d.failed).length;

  return {
    result_type: 'compete',
    route: 'compete',
    stage: 1,
    success: successCount > 0,
    success_count: successCount,
    total_count: drafts.length,
    drafts,
    task_summary: router.task_summary,
    // 阶段 2 调用：前端带上 selected_style_id（或 fusion_ids: [a, b]）+ 原 userInput 打 /api/gambit/compete-expand
    next_action: {
      endpoint: '/api/gambit/compete-expand',
      hint: '用户选定某个 style_id 后，用此端点扩写完整稿；支持 fusion_ids: [id1, id2] 做融合',
    },
  };
}

// ============================================================================
// review 通路：阶段 1 - 三视角审查 → 分层勾选
// ============================================================================

// review 的三视角（审查维度，和 compete 的"写作风格"不同）
const REVIEW_PERSPECTIVES = [
  {
    id: 'review_sharp',
    label: '锐评派',
    model: 'kimi-k2-5-260127',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.6,
    core: '从冲击力/差异化/吸引力角度挑毛病。警惕平庸、套话、自我感动、记忆点不足。',
  },
  {
    id: 'review_rigor',
    label: '严谨派',
    model: 'glm-5-0-260211',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.5,
    core: '从事实/逻辑/措辞准确性挑毛病。警惕漏洞、夸大、逻辑跳跃、不当措辞、政治/合规风险。',
  },
  {
    id: 'review_reader',
    label: '读者派',
    model: 'deepseek-v3-2-251201',
    fallbackModel: FALLBACK_MODEL,
    temperature: 0.6,
    core: '从读者视角挑毛病。警惕信息密度过低/过高、术语不解释、结构混乱、价值不明确、动作不清晰。',
  },
];

interface RawReviewOutput {
  title_suggestion: string | null;     // 对标题/主题的建议，没有就 null
  direction_suggestion: string | null; // 对整体方向的建议，没有就 null
  content_issues: Array<{              // 逐条内容修改点
    quote: string;                      // 引用原文的一小段（≤40字），便于前端定位
    issue: string;                      // 问题是什么（≤60字）
    suggestion: string;                 // 怎么改（≤100字）
  }>;
}

function buildReviewPerspectivePrompt(
  userInput: string,
  router: RouterOutput,
  perspective: typeof REVIEW_PERSPECTIVES[number]
) {
  const materials = router.task_package?.materials || '';
  const goal = router.task_package?.goal || userInput;

  // 如果 Router 的 materials 为空，把 userInput 整体作为待审材料
  const reviewTarget = materials || userInput;

  return `你是 Gambit 审稿模块中的【${perspective.label}】。

【你的审查视角】
${perspective.core}

【用户诉求】
${goal}

【待审查内容】
<<<REVIEW_TARGET>>>
${reviewTarget}
<<<END>>>

【任务】
从你的视角审查上面的内容，输出三类反馈（任何一类没问题就填 null / 空数组）：

1. **标题建议**（title_suggestion）：如果原文有标题且你觉得需要替换，给一个替代标题；否则 null
2. **方向建议**（direction_suggestion）：如果你认为整体方向需要调整（比如"太保守了，应该更激进"或"信息量不够，应该拆成两篇"），用一句话给出；否则 null
3. **内容问题**（content_issues）：具体的句子/段落级修改点，每条包含引用（≤40字原文片段）、问题、建议

【输出格式——严格 JSON，不要 \`\`\`json 包裹】

{
  "title_suggestion": "替代标题或 null",
  "direction_suggestion": "方向调整描述或 null",
  "content_issues": [
    {
      "quote": "原文中的一小段引用",
      "issue": "问题描述（≤60字）",
      "suggestion": "修改建议（≤100字）"
    }
  ]
}

【硬要求】
- 只从你的"${perspective.label}"视角出发，别模仿其他视角
- content_issues 控制在 3-6 条，不要为了凑数而提鸡毛问题
- quote 必须是原文真实存在的片段，不要改写
- 如果原文总体没问题，三个字段都可以是 null / []，诚实反馈
- 不脑补用户未提供的背景`;
}

async function runSinglePerspective(
  userInput: string,
  router: RouterOutput,
  perspective: typeof REVIEW_PERSPECTIVES[number],
  customHeaders: Record<string, string>,
  sessionId: string
): Promise<{ perspective_id: string; perspective_label: string; output: RawReviewOutput | null; failed: boolean }> {
  const prompt = buildReviewPerspectivePrompt(userInput, router, perspective);

  const tryModel = async (model: string, featureTag: string, retries: number) => {
    const res = await invokeWithRetry(
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: perspective.temperature,
        feature: featureTag,
        userId: sessionId,
      },
      customHeaders,
      retries
    );
    if (!res) return { ok: false as const, reason: 'invoke_failed' };
    const parsed = safeParseJSON(res.content);
    if (!parsed) {
      console.warn(
        `[Review ${perspective.id}] 模型 ${model} 输出解析失败，原文前 200 字：${String(res.content || '').slice(0, 200)}`
      );
      return { ok: false as const, reason: 'parse_failed' };
    }
    return { ok: true as const, parsed };
  };

  let attempt = await tryModel(perspective.model, `review_${perspective.id}`, 1);

  if (!attempt.ok && perspective.fallbackModel !== perspective.model) {
    console.warn(`[Review ${perspective.id}] 主模型 ${perspective.model} 失败（${attempt.reason}），切换豆包兜底`);
    attempt = await tryModel(perspective.fallbackModel, `review_${perspective.id}_fallback`, 0);
  }

  if (!attempt.ok) {
    return { perspective_id: perspective.id, perspective_label: perspective.label, output: null, failed: true };
  }

  const parsed = attempt.parsed;
  return {
    perspective_id: perspective.id,
    perspective_label: perspective.label,
    output: {
      title_suggestion: parsed.title_suggestion || null,
      direction_suggestion: parsed.direction_suggestion || null,
      content_issues: Array.isArray(parsed.content_issues) ? parsed.content_issues : [],
    },
    failed: false,
  };
}

// 按"分层勾选"语义组装返回结构
interface ReviewTitleOption {
  perspective_id: string;
  perspective_label: string;
  suggestion: string;
}

interface ReviewDirectionOption {
  perspective_id: string;
  perspective_label: string;
  suggestion: string;
}

interface ReviewContentOption {
  option_id: string;              // `${perspective_id}_${index}`，前端勾选用
  perspective_id: string;
  perspective_label: string;
  quote: string;
  issue: string;
  suggestion: string;
}

async function runReviewStage1(
  userInput: string,
  router: RouterOutput,
  customHeaders: Record<string, string>,
  sessionId: string
) {
  const rawResults = await Promise.all(
    REVIEW_PERSPECTIVES.map((p) =>
      runSinglePerspective(userInput, router, p, customHeaders, sessionId)
    )
  );

  const successResults = rawResults.filter((r) => !r.failed && r.output);

  // 组装三层
  const title_options: ReviewTitleOption[] = [];
  const direction_options: ReviewDirectionOption[] = [];
  const content_options: ReviewContentOption[] = [];

  successResults.forEach((r) => {
    const out = r.output!;
    if (out.title_suggestion) {
      title_options.push({
        perspective_id: r.perspective_id,
        perspective_label: r.perspective_label,
        suggestion: out.title_suggestion,
      });
    }
    if (out.direction_suggestion) {
      direction_options.push({
        perspective_id: r.perspective_id,
        perspective_label: r.perspective_label,
        suggestion: out.direction_suggestion,
      });
    }
    out.content_issues.forEach((ci, idx) => {
      content_options.push({
        option_id: `${r.perspective_id}_${idx}`,
        perspective_id: r.perspective_id,
        perspective_label: r.perspective_label,
        quote: String(ci.quote || '').slice(0, 80),
        issue: String(ci.issue || '').slice(0, 120),
        suggestion: String(ci.suggestion || '').slice(0, 200),
      });
    });
  });

  // 空层标记（前端据此决定折叠）
  const layer_visibility = {
    title: title_options.length > 0,
    direction: direction_options.length > 0,
    content: content_options.length > 0,
  };

  return {
    result_type: 'review',
    route: 'review',
    stage: 1,
    success: successResults.length > 0,
    success_count: successResults.length,
    total_count: rawResults.length,
    failed_perspectives: rawResults.filter((r) => r.failed).map((r) => r.perspective_id),
    review_target: router.task_package?.materials || userInput,
    layers: {
      title_options,       // 单选或不选
      direction_options,   // 单选或不选
      content_options,     // 多选
    },
    layer_visibility,
    task_summary: router.task_summary,
    next_action: {
      endpoint: '/api/gambit/review-apply',
      hint: '用户勾选完后，带 selected_title / selected_direction / selected_content_ids + review_target + userInput 打此端点，生成改后稿',
    },
  };
}

// ============================================================================
// API 路由
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userInput, sessionId, mode, layer, skipRouter, forceDecision } = body;

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 步骤1: Router 判断（V3.15 四分类）
    let routerOutput: RouterOutput | null = null;
    let taskPackage = null;
    let answer = '';
    let strategicHint = '';

    if (!skipRouter) {
      const routerPrompt = buildRouterPrompt(userInput);
      const routerResult = await invokeWithRetry(
        {
          model: 'doubao-seed-2-0-lite-260215',
          messages: [{ role: 'user', content: routerPrompt }],
          temperature: 0.3,
          feature: 'router',
          userId: sessionId,
        },
        customHeaders
      );

      routerOutput = routerResult ? safeParseJSON(routerResult.content) : null;

      if (routerOutput) {
        // 安全网：Router 现已降级为 fact/decision 二分类。
        // 即便 LLM 偶尔 hallucinate 出 compete/review，一律归并到 decision，
        // 由用户在审阅台里手动触发比稿/审稿子功能。
        if (routerOutput.route === 'compete' || routerOutput.route === 'review') {
          console.warn(`[Router] 输出了已废弃路由 ${routerOutput.route}，强制归并到 decision`);
          routerOutput.route = 'decision';
        }

        taskPackage = routerOutput.task_package;

        // direct 通路：单模型直答（知识解释/信息查询/确定性转换）
        if (routerOutput.route === 'direct') {
          const directResult = await runDirectRoute(
            userInput,
            routerOutput,
            customHeaders,
            sessionId
          );
          return NextResponse.json(directResult);
        }

        // review 通路：三视角审查 → 分层合并（标题/方向/内容）
        if (routerOutput.route === 'review') {
          const reviewResult = await runReviewStage1(
            userInput,
            routerOutput,
            customHeaders,
            sessionId
          );
          return NextResponse.json(reviewResult);
        }

        // compete 通路：阶段 1 - 三版本摘要并列
        if (routerOutput.route === 'compete') {
          const competeResult = await runCompeteStage1(
            userInput,
            routerOutput,
            customHeaders,
            sessionId
          );
          return NextResponse.json(competeResult);
        }
      }
    }

    // ========== decision 通路（V3.15）==========

    // 步骤2: Captain 核心张力
    const coreTensionPrompt = buildCoreTensionPrompt(
      taskPackage?.goal || userInput,
      taskPackage?.constraints || [],
      taskPackage?.materials || '',
      userInput
    );
    let coreTension = '待分析';
    const coreTensionResult = await invokeWithRetry(
      {
        model: 'deepseek-r1-250528',
        messages: [{ role: 'user', content: coreTensionPrompt }],
        temperature: 0.7,
        feature: 'core_tension',
        userId: sessionId,
      },
      customHeaders
    );
    if (coreTensionResult) {
      coreTension = coreTensionResult.content.replace(/核心张力:\s*/i, '').trim() || '待分析';
    } else {
      coreTension = '核心张力分析超时，请重试';
    }

    // 步骤3: 三个 Agent 并行（带重试 + 清晰失败态 P0-C）
    const buildFailedClaim = (agent: typeof AGENTS[0]): AgentClaim => ({
      agent_id: agent.id,
      claims: [
        {
          claim_id: `${agent.prefix}1`,
          key_action: '分析失败',
          thesis: `${agent.persona}模型调用超时，点击重试按钮重新分析`,
          not_now: '-',
          why_not_now: '-',
          rationale: [`${agent.persona}视角分析失败`],
          assumptions: [],
          risks: [],
          what_would_change_my_mind: [],
          action_steps: [],
          confidence: 0,
          alternative: '',
        },
      ],
    });

    const agentPromises = AGENTS.map(async (agent) => {
      const agentPrompt = buildAgentPrompt(
        agent,
        coreTension,
        taskPackage?.goal || userInput,
        taskPackage?.constraints || [],
        taskPackage?.materials || '',
        userInput
      );

      // 封装：调用 + 解析，解析失败也算失败
      const tryModel = async (model: string, featureTag: string, retries: number) => {
        const res = await invokeWithRetry(
          {
            model,
            messages: [{ role: 'user', content: agentPrompt }],
            temperature: agent.temperature,
            feature: featureTag,
            userId: sessionId,
          },
          customHeaders,
          retries
        );
        if (!res) {
          return { ok: false as const, reason: 'invoke_failed' };
        }
        const parsed = safeParseJSON(res.content);
        if (!parsed || !parsed.claims || !parsed.claims[0]) {
          console.warn(
            `[Agent ${agent.id}] 模型 ${model} 输出解析失败，原文前 200 字：${String(res.content || '').slice(0, 200)}`
          );
          return { ok: false as const, reason: 'parse_failed' };
        }
        return { ok: true as const, claim: parsed as AgentClaim };
      };

      // 主模型（1 次重试）
      let attempt = await tryModel(agent.model, `agent_${agent.id}`, 1);

      // 主模型失败（调用失败 或 解析失败）→ 切豆包兜底
      if (!attempt.ok && agent.fallbackModel && agent.fallbackModel !== agent.model) {
        console.warn(
          `[Agent ${agent.id}] 主模型 ${agent.model} 失败（${attempt.reason}），切换兜底 ${agent.fallbackModel}`
        );
        attempt = await tryModel(agent.fallbackModel, `agent_${agent.id}_fallback`, 0);
      }

      if (!attempt.ok) {
        return buildFailedClaim(agent);
      }

      const claim = attempt.claim;
      if (claim.claims && claim.claims[0]) {
        if (!claim.claims[0].not_now) claim.claims[0].not_now = '保持现状';
        if (!claim.claims[0].why_not_now) claim.claims[0].why_not_now = '时机未到';
      }
      return claim;
    });

    const agentResults = await Promise.all(agentPromises);

    // 步骤4: 分歧引擎
    const diffResult = await callDiffEngine(agentResults);

    // 步骤5: Blindspot（如触发）
    let blindspot = null;
    if (diffResult.trigger_blindspot) {
      const blindspotPrompt = buildBlindspotPrompt(agentResults, coreTension, diffResult);
      const blindspotResult = await invokeWithRetry(
        {
          model: 'glm-5-turbo-260316',
          messages: [{ role: 'user', content: blindspotPrompt }],
          temperature: 0.5,
          feature: 'blindspot',
          userId: sessionId,
        },
        customHeaders
      );
      blindspot = blindspotResult ? safeParseJSON(blindspotResult.content) : null;
    }

    // 步骤6: Briefing
    const briefingPrompt = buildBriefingPrompt(agentResults, diffResult);
    let briefing: BriefingOutput | null = null;
    const briefingResult = await invokeWithRetry(
      {
        model: 'kimi-k2-5-260127',
        messages: [{ role: 'user', content: briefingPrompt }],
        temperature: 0.6,
        feature: 'briefing',
        userId: sessionId,
      },
      customHeaders
    );
    if (briefingResult) {
      briefing = safeParseJSON(briefingResult.content);
    }
    if (!briefing) {
      briefing = {
        common_ground: '各视角均有价值',
        king_question: '选择哪个方向？',
        key_tradeoff: '风险 vs 收益',
        risk_alert: '谨慎评估',
      };
    }

    // 转换 claims 为前端展示格式
    const personaLabels: Record<string, string> = {
      agent_radical: '激进视角',
      agent_steady: '稳健视角',
      agent_pragmatic: '务实视角',
    };

    const claims = agentResults.map((result) => {
      const claim = result.claims[0] || {};
      return {
        agent_id: result.agent_id,
        claim_id: claim.claim_id || '',
        key_action: claim.key_action || '',
        not_now: claim.not_now || '',
        why_not_now: claim.why_not_now || '',
        persona_label: personaLabels[result.agent_id] || result.agent_id,
        thesis: claim.thesis || '',
        rationale: claim.rationale || [],
        long_form: claim.long_form || '',
        assumptions: claim.assumptions || [],
        risks: claim.risks || [],
        what_would_change_my_mind: claim.what_would_change_my_mind || [],
        action_steps: claim.action_steps || [],
        confidence: claim.confidence ?? 0.5,
        alternative: claim.alternative || '',
      };
    });

    // 返回决策结果（V3.15 格式）
    return NextResponse.json({
      result_type: 'decision',
      depth: layer || 1,
      route: 'decision',
      core_tension: coreTension,
      claims,
      diff_result: diffResult,
      blindspot,
      briefing, // V3.15 新增
      task_package: taskPackage,
    });
  } catch (error) {
    console.error('Diverge API error:', error);
    return NextResponse.json(
      {
        code: 'API_ERROR',
        user_message: '分析过程中出现错误，请重试',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
