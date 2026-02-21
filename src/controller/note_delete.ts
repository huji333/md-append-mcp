import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { deleteNote as defaultDeleteNote } from '../usecase/note_usecase.ts';

type Deps = { deleteNote?: typeof defaultDeleteNote };

export function registerNoteDelete(server: McpServer, { deleteNote = defaultDeleteNote }: Deps = {}): void {
  server.registerTool(
    'note_delete',
    {
      description: 'Delete a note from the vault by its relative path',
      inputSchema: {
        repository_name: z.string().describe(
          'Repository or project name used to namespace vault paths (e.g. "my-repo")',
        ),
        path: z.string().describe('Relative path to the note within the vault'),
      },
    },
    async ({ repository_name, path: notePath }) => {
      const result = await deleteNote(notePath, repository_name);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    },
  );
}
