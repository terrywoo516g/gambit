// ============================================================================
// compete 阶段 2：按用户选定的风格/融合方向，扩写完整稿
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { HeaderUtils } from 'coze-coding-dev-sdk';
import { invokeLLM } from '@/lib/llm-client';

const FALLBACK_MODEL = 'doubao-seed-2-0-lite-260215';

// 与 diverge/route.ts 的 COMPETE_STYLES 对齐
const STYLE_MAP: Record<string, { label: string; model: string; temperature: number; styleCore: string }> = {
  style_punchy: {
    label: '冲击力派',
    model: 'kimi-k2-5-260127',
    temperature: 0.85,
    styleCore: '冲击力、记忆点、情绪唤起。敢于用强烈措辞、反直觉表达、金句化结构。',
  },
  style_balanced: {
    label: '平衡稳妥派',
    model: 'glm-5-0-260211',
    temperature: 0.7,
    styleCore: '稳妥、专业、可信。措辞克制、逻辑清晰、事实优先。',
  },
  style_grounded: {
    label: '落地务实派',
    model: 'deepseek-v3-2-251201',
    temperature: 0.7,
    styleCore: '可落地、可执行、直给价值。结构清楚、卖点具体、用户利益优先。',
  },
};

interface ExpandDraft {
  style_id: string;
  title: string;
  outline: string[];
  style_tag: string;
}

function buildSingleExpandPrompt(userInput: string, draft: ExpandDraft, style: typeof STYLE_MAP[string]) {
  return `你是 Gambit 比稿模块中的【${style.label}】。用户已经看过你的摘要方案并选定了你这一版，现在需要你把摘要扩写成完整稿。

【用户原始需求】
<<<USER_INPUT>>>
${userInput}
<<<END>>>

【你之前的摘要方案】
标题：${draft.title}
要点：
${draft.outline.map((x, i) => `${i + 1}. ${x}`).join('\n')}
风格定位：${draft.style_tag}

【你的写作视角】
${style.styleCore}

【任务】
把上述摘要扩写成一篇完整稿件。

【硬要求】
1. 严格沿用摘要的标题与要点结构，不要另起炉灶
2. 保持"${style.label}"的写作风格贯穿全文
3. 篇幅 ≤1000 字（用户明确指定更长字数除外）
4. 输出 Markdown 文本，不要 JSON，不要前后多余说明
5. 不要编造具体数据/人名/时间，如需引用占位则明确标注 "[待填]"`;
}

function buildFusionPrompt(userInput: string, drafts: ExpandDraft[]) {
  return `你是 Gambit 比稿模块的融合写手。用户挑选了 ${drafts.length} 版不同风格的摘要，想看到它们融合后的完整稿。

【用户原始需求】
<<<USER_INPUT>>>
${userInput}
<<<END>>>

【待融合的摘要版本】
${drafts
  .map(
    (d, i) => `—— 版本 ${i + 1}：${d.style_tag} ——
标题：${d.title}
要点：
${d.outline.map((x, j) => `  ${j + 1}. ${x}`).join('\n')}`
  )
  .join('\n\n')}

【任务】
产出一篇融合上述版本优点的完整稿。

【融合原则】
1. 标题：吸收各版标题的亮点，重新凝练
2. 结构：取各版要点的互补部分，组成新的骨架，避免简单堆叠
3. 风格：在多版风格之间取平衡，整体偏稳但保留记忆点
4. 不要逐版切换语气，要成为一个连贯的整体

【硬要求】
- 输出 Markdown 文本，不要 JSON，不要前后多余说明
- 篇幅 ≤1000 字
- 不编造具体数据/人名/时间`;
}

async function invokeWithRetry(req: any, headers: Record<string, string>, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await invokeLLM(req, headers);
    } catch (err) {
      console.warn(`[compete-expand] attempt ${i + 1} failed:`, err);
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
      selectedStyleId,        // 单风格扩展
      fusionIds,              // 融合多版（优先级高于 selectedStyleId）
      drafts,                 // 阶段 1 返回的 drafts 数组（前端回传）
    } = body;

    if (!userInput || !drafts || !Array.isArray(drafts) || drafts.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少 userInput 或 drafts' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 融合模式
    if (fusionIds && Array.isArray(fusionIds) && fusionIds.length >= 2) {
      const pickedDrafts = drafts.filter((d: ExpandDraft) => fusionIds.includes(d.style_id));
      if (pickedDrafts.length < 2) {
        return NextResponse.json(
          { success: false, error: '融合至少需要 2 个有效 draft' },
          { status: 400 }
        );
      }

      const prompt = buildFusionPrompt(userInput, pickedDrafts);
      // 融合走 DeepSeek v3（综合能力强），兜底豆包
      let result = await invokeWithRetry(
        {
          model: 'deepseek-v3-2-251201',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          feature: 'compete_expand_fusion',
          userId: sessionId,
        },
        customHeaders,
        1
      );
      let usedModel = 'deepseek-v3-2-251201';
      if (!result) {
        result = await invokeWithRetry(
          {
            model: FALLBACK_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            feature: 'compete_expand_fusion_fallback',
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
          mode: 'fusion',
          error: '融合扩写失败，请重试',
        });
      }

      return NextResponse.json({
        success: true,
        mode: 'fusion',
        fusion_ids: fusionIds,
        content: result.content,
        model_used: usedModel,
      });
    }

    // 单风格扩展模式
    if (!selectedStyleId) {
      return NextResponse.json(
        { success: false, error: '缺少 selectedStyleId 或 fusionIds' },
        { status: 400 }
      );
    }

    const picked = drafts.find((d: ExpandDraft) => d.style_id === selectedStyleId);
    const style = STYLE_MAP[selectedStyleId];
    if (!picked || !style) {
      return NextResponse.json(
        { success: false, error: `未知的 style_id: ${selectedStyleId}` },
        { status: 400 }
      );
    }

    const prompt = buildSingleExpandPrompt(userInput, picked, style);

    let result = await invokeWithRetry(
      {
        model: style.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: style.temperature,
        feature: `compete_expand_${selectedStyleId}`,
        userId: sessionId,
      },
      customHeaders,
      1
    );
    let usedModel = style.model;
    if (!result) {
      console.warn(`[compete-expand] ${style.model} 失败，豆包兜底`);
      result = await invokeWithRetry(
        {
          model: FALLBACK_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: style.temperature,
          feature: `compete_expand_${selectedStyleId}_fallback`,
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
        mode: 'single',
        selected_style_id: selectedStyleId,
        error: '扩写失败，请重试',
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'single',
      selected_style_id: selectedStyleId,
      title: picked.title,
      content: result.content,
      model_used: usedModel,
    });
  } catch (err: any) {
    console.error('[compete-expand] error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || '未知错误' },
      { status: 500 }
    );
  }
}
