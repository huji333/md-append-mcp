import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerNoteDelete } from './note_delete.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerNoteDelete', () => {
  it('registers tool with name "note_delete"', () => {
    const { server, registerTool } = makeFakeServer();
    registerNoteDelete(server);
    expect(registerTool.mock.calls[0][0]).toBe('note_delete');
  });

  it('calls deleteNote with (path, repository_name)', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockDeleteNote = mock(() => Promise.resolve({ deleted: true }));

    registerNoteDelete(server, { deleteNote: mockDeleteNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    await handler({ repository_name: 'my-repo', path: 'note.md' });

    expect(mockDeleteNote).toHaveBeenCalledWith('note.md', 'my-repo');
  });

  it('wraps usecase result in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockDeleteNote = mock(() => Promise.resolve({ deleted: false }));

    registerNoteDelete(server, { deleteNote: mockDeleteNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    const result = await handler({ repository_name: 'my-repo', path: 'note.md' });

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ deleted: false }) }],
    });
  });
});
