import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerDevlogAppend } from './controller/devlog_append.ts';
import { registerDevlogTail } from './controller/devlog_tail.ts';
import { registerAdrWrite } from './controller/adr_write.ts';
import { registerAdrDelete } from './controller/adr_delete.ts';
import { registerAdrIndex } from './controller/adr_index.ts';
import { registerAdrView } from './controller/adr_view.ts';

const PORT = parseInt(process.env.PORT ?? '1065', 10);

const httpServer = http.createServer(async (req, res) => {
  const url = req.url ?? '';

  if (url === '/mcp' || url.startsWith('/mcp?')) {
    try {
      const server = new McpServer({ name: 'obsidian-vault-mcp', version: '2.0.0' });
      registerDevlogAppend(server);
      registerDevlogTail(server);
      registerAdrWrite(server);
      registerAdrDelete(server);
      registerAdrIndex(server);
      registerAdrView(server);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session tracking
      });
      await server.connect(transport);
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
