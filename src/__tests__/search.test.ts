import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { type ChildProcess, execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Callback signature as promisify invokes our mock.
 * The real execFile callback is (err, stdout, stderr), but because our vi.fn() mock
 * has no util.promisify.custom, promisify resolves the promise with the first
 * non-error argument. We pass { stdout } as that argument so the search handler
 * can destructure `const { stdout } = await execFileAsync(...)`.
 */
type MockExecCallback = (err: Error | null, result?: { stdout: string }) => void;

// Must be hoisted before importing search.ts so that promisify(execFile) wraps the mock
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { registerSearchTools } from '../tools/search.js';

const mockExecFile = vi.mocked(execFile);

// ---------------------------------------------------------------------------
// Capture the vault_search handler by feeding a fake MCP server
// ---------------------------------------------------------------------------
type SearchArgs = { query: string; path_filter?: string; repository_name: string };
type SearchResult = { content: Array<{ type: 'text'; text: string }> };
let vaultSearchHandler: (args: SearchArgs) => Promise<SearchResult>;

const fakeServer = {
  registerTool: vi.fn((name: string, _schema: unknown, handler: typeof vaultSearchHandler) => {
    if (name === 'vault_search') vaultSearchHandler = handler;
  }),
} as any;

registerSearchTools(fakeServer);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build fake ripgrep --json stdout for a list of matches */
function makeRgOutput(
  baseDir: string,
  matches: Array<{ relPath: string; line: number; text: string }>,
): string {
  const lines = matches.map(m =>
    JSON.stringify({
      type: 'match',
      data: {
        path: { text: path.join(baseDir, m.relPath) },
        line_number: m.line,
        lines: { text: m.text + '\n' },
      },
    }),
  );
  lines.push(JSON.stringify({ type: 'summary', data: {} }));
  return lines.join('\n') + '\n';
}

/** Make the mock resolve with the given stdout string */
function mockRgSuccess(stdout: string): void {
  mockExecFile.mockImplementation((...args) => {
    const cb = args[args.length - 1] as MockExecCallback;
    cb(null, { stdout });
    return {} as ChildProcess;
  });
}

/** Make the mock reject with an error carrying the given exit code */
function mockRgError(code: number, message = 'rg error'): void {
  const err = Object.assign(new Error(message), { code });
  mockExecFile.mockImplementation((...args) => {
    const cb = args[args.length - 1] as MockExecCallback;
    cb(err);
    return {} as ChildProcess;
  });
}

/** Return the args array that was passed to the rg call */
function capturedRgArgs(): string[] {
  return mockExecFile.mock.calls[0][1] as string[];
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'search-test-'));
  process.env.VAULT_PATH = tempDir;
  vi.clearAllMocks();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

