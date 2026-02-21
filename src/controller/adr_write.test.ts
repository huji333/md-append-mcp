import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAdrWrite } from './adr_write.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerAdrWrite', () => {
  it('registers tool with name "adr_write"', () => {
    const { server, registerTool } = makeFakeServer();
    registerAdrWrite(server);
    expect(registerTool.mock.calls[0][0]).toBe('adr_write');
  });

  it('calls writeAdr and wraps result in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockWrite = mock(() => Promise.resolve({ number: 1, path: 'adr/ADR-001-use-bun.md' }));

    registerAdrWrite(server, { writeAdr: mockWrite });

    const handler = registerTool.mock.calls[0][2] as Function;
    const result = await handler({
      repository_name: 'my-repo',
      title: 'Use Bun',
      content: 'short content',
    });

    expect(mockWrite).toHaveBeenCalledWith('my-repo', 'Use Bun', 'short content', undefined, undefined, undefined);
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ number: 1, path: 'adr/ADR-001-use-bun.md' }) }],
    });
  });
});
