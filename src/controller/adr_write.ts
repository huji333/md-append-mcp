import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { writeAdr as defaultWriteAdr } from '../usecase/adr_usecase.ts';

type Deps = { writeAdr?: typeof defaultWriteAdr };

export function registerAdrWrite(server: McpServer, { writeAdr = defaultWriteAdr }: Deps = {}): void {
  server.registerTool(
    'adr_write',
    {
      description: 'Create a new ADR (auto-numbered). Content must be under 500 chars to keep ADRs concise.',
      inputSchema: {
        repository_name: z.string().describe('Git repository name'),
        title: z.string().describe('Short title for the ADR'),
        content: z.string().describe('ADR body (Context, Decision, Consequences). Limit set by ADR_BODY_LIMIT_CHARS (default: 1000).'),
        branch: z.string().optional().describe('Git branch where the decision was made'),
        status: z.enum(['proposed', 'accepted']).optional().describe('Default: "accepted"'),
        related: z.array(z.string()).optional().describe('Related GitHub URLs'),
      },
    },
    async ({ repository_name, title, content, branch, status, related }) => {
      const result = await writeAdr(repository_name, title, content, branch, status, related);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
