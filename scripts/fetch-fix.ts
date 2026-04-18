import { FetchClient, Config } from 'coze-coding-dev-sdk';

async function main() {
  const config = new Config();
  const client = new FetchClient(config);

  const url = 'https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2FGambit+Phase+1+%E5%8D%A1%E5%B1%8F%E4%BF%AE%E5%A4%8D%E5%8D%95.md&nonce=8d1e0bdf-e84f-453d-97eb-ebe0682dbeb9&project_id=7628659738854637583&sign=5668cf219481d00ce37c1246c0d1baba40dd0a975f57bcbfc832542168f3ef36';

  const response = await client.fetch(url);

  console.log('Title:', response.title);
  console.log('Status:', response.status_code);
  console.log('Content:');
  for (const item of response.content) {
    if (item.type === 'text') {
      console.log(item.text);
    }
  }
}

main().catch(console.error);
