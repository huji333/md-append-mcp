import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDevlogAppend } from './devlog_append.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerDevlogAppend', () => {
  it('registers tool with name "devlog_append"', () => {
    const { server, registerTool } = makeFakeServer();
    registerDevlogAppend(server);
    expect(registerTool.mock.calls[0][0]).toBe('devlog_append');
  });

  it('calls appendDevlog with correct arguments', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockAppend = mock(() => Promise.resolve({ appended: 1, created: true }));

    registerDevlogAppend(server, { appendDevlog: mockAppend });

    const handler = registerTool.mock.calls[0][2] as Function;
    const entries = [{ type: 'impl' as const, content: 'did something' }];
    await handler({ repository_name: 'my-repo', session_id: '20260221-1423', entries });

    expect(mockAppend).toHaveBeenCalledWith('my-repo', '20260221-1423', entries);
  });

  it('wraps result in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockAppend = mock(() => Promise.resolve({ appended: 2, created: false }));

    registerDevlogAppend(server, { appendDevlog: mockAppend });

    const handler = registerTool.mock.calls[0][2] as Function;
    const result = await handler({
      repository_name: 'r',
      session_id: '20260221-1423',
      entries: [{ type: 'insight' as const, content: 'x' }],
    });

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ appended: 2, created: false }) }],
    });
  });
});
