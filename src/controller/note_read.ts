import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readNote as defaultReadNote } from '../usecase/note_usecase.ts';

type Deps = { readNote?: typeof defaultReadNote };

export function registerNoteRead(server: McpServer, { readNote = defaultReadNote }: Deps = {}): void {
  server.registerTool(
    'note_read',
    {
      description: 'Read a markdown note from the vault by its relative path',
      inputSchema: {
        repository_name: z.string().describe(
          'Repository or project name used to namespace vault paths (e.g. "my-repo")',
        ),
        path: z.string().describe(
          'Relative path to the note within the vault (e.g. devlog/2024-01-01.md)',
        ),
      },
    },
    async ({ repository_name, path: notePath }) => {
      const result = await readNote(notePath, repository_name);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
