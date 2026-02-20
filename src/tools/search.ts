import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getVaultPath } from '../vault.js';

const execFileAsync = promisify(execFile);

type RgMatchLine = {
  type: 'match';
  data: {
    path: { text: string };
    line_number: number;
    lines: { text: string };
  };
};

type RgLine = RgMatchLine | { type: string };

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'vault_search',
    {
      description: 'Full-text search across the vault using ripgrep',
      inputSchema: {
        query: z.string().describe('Search query (ripgrep regex pattern)'),
        path_filter: z
          .string()
          .optional()
          .describe('Glob pattern to restrict search scope (e.g. devlog/*.md)'),
      },
    },
    async ({ query, path_filter: pathFilter }) => {
      const vaultPath = getVaultPath();
      const args = ['--json', query];
      if (pathFilter) {
        const glob = pathFilter.startsWith('**/') ? pathFilter : `**/${pathFilter}`;
        args.push('--glob', glob);
      }
      args.push(vaultPath);

      try {
        const { stdout } = await execFileAsync('rg', args, {
          maxBuffer: 10 * 1024 * 1024,
        });

        const results: Array<{ path: string; line: number; text: string }> = [];
        for (const raw of stdout.split('\n')) {
          if (!raw.trim()) continue;
          const obj = JSON.parse(raw) as RgLine;
          if (obj.type === 'match') {
            const m = obj as RgMatchLine;
            results.push({
              path: path.relative(vaultPath, m.data.path.text),
              line: m.data.line_number,
              text: m.data.lines.text.trimEnd(),
            });
          }
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ results }) }],
        };
      } catch (err: unknown) {
        // ripgrep exits with code 1 when no matches found — not an error
        if ((err as { code?: number }).code === 1) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ results: [] }) }],
          };
        }
        throw err;
      }
    },
  );
}
