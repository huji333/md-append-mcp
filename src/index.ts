import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerNoteRead } from './controller/note_read.ts';
import { registerNoteUpsert } from './controller/note_upsert.ts';
import { registerNoteDelete } from './controller/note_delete.ts';
import { registerVaultSearch } from './controller/vault_search.ts';

const PORT = parseInt(process.env.PORT ?? '1065', 10);

const httpServer = http.createServer(async (req, res) => {
  const url = req.url ?? '';

  if (url === '/mcp' || url.startsWith('/mcp?')) {
    try {
      // Stateless mode: create a fresh server per request.
      // Our tools (note_read, note_upsert, vault_search) are side-effect-free
      // across requests, so no session state is needed.
      const server = new McpServer({ name: 'obsidian-vault-mcp', version: '1.0.0' });
      registerNoteRead(server);
      registerNoteUpsert(server);
      registerNoteDelete(server);
      registerVaultSearch(server);
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
