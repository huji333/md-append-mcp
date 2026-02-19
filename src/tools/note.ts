import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readNote, upsertNote } from '../vault.js';

export function registerNoteTools(server: McpServer): void {
  server.registerTool(
    'note_read',
    {
      description: 'Read a markdown note from the vault by its relative path',
      inputSchema: {
        path: z.string().describe(
          'Relative path to the note within the vault (e.g. devlog/2024-01-01.md)',
        ),
      },
    },
    async ({ path: notePath }) => {
      const result = await readNote(notePath);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );

  server.registerTool(
    'note_upsert',
    {
      description:
        'Create a note with optional frontmatter if it does not exist, or append content to the end if it does',
      inputSchema: {
        path: z
          .string()
          .describe('Relative path to the note within the vault'),
        content: z.string().describe('Content to write (new file) or append (existing file)'),
        frontmatter: z
          .record(z.unknown())
          .optional()
          .describe('Frontmatter fields for new notes only (e.g. { date, tags })'),
      },
    },
    async ({ path: notePath, content, frontmatter }) => {
      const result = await upsertNote(
        notePath,
        content,
        frontmatter as Record<string, unknown> | undefined,
      );
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      };
    },
  );
}
