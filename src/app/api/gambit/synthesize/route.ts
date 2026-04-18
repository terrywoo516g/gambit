import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const config = new Config();

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
// Decision Captain V3.15 Prompt（强制引用 Briefing）
// ============================================================================

function buildDecisionCaptainPrompt(params: {
  goal: string;
  constraints: string[];
  coreTension: string;
  allClaimCardsJson: string;
  briefing: any;
  diffState: string;
  blindspot?: any;
  observer?: any;
  userChoice: any;
  userThoughts: string;
}) {
  const {
    goal,
    constraints,
    coreTension,
    allClaimCardsJson,
    briefing,
    diffState,
    blindspot,
    observer,
    userChoice,
    userThoughts,
  } = params;

  return `你是 Gambit 的 Captain，负责基于评审团分歧与用户意图，合成最终建议。

你不是国王——用户才是国王。你是国王的军师，帮国王理清局面、给出有立场的建议。

【问题背景】
- 目标: ${goal}
- 约束: ${constraints.length > 0 ? constraints.join(', ') : '无'}
- 核心张力: ${coreTension}

【局势简报（强制先引用）】
${briefing ? JSON.stringify(briefing, null, 2) : '（无简报）'}

【评审团完整论述（来自三个不同厂商的模型，已保证异源）——这就是你的主要信源，请像读三篇议论文那样读它们】
${allClaimCardsJson}

【分歧引擎判定】
${diffState}

【Blindspot Probe（如有）】
${blindspot ? JSON.stringify(blindspot) : '无'}

【旁观者（如有）】
${observer ? JSON.stringify(observer) : '无'}

【用户选择】
${JSON.stringify(userChoice)}

【用户想法】
${userThoughts || '无'}

【核心原则】
1. 用自然语言叙述，不要结构化表格/矩阵/管道符；像人写决策备忘一样一气呵成
2. 先回顾共识与真正的分歧焦点，再给出结论
3. 结论带条件："建议 X，因为 Y 约束下 Z 最优。如果 W 变化，改选 V"
4. 【我的想法】优先级最高，与 Agent 假设冲突时显式指出并以用户为准
5. 引用用 Claim ID（仅在需要时），不要堆砌
6. 被放弃方向的有用片段整理出来，不浪费
7. 不和稀泥，有立场

【空值协议】
- conflict_handling：无冲突时输出 ""
- risk_warning：无内容时输出 ""
- dropped_useful_pieces：无有用碎片时输出 []

【输出：严格 JSON，每个字段内容支持 Markdown 格式，不要 \`\`\`json 包裹】

{
  "selected_persona": "基于哪个视角（如'激进视角'），或'Captain 推荐'（用户未选卡时）",
  "tradeoff_matrix": "",
  "core_decision": "一段自然语言，先给结论再给最硬的那条理由，2-3 句",
  "reasoning": "一段自然语言的展开，承接 core_decision，解释在当前约束下为什么是它而不是另外两条；必要时引用 Claim ID，但不要堆砌。可分两三段。",
  "conditional_recommendation": "自然语言：在什么场景下换方向；'如果 X 发生，改选 Y。如果 Z 发生，回到 W'",
  "conflict_handling": "与用户想法的冲突处理（无冲突则输出空串）",
  "risk_warning": "风险提示（无内容则输出空串）",
  "dropped_useful_pieces": ["碎片1", "碎片2"]
}

【规范】
- tradeoff_matrix 固定输出空字符串 ""，不要生成任何表格
- 所有段落都是自然语言散文，不用 bullet/编号/表格/管道符
- 总长 <1200 字
- 不要"综上所述"、"总而言之"
- conflict_handling 和 risk_warning 无内容时输出空串 ""`;
}

