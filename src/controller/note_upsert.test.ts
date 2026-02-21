import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerNoteUpsert } from './note_upsert.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerNoteUpsert', () => {
  it('registers tool with name "note_upsert"', () => {
    const { server, registerTool } = makeFakeServer();
    registerNoteUpsert(server);
    expect(registerTool.mock.calls[0][0]).toBe('note_upsert');
  });

  it('calls upsertNote with (path, content, repository_name)', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockUpsertNote = mock(() => Promise.resolve({ created: true }));

    registerNoteUpsert(server, { upsertNote: mockUpsertNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    await handler({ repository_name: 'my-repo', path: 'note.md', content: 'Hello' });

    expect(mockUpsertNote).toHaveBeenCalledWith('note.md', 'Hello', 'my-repo', undefined);
  });

  it('passes frontmatter to upsertNote', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockUpsertNote = mock(() => Promise.resolve({ created: true }));

    registerNoteUpsert(server, { upsertNote: mockUpsertNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    const fm = { date: '2024-01-01', tags: ['test'] };
    await handler({ repository_name: 'r', path: 'n.md', content: 'body', frontmatter: fm });

    expect(mockUpsertNote).toHaveBeenCalledWith('n.md', 'body', 'r', fm);
  });

  it('wraps usecase result in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockUpsertNote = mock(() => Promise.resolve({ created: false }));

    registerNoteUpsert(server, { upsertNote: mockUpsertNote });

    const handler = registerTool.mock.calls[0][2] as Function;
    const result = await handler({ repository_name: 'r', path: 'n.md', content: 'x' });

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ created: false }) }],
    });
  });
});