// ---------------------------------------------------------------------------
// Result parsing
// ---------------------------------------------------------------------------
describe('result parsing', () => {
  it('returns parsed match results with repo-relative paths', async () => {
    const repoRoot = path.join(tempDir, 'test-repo');
    mockRgSuccess(
      makeRgOutput(repoRoot, [
        { relPath: 'devlog/note.md', line: 3, text: 'hello world' },
        { relPath: 'other.md', line: 10, text: 'another match' },
      ]),
    );

    const result = await vaultSearchHandler({ query: 'hello', repository_name: 'test-repo' });
    const { results } = JSON.parse(result.content[0].text);

    expect(results).toEqual([
      { path: 'devlog/note.md', line: 3, text: 'hello world' },
      { path: 'other.md', line: 10, text: 'another match' },
    ]);
  });

  it('trims trailing newline/whitespace from matched text', async () => {
    const repoRoot = path.join(tempDir, 'test-repo');
    mockRgSuccess(makeRgOutput(repoRoot, [{ relPath: 'a.md', line: 1, text: 'trimmed  ' }]));

    const result = await vaultSearchHandler({ query: 'trimmed', repository_name: 'test-repo' });
    const { results } = JSON.parse(result.content[0].text);

    expect(results[0].text).toBe('trimmed');
  });

  it('ignores non-match type lines (begin, end, summary, context)', async () => {
    const repoRoot = path.join(tempDir, 'test-repo');
    const output = [
      JSON.stringify({ type: 'begin', data: { path: { text: path.join(repoRoot, 'a.md') } } }),
      JSON.stringify({
        type: 'match',
        data: {
          path: { text: path.join(repoRoot, 'a.md') },
          line_number: 1,
          lines: { text: 'matched line\n' },
        },
      }),
      JSON.stringify({ type: 'context', data: { path: { text: path.join(repoRoot, 'a.md') }, line_number: 2, lines: { text: 'context\n' } } }),
      JSON.stringify({ type: 'end', data: {} }),
      JSON.stringify({ type: 'summary', data: {} }),
      '',
    ].join('\n');

    mockRgSuccess(output);

    const result = await vaultSearchHandler({ query: 'matched', repository_name: 'test-repo' });
    const { results } = JSON.parse(result.content[0].text);

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('matched line');
  });

  it('returns empty results when stdout is blank', async () => {
    mockRgSuccess('');

    const result = await vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' });
    const { results } = JSON.parse(result.content[0].text);

    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exit code handling
// ---------------------------------------------------------------------------
describe('exit code handling', () => {
  it('returns empty results when ripgrep exits with code 1 (no matches)', async () => {
    mockRgError(1, 'no matches found');

    const result = await vaultSearchHandler({ query: 'nonexistent', repository_name: 'test-repo' });
    const { results } = JSON.parse(result.content[0].text);

    expect(results).toEqual([]);
  });

  it('rethrows errors with exit code other than 1', async () => {
    mockRgError(127, 'rg: command not found');

    await expect(vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' })).rejects.toThrow('rg: command not found');
  });

  it('rethrows errors with exit code 2', async () => {
    mockRgError(2, 'rg: invalid argument');

    await expect(vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// path_filter / --glob argument handling
// ---------------------------------------------------------------------------
describe('path_filter argument handling', () => {
  beforeEach(() => {
    mockRgSuccess(''); // No matches needed; we only inspect args
  });

  it('includes --json as the first argument', async () => {
    await vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' });
    expect(capturedRgArgs()[0]).toBe('--json');
  });

  it('passes the repo-scoped path as the last argument to rg', async () => {
    await vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' });
    const args = capturedRgArgs();
    expect(args[args.length - 1]).toBe(path.join(tempDir, 'test-repo'));
  });

  it('does not include --glob when path_filter is omitted', async () => {
    await vaultSearchHandler({ query: 'foo', repository_name: 'test-repo' });
    expect(capturedRgArgs()).not.toContain('--glob');
  });

  it('prepends **/ to path_filter that does not start with **/', async () => {
    await vaultSearchHandler({ query: 'foo', path_filter: 'devlog/*.md', repository_name: 'test-repo' });
    const args = capturedRgArgs();
    const globIdx = args.indexOf('--glob');
    expect(globIdx).toBeGreaterThan(-1);
    expect(args[globIdx + 1]).toBe('**/devlog/*.md');
  });

  it('uses path_filter as-is when it already starts with **/', async () => {
    await vaultSearchHandler({ query: 'foo', path_filter: '**/devlog/*.md', repository_name: 'test-repo' });
    const args = capturedRgArgs();
    const globIdx = args.indexOf('--glob');
    expect(args[globIdx + 1]).toBe('**/devlog/*.md');
  });

  it('does not double-prepend **/ to a filter that already has it', async () => {
    await vaultSearchHandler({ query: 'foo', path_filter: '**/sub/dir/*.md', repository_name: 'test-repo' });
    const args = capturedRgArgs();
    const globIdx = args.indexOf('--glob');
    expect(args[globIdx + 1]).toBe('**/sub/dir/*.md'); // not ***//sub/dir/*.md
  });
});

// ---------------------------------------------------------------------------
// repository_name validation
// ---------------------------------------------------------------------------
describe('repository_name validation', () => {
  it('throws on repository_name containing slash', async () => {
    await expect(vaultSearchHandler({ query: 'foo', repository_name: 'foo/bar' })).rejects.toThrow('Invalid repository_name');
  });

  it('throws on repository_name ".."', async () => {
    await expect(vaultSearchHandler({ query: 'foo', repository_name: '..' })).rejects.toThrow('Invalid repository_name');
  });
});
