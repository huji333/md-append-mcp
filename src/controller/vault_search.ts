import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { searchVault as defaultSearchVault } from '../usecase/search_usecase.ts';

type Deps = { searchVault?: typeof defaultSearchVault };

export function registerVaultSearch(server: McpServer, { searchVault = defaultSearchVault }: Deps = {}): void {
  server.registerTool(
    'vault_search',
    {
      description: 'Full-text search across the vault using ripgrep',
      inputSchema: {
        repository_name: z.string().describe(
          'Repository or project name to scope the search within',
        ),
        query: z.string().describe('Search query (ripgrep regex pattern)'),
        path_filter: z
          .string()
          .optional()
          .describe('Glob pattern to restrict search scope (e.g. devlog/*.md)'),
      },
    },
    async ({ repository_name, query, path_filter }) => {
      const results = await searchVault(query, repository_name, path_filter);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ results }) }] };
    },
  );
}
