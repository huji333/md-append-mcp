import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { appendDevlog as defaultAppendDevlog } from '../usecase/devlog_usecase.ts';

type Deps = { appendDevlog?: typeof defaultAppendDevlog };

export function registerDevlogAppend(server: McpServer, { appendDevlog = defaultAppendDevlog }: Deps = {}): void {
  server.registerTool(
    'devlog_append',
    {
      description: 'Append structured log entries to a session devlog file. Server injects HH:MM timestamp.',
      inputSchema: {
        repository_name: z.string().describe('Git repository name (used to namespace vault paths)'),
        session_id: z.string().regex(/^\d{8}-\d{4}$/, 'session_id must be in "YYYYMMDD-HHMM" format (e.g. "20260221-1423")'),
        entries: z.array(
          z.object({
            type: z.enum(['problem', 'impl', 'verify', 'insight']),
            content: z.string().describe('One concise sentence describing the observation'),
            resolution: z.string().optional().describe('How the problem was resolved (problem type only)'),
            branch: z.string().optional().describe('Git branch name for context'),
          }),
        ).min(1),
      },
    },
    async ({ repository_name, session_id, entries }) => {
      const result = await appendDevlog(repository_name, session_id, entries);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
