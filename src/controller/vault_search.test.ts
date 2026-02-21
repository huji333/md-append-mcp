import { describe, it, expect, mock } from 'bun:test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerVaultSearch } from './vault_search.ts';

function makeFakeServer() {
  const registerTool = mock();
  return { server: { registerTool } as unknown as McpServer, registerTool };
}

describe('registerVaultSearch', () => {
  it('registers tool with name "vault_search"', () => {
    const { server, registerTool } = makeFakeServer();
    registerVaultSearch(server);
    expect(registerTool.mock.calls[0][0]).toBe('vault_search');
  });

  it('calls searchVault with (query, repository_name)', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockSearchVault = mock(() => Promise.resolve([]));

    registerVaultSearch(server, { searchVault: mockSearchVault });

    const handler = registerTool.mock.calls[0][2];
    await handler({ repository_name: 'my-repo', query: 'hello' });

    expect(mockSearchVault.mock.calls[0]).toEqual(['hello', 'my-repo', undefined]);
  });

  it('passes path_filter to searchVault', async () => {
    const { server, registerTool } = makeFakeServer();
    const mockSearchVault = mock(() => Promise.resolve([]));

    registerVaultSearch(server, { searchVault: mockSearchVault });

    const handler = registerTool.mock.calls[0][2];
    await handler({ repository_name: 'r', query: 'q', path_filter: 'devlog/*.md' });

    expect(mockSearchVault.mock.calls[0][2]).toBe('devlog/*.md');
  });

  it('wraps results array in MCP content format', async () => {
    const { server, registerTool } = makeFakeServer();
    const results = [{ path: 'note.md', line: 1, text: 'hello' }];
    const mockSearchVault = mock(() => Promise.resolve(results));

    registerVaultSearch(server, { searchVault: mockSearchVault });

    const handler = registerTool.mock.calls[0][2];
    const result = await handler({ repository_name: 'r', query: 'hello' });

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify({ results }) }],
    });
  });
});
