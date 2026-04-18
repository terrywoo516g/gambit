import { LLMClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new LLMClient(config, {});

// 当前 V2.1 的 Router Prompt（需要适配 V3）
const routerPromptV3 = `【角色】你是 Gambit 的 Router，负责判断用户输入应该走哪条通路。

【判断依据】两个维度的交叉：
1. 用户要的是"产出物"还是"判断"？
2. 用户有没有带现成素材进来？

【四条通路定义】
- direct：简单问题、翻译、格式转换，不需要多AI比对
- review：用户带了现成内容，主要诉求是检查、挑刺、验证
- compete：用户要求生成一个具体产出物，想要多个版本比较后择优或缝合
- decision：用户提出开放性问题，需要权衡取舍，没有标准答案

【判断规则（按优先级）】
1. 简单问题有明确答案 → direct
2. 带现成内容要检查挑刺 → review  
3. 要求生成产出物 → compete
4. 开放性权衡问题 → decision

【输出格式】严格JSON：
{
  "route": "direct|review|compete|decision",
  "confidence": 0.0-1.0,
  "task_summary": "一句话概括用户要干什么",
  "has_material": true|false,
  "reasoning": "判断理由"
}`;

const testCases = [
  { id: 1, input: "Python 怎么读 CSV", expect: "direct" },
  { id: 2, input: "可口可乐总部在哪个城市", expect: "direct" },
  { id: 3, input: "用 500 字解释区块链原理", expect: "direct" },
  { id: 4, input: "亲爱的张总，关于上次会议讨论的方案，我认为贵司的报价偏高...", expect: "review" },
  { id: 5, input: "帮我看看这个活动方案有没有漏洞：五一营销活动方案", expect: "review" },
  { id: 6, input: "帮我写一个可口可乐五一推广文案", expect: "compete" },
  { id: 7, input: "帮我写一封拒绝供应商的邮件", expect: "compete" },
  { id: 8, input: "帮我写个标题", expect: "compete" },
  { id: 9, input: "该不该现在换工作", expect: "decision" },
  { id: 10, input: "我们的 SaaS 产品怎么冷启动", expect: "decision" },
  { id: 11, input: "团队 3 人，Q3 先做增长还是先做商业化", expect: "decision" },
  { id: 12, input: "GPT-4 和 Claude 哪个更好", expect: "decision" },
  { id: 13, input: "用 React 写一个 Todo 应用", expect: "compete" },
  { id: 14, input: "把这篇文章改成小红书版本：今天分享一个创业心得...", expect: "compete" },
  { id: 15, input: "帮我翻译这段话：今天天气很好", expect: "direct" },
];

async function testRouter() {
  console.log('=== 测试一：Router 四分类 ===\n');
  let correct = 0;
  let total = testCases.length;
  
  for (const tc of testCases) {
    try {
      const result = await client.invoke(
        [{ role: 'user', content: `${routerPromptV3}\n\n用户输入：${tc.input}` }],
        { model: 'doubao-seed-2-0-lite-260215', temperature: 0.3 }
      );
      
      let jsonStr = result.content || '{}';
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      jsonStr = jsonStr.trim();
      
      const parsed = JSON.parse(jsonStr);
      const predicted = parsed.route;
      const isCorrect = predicted === tc.expect;
      if (isCorrect) correct++;
      
      console.log(`${tc.id}. ${isCorrect ? '✅' : '❌'} "${tc.input.substring(0, 30)}..."`);
      console.log(`   期望: ${tc.expect}, 实际: ${predicted}, 置信度: ${parsed.confidence}`);
      console.log(`   理由: ${parsed.reasoning?.substring(0, 50)}...`);
      console.log('');
    } catch (error: any) {
      console.log(`${tc.id}. ❌ "${tc.input.substring(0, 30)}..."`);
      console.log(`   错误: ${error.message?.substring(0, 80)}`);
      console.log('');
    }
  }
  
  console.log(`\n=== 准确率: ${correct}/${total} = ${(correct/total*100).toFixed(1)}% ===`);
}

testRouter();
