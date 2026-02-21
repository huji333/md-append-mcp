import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import type { SearchResult } from '../types/index.ts';

type ExecFileFn = typeof nodeExecFile;

type RgMatchLine = {
  type: 'match';
  data: {
    path: { text: string };
    line_number: number;
    lines: { text: string };
  };
};

type RgLine = RgMatchLine | { type: string };

export function createRipgrepService(execFileFn: ExecFileFn = nodeExecFile) {
  const execFileAsync = promisify(execFileFn);

  return async function runSearch(
    repoRoot: string,
    query: string,
    pathFilter?: string,
  ): Promise<SearchResult[]> {
    const args = ['--json', query];
    if (pathFilter) {
      const glob = pathFilter.startsWith('**/') ? pathFilter : `**/${pathFilter}`;
      args.push('--glob', glob);
    }
    args.push(repoRoot);

    try {
      const { stdout } = await execFileAsync('rg', args, { maxBuffer: 10 * 1024 * 1024 });
      const results: SearchResult[] = [];
      for (const raw of stdout.split('\n')) {
        if (!raw.trim()) continue;
        const obj = JSON.parse(raw) as RgLine;
        if (obj.type === 'match') {
          const m = obj as RgMatchLine;
          results.push({
            path: path.relative(repoRoot, m.data.path.text),
            line: m.data.line_number,
            text: m.data.lines.text.trimEnd(),
          });
        }
      }
      return results;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 1) return [];
      throw err;
    }
  };
}

export const runSearch = createRipgrepService();
