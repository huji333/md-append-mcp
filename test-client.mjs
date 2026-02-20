import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('http://localhost:1065/mcp');
const transport = new StreamableHTTPClientTransport(url);
const client = new Client({ name: 'test-client', version: '0.0.1' });

console.log('connecting...');
await client.connect(transport);
console.log('✓ connected');

console.log('listing tools...');
const { tools } = await client.listTools();
console.log('✓ tools:', tools.map(t => t.name));

console.log('calling vault_search...');
const search = await client.callTool({
  name: 'vault_search',
  arguments: { query: 'devlog' },
});
console.log('✓ vault_search:', search.content[0].text);

console.log('writing test note...');
const upsert = await client.callTool({
  name: 'note_upsert',
  arguments: {
    path: 'claude/devlog/mcp-test.md',
    content: '\n## 2026-02-20 MCP server local test\n\n- note_upsert via localhost:1065 動作確認\n\n---',
    frontmatter: { tags: ['devlog', 'test'], created: '2026-02-20' },
  },
});
console.log('✓ note_upsert:', upsert.content[0].text);

console.log('reading back...');
const read = await client.callTool({
  name: 'note_read',
  arguments: { path: 'claude/devlog/mcp-test.md' },
});
const parsed = JSON.parse(read.content[0].text);
console.log('✓ note_read exists:', parsed.exists);
console.log('--- content ---');
console.log(parsed.content);

await client.close();
