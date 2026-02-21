import { mock, describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { type ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createRipgrepService } from './ripgrep_service.ts';

type MockExecCallback = (err: Error | null, result?: { stdout: string }) => void;

const mockExecFile = mock((..._args: unknown[]) => ({}) as ChildProcess);
const runSearch = createRipgrepService(mockExecFile as unknown as Parameters<typeof createRipgrepService>[0]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function mockRgSuccess(stdout: string): void {
  mockExecFile.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as MockExecCallback;
    cb(null, { stdout });
    return {} as ChildProcess;
  });
}

function mockRgError(code: number, message = 'rg error'): void {
  const err = Object.assign(new Error(message), { code });
  mockExecFile.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as MockExecCallback;
    cb(err);
    return {} as ChildProcess;
  });
}

function capturedRgArgs(): string[] {
  return mockExecFile.mock.calls[0][1] as string[];
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'rg-test-'));
  mockExecFile.mockReset();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
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

    const results = await runSearch(repoRoot, 'hello');

    expect(results).toEqual([
      { path: 'devlog/note.md', line: 3, text: 'hello world' },
      { path: 'other.md', line: 10, text: 'another match' },
    ]);
  });

  it('trims trailing newline/whitespace from matched text', async () => {
    const repoRoot = path.join(tempDir, 'test-repo');
    mockRgSuccess(makeRgOutput(repoRoot, [{ relPath: 'a.md', line: 1, text: 'trimmed  ' }]));

    const results = await runSearch(repoRoot, 'trimmed');

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
      JSON.stringify({ type: 'end', data: {} }),
      JSON.stringify({ type: 'summary', data: {} }),
      '',
    ].join('\n');

    mockRgSuccess(output);

    const results = await runSearch(repoRoot, 'matched');

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe('matched line');
  });

  it('returns empty results when stdout is blank', async () => {
    mockRgSuccess('');
    expect(await runSearch(path.join(tempDir, 'r'), 'foo')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Exit code handling
// ---------------------------------------------------------------------------
describe('exit code handling', () => {
  it('returns empty results when ripgrep exits with code 1 (no matches)', async () => {
    mockRgError(1, 'no matches found');
    expect(await runSearch(path.join(tempDir, 'r'), 'nonexistent')).toEqual([]);
  });

  it('rethrows errors with exit code other than 1', async () => {
    mockRgError(127, 'rg: command not found');
    await expect(runSearch(path.join(tempDir, 'r'), 'foo')).rejects.toThrow('rg: command not found');
  });

  it('rethrows errors with exit code 2', async () => {
    mockRgError(2, 'rg: invalid argument');
    await expect(runSearch(path.join(tempDir, 'r'), 'foo')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// path_filter / --glob argument handling
// ---------------------------------------------------------------------------
describe('path_filter argument handling', () => {
  beforeEach(() => {
    mockRgSuccess('');
  });

  it('includes --json as the first argument', async () => {
    await runSearch(path.join(tempDir, 'r'), 'foo');
    expect(capturedRgArgs()[0]).toBe('--json');
  });

  it('passes the repo-scoped path as the last argument to rg', async () => {
    const repoRoot = path.join(tempDir, 'test-repo');
    await runSearch(repoRoot, 'foo');
    const args = capturedRgArgs();
    expect(args[args.length - 1]).toBe(repoRoot);
  });

  it('does not include --glob when path_filter is omitted', async () => {
    await runSearch(path.join(tempDir, 'r'), 'foo');
    expect(capturedRgArgs()).not.toContain('--glob');
  });

  it('prepends **/ to path_filter that does not start with **/', async () => {
    await runSearch(path.join(tempDir, 'r'), 'foo', 'devlog/*.md');
    const args = capturedRgArgs();
    const globIdx = args.indexOf('--glob');
    expect(globIdx).toBeGreaterThan(-1);
    expect(args[globIdx + 1]).toBe('**/devlog/*.md');
  });

  it('uses path_filter as-is when it already starts with **/', async () => {
    await runSearch(path.join(tempDir, 'r'), 'foo', '**/devlog/*.md');
    const args = capturedRgArgs();
    expect(args[args.indexOf('--glob') + 1]).toBe('**/devlog/*.md');
  });

  it('does not double-prepend **/ to a filter that already has it', async () => {
    await runSearch(path.join(tempDir, 'r'), 'foo', '**/sub/dir/*.md');
    const args = capturedRgArgs();
    expect(args[args.indexOf('--glob') + 1]).toBe('**/sub/dir/*.md');
  });
});
