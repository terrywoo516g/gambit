import { LLMClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new LLMClient(config, {});

const models = [
  { model: 'doubao-seed-2-0-lite-260215', temp: 0.7, name: 'Router' },
  { model: 'doubao-seed-1-6-thinking-250715', temp: 0.7, name: 'Captain-核心张力' },
  { model: 'kimi-k2-5-260127', temp: 0.6, name: '激进派' },
  { model: 'glm-5-0-260211', temp: 0.7, name: '稳健派' },
  { model: 'deepseek-r1-250528', temp: 0.7, name: '务实派' },
  { model: 'glm-5-turbo-260316', temp: 0.5, name: 'Blindspot' },
  { model: 'doubao-seed-1-6-thinking-250715', temp: 0.7, name: 'Captain-合成' },
  { model: 'qwen-3-5-plus-260215', temp: 0.7, name: 'Observer' },
];

async function test() {
  console.log('Testing all models from the list...\n');
  for (const { model, temp, name } of models) {
    console.log(`Testing ${name} (${model}) @ temp=${temp}...`);
    try {
      const result = await client.invoke(
        [{ role: 'user', content: 'Say "OK" in exactly one word' }],
        { model, temperature: temp }
      );
      console.log(`  ✅ SUCCESS: ${result.content.substring(0, 30)}`);
    } catch (error: any) {
      const msg = error?.error?.message || error?.message || String(error).substring(0, 80);
      console.log(`  ❌ FAILED: ${msg}`);
    }
    console.log('');
  }
}

test();
