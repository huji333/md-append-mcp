import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { viewAdr as defaultViewAdr } from '../usecase/adr_usecase.ts';

type Deps = { viewAdr?: typeof defaultViewAdr };

export function registerAdrView(server: McpServer, { viewAdr = defaultViewAdr }: Deps = {}): void {
  server.registerTool(
    'adr_view',
    {
      description: 'Read a specific ADR by number',
      inputSchema: {
        repository_name: z.string().describe('Git repository name'),
        number: z.number().int().positive().describe('ADR number to read (e.g. 3 for ADR-003)'),
      },
    },
    async ({ repository_name, number }) => {
      const result = await viewAdr(repository_name, number);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
