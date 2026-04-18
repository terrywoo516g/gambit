import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const config = new Config();

// JSON parsing helper
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

// Observer V3.15 Prompt
function buildObserverPrompt(allClaimCardsJson: string, diffState: string) {
  return `你是 Gambit 评审团的旁观者，不参与主流辩论，专门挑战集体判断。

主评审团输出:
${allClaimCardsJson}

分歧状态:
${diffState}

职责:
不站队激进、稳健、务实任何一方。你的任务:
1. 指出三个主视角共同忽略的维度
2. 挑战他们共同的底层假设
3. 提出一个他们都没考虑的角度

空值协议:
如果三个视角已经覆盖得比较全面，可以输出空字符串。

输出格式 (严格 JSON，不要包裹):
{
  "missed_dimension": "共同忽略的维度",
  "shared_blindspot": "共同的底层假设（可能错）",
  "fresh_angle": "一个全新角度"
}`;
}

// POST /api/gambit/observer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, claims, diffState } = body;

    // Extract forwarding headers
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    // Build claims JSON
    const allClaimCardsJson = JSON.stringify(
      claims || [
        {
          agent_id: 'agent_radical',
          claims: [{ claim_id: 'A1', key_action: '快速行动', thesis: '速度是第一竞争力' }],
        },
      ]
    );

    const observerPrompt = buildObserverPrompt(allClaimCardsJson, diffState || '弱共识');

    const result = await client.invoke(
      [{ role: 'user', content: observerPrompt }],
      { model: 'qwen-3-5-plus-260215', temperature: 0.7 }
    );

    let observerOutput = safeParseJSON(result.content);

    // Fallback for null
    if (!observerOutput) {
      observerOutput = {
        missed_dimension: '未发现明显遗漏维度',
        shared_blindspot: '',
        fresh_angle: '',
      };
    }

    return NextResponse.json(observerOutput);
  } catch (error) {
    console.error('Observer API error:', error);
    return NextResponse.json(
      {
        code: 'OBSERVER_ERROR',
        user_message: '旁观者调用失败',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
