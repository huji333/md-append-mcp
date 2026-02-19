import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerNoteTools } from './tools/note.js';
import { registerSearchTools } from './tools/search.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

const server = new McpServer({
  name: 'obsidian-vault-mcp',
  version: '1.0.0',
});

registerNoteTools(server);
registerSearchTools(server);

// Stateless mode: no session tracking, each request is independent
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

await server.connect(transport);

const httpServer = http.createServer(async (req, res) => {
  const url = req.url ?? '';
  if (url === '/mcp' || url.startsWith('/mcp?')) {
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error('MCP request error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  } else if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

httpServer.listen(PORT, () => {
  console.log(`obsidian-vault-mcp listening on http://0.0.0.0:${PORT}/mcp`);
});
