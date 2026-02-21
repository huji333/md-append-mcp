import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tailDevlog as defaultTailDevlog } from '../usecase/devlog_usecase.ts';

type Deps = { tailDevlog?: typeof defaultTailDevlog };

export function registerDevlogTail(server: McpServer, { tailDevlog = defaultTailDevlog }: Deps = {}): void {
  server.registerTool(
    'devlog_tail',
    {
      description: 'Read the last N log entries from a session devlog file',
      inputSchema: {
        repository_name: z.string().describe('Git repository name'),
        session_id: z.string().regex(/^\d{8}-\d{4}$/, 'session_id must be in "YYYYMMDD-HHMM" format'),
        n: z.number().int().positive().optional().describe('Number of entries to return (default: 20)'),
      },
    },
    async ({ repository_name, session_id, n }) => {
      const result = await tailDevlog(repository_name, session_id, n ?? 20);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
