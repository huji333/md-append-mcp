import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteAdr as defaultDeleteAdr } from '../usecase/adr_usecase.ts';

type Deps = { deleteAdr?: typeof defaultDeleteAdr };

export function registerAdrDelete(server: McpServer, { deleteAdr = defaultDeleteAdr }: Deps = {}): void {
  server.registerTool(
    'adr_delete',
    {
      description: 'Delete an ADR by its number. Note: _index.md is not updated automatically.',
      inputSchema: {
        repository_name: z.string().describe('Git repository name'),
        number: z.number().int().positive().describe('ADR number to delete (e.g. 3 for ADR-003)'),
      },
    },
    async ({ repository_name, number }) => {
      const result = await deleteAdr(repository_name, number);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
