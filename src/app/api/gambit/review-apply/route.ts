// ============================================================================
// review 阶段 2：应用用户勾选的修改点，生成改后稿
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { invokeLLM } from '@/lib/llm-client';

const FALLBACK_MODEL = 'doubao-seed-2-0-lite-260215';
const PRIMARY_MODEL = 'deepseek-v3-2-251201'; // 合成改稿用综合能力强的

interface ContentFix {
  option_id: string;
  quote: string;
  issue: string;
  suggestion: string;
}

function buildApplyPrompt(
  userInput: string,
  reviewTarget: string,
  selectedTitle: string | null,
  selectedDirection: string | null,
  contentFixes: ContentFix[]
) {
  const titleBlock = selectedTitle
    ? `【替换标题】使用以下标题替换原标题：\n"${selectedTitle}"`
    : '【标题】保持原样';

  const directionBlock = selectedDirection
    ? `【整体方向调整】按以下方向改写整体内容：\n"${selectedDirection}"`
    : '【整体方向】保持原样';

  const contentBlock =
    contentFixes.length === 0
      ? '【内容修改】无逐条内容修改'
      : `【内容修改】严格按以下清单逐条应用修改（只改指出的部分，不要擅自改其他地方）：

${contentFixes
  .map(
    (f, i) => `修改 ${i + 1}：
  原文片段："${f.quote}"
  问题：${f.issue}
  改法：${f.suggestion}`
  )
  .join('\n\n')}`;

  return `你是 Gambit 审稿模块的改稿执行人。用户审查了自己的稿件后，勾选了一些修改点，现在你按这些勾选，输出改后的完整稿件。

【用户原始诉求】
<<<USER_INPUT>>>
${userInput}
<<<END>>>

【原稿】
<<<ORIGINAL>>>
${reviewTarget}
<<<END>>>

【勾选的修改指令】

${titleBlock}

${directionBlock}

${contentBlock}

【硬要求】
1. 严格按上述勾选执行，未勾选的地方保持原样
2. 如果既有"方向调整"又有"逐条修改"，方向调整优先（逐条修改在调整后的整体框架内落实）
3. 输出完整改后稿，Markdown 格式，不要 JSON 不要前后说明
4. 不要编造原稿未有的事实/数据
5. 如果修改指令互相矛盾，以离原文改动最小的方向为准`;
}

async function invokeWithRetry(req: any, headers: Record<string, string>, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await invokeLLM(req, headers);
    } catch (err) {
      console.warn(`[review-apply] attempt ${i + 1} failed:`, err);
      if (i === retries) return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userInput,
      sessionId,
      reviewTarget,              // 原稿（从阶段 1 返回的 review_target 回传）
      selectedTitle,             // string | null
      selectedDirection,         // string | null
      contentFixes,              // ContentFix[] - 前端把勾选的 content_options 过滤回传
    } = body;

    if (!userInput || !reviewTarget) {
      return NextResponse.json(
        { success: false, error: '缺少 userInput 或 reviewTarget' },
        { status: 400 }
      );
    }

    const fixes: ContentFix[] = Array.isArray(contentFixes) ? contentFixes : [];

    // 三层都没勾，没必要调模型
    if (!selectedTitle && !selectedDirection && fixes.length === 0) {
      return NextResponse.json({
        success: true,
        no_change: true,
        content: reviewTarget,
        message: '未勾选任何修改点，原稿保持不变',
      });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const prompt = buildApplyPrompt(
      userInput,
      reviewTarget,
      selectedTitle || null,
      selectedDirection || null,
      fixes
    );

    let result = await invokeWithRetry(
      {
        model: PRIMARY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4, // 改稿要稳，温度低
        feature: 'review_apply',
        userId: sessionId,
      },
      customHeaders,
      1
    );
    let usedModel = PRIMARY_MODEL;
    if (!result) {
      console.warn('[review-apply] 主模型失败，豆包兜底');
      result = await invokeWithRetry(
        {
          model: FALLBACK_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          feature: 'review_apply_fallback',
          userId: sessionId,
        },
        customHeaders,
        0
      );
      usedModel = FALLBACK_MODEL;
    }

    if (!result) {
      return NextResponse.json({
        success: false,
        error: '改稿生成失败，请重试',
      });
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      model_used: usedModel,
      applied: {
        title_changed: !!selectedTitle,
        direction_changed: !!selectedDirection,
        content_fixes_count: fixes.length,
      },
    });
  } catch (err: any) {
    console.error('[review-apply] error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || '未知错误' },
      { status: 500 }
    );
  }
}
