import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { indexAdrs as defaultIndexAdrs } from '../usecase/adr_usecase.ts';

type Deps = { indexAdrs?: typeof defaultIndexAdrs };

export function registerAdrIndex(server: McpServer, { indexAdrs = defaultIndexAdrs }: Deps = {}): void {
  server.registerTool(
    'adr_index',
    {
      description: 'List all ADRs for a repository. Use this to check existing ADRs before writing a new one.',
      inputSchema: {
        repository_name: z.string().describe('Git repository name'),
      },
    },
    async ({ repository_name }) => {
      const result = await indexAdrs(repository_name);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