// ============================================================================
// API 路由
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, user_choice, user_thoughts, goal, constraints, core_tension, claims, briefing, diff_state, blindspot, observer } = body;

    // 提取转发 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    // 构建 claims JSON（V3.16 优先用 long_form 自然语言叙事喂给 Captain）
    const personaByAgent: Record<string, string> = {
      agent_radical: '激进视角',
      agent_steady: '稳健视角',
      agent_pragmatic: '务实视角',
    };
    const narrativeBlocks: string[] = [];
    const structuredFallback: unknown[] = [];

    const claimList: Array<Record<string, unknown>> = Array.isArray(claims) ? claims : [];
    for (const c of claimList) {
      // 兼容两种形态：{ agent_id, claims: [Claim] } 或扁平的 ClaimCardViewModel
      const agentId = (c as { agent_id?: string }).agent_id || 'agent';
      const persona = personaByAgent[agentId] || agentId;
      const inner = (c as { claims?: Array<Record<string, unknown>> }).claims;
      const firstClaim = inner && inner[0] ? inner[0] : (c as Record<string, unknown>);
      const claimId = String(firstClaim.claim_id || '');
      const keyAction = String(firstClaim.key_action || '');
      const longForm = String(firstClaim.long_form || '');
      if (longForm) {
        narrativeBlocks.push(
          `### ${persona}（${claimId}）主张：${keyAction}\n\n${longForm}`
        );
      } else {
        structuredFallback.push(firstClaim);
      }
    }

    const claimsNarrative = narrativeBlocks.length > 0
      ? narrativeBlocks.join('\n\n---\n\n')
      : '（本次三方均未给出 long_form 叙事，下方为结构化降级输入）\n\n' + JSON.stringify(structuredFallback, null, 2);

    const claimsJson = claimsNarrative;

    const captainPrompt = buildDecisionCaptainPrompt({
      goal: goal || '待决策问题',
      constraints: constraints || [],
      coreTension: core_tension || '待分析',
      allClaimCardsJson: claimsJson,
      briefing: briefing,
      diffState: diff_state || '弱共识',
      blindspot: blindspot,
      observer: observer,
      userChoice: user_choice,
      userThoughts: user_thoughts || '',
    });

    const result = await client.invoke(
      [{ role: 'user', content: captainPrompt }],
      { model: 'deepseek-r1-250528', temperature: 0.7 }
    );

    let finalOutput = safeParseJSON(result.content);

    // 空值兜底
    if (!finalOutput) {
      finalOutput = {
        selected_persona: 'Captain 推荐',
        tradeoff_matrix: '',
        core_decision: '综合分析中...',
        reasoning: '正在生成决策建议',
        conditional_recommendation: '',
        conflict_handling: '',
        risk_warning: '',
        dropped_useful_pieces: [],
      };
    }

    // 确保必填字段
    if (!finalOutput.conflict_handling) finalOutput.conflict_handling = '';
    if (!finalOutput.risk_warning) finalOutput.risk_warning = '';
    if (!finalOutput.dropped_useful_pieces) finalOutput.dropped_useful_pieces = [];

    // 自然语言化硬拦截：模型若仍输出表格/管道符/编号列表，就地清洗
    finalOutput.tradeoff_matrix = '';
    const stripStructured = (text: string): string => {
      if (!text || typeof text !== 'string') return text || '';
      return text
        // 去掉 markdown 表格行
        .split('\n')
        .filter((l) => !/^\s*\|.*\|\s*$/.test(l) && !/^\s*\|?\s*:?-{3,}/.test(l))
        .join('\n')
        // 去掉行首 "- " "* " "1. " 之类的列表标记
        .replace(/^\s*[-*]\s+/gm, '')
        .replace(/^\s*\d+[.、)]\s+/gm, '')
        .trim();
    };
    finalOutput.core_decision = stripStructured(finalOutput.core_decision);
    finalOutput.reasoning = stripStructured(finalOutput.reasoning);
    finalOutput.conditional_recommendation = stripStructured(finalOutput.conditional_recommendation);
    finalOutput.conflict_handling = stripStructured(finalOutput.conflict_handling);
    finalOutput.risk_warning = stripStructured(finalOutput.risk_warning);

    return NextResponse.json(finalOutput);
  } catch (error) {
    console.error('Synthesize API error:', error);
    return NextResponse.json(
      {
        code: 'CAPTAIN_ERROR',
        user_message: '合成过程中出现错误，请重试',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
