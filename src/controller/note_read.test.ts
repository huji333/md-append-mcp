import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerNoteRead } from './note_read.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerNoteRead', () => {
  it('registers tool with name "note_read"', () => {
    const { server, registerTool } = makeFakeServer();
    registerNoteRead(server);
    expect(registerTool.mock.calls[0][0]).toBe('note_read');
  });

  it('calls readNote with (path, repository_name)', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockReadNote = mock(() => Promise.resolve({ content: '# Hi', exists: true }));

    registerNoteRead(server, { readNote: mockReadNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    await handler({ repository_name: 'my-repo', path: 'note.md' });

    expect(mockReadNote).toHaveBeenCalledWith('note.md', 'my-repo');
  });

  it('wraps usecase result in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockReadNote = mock(() => Promise.resolve({ content: '# Hi', exists: true }));

    registerNoteRead(server, { readNote: mockReadNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    const result = await handler({ repository_name: 'my-repo', path: 'note.md' });

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ content: '# Hi', exists: true }) }],
    });
  });
});
