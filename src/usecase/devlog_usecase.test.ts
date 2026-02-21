import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { appendDevlog, tailDevlog } from './devlog_usecase.ts';

const REPO = 'test-repo';
const SESSION = '20260221-1423';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'vault-devlog-'));
  process.env.VAULT_PATH = tempDir;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

describe('appendDevlog', () => {
  it('creates a new session file with frontmatter on first append', async () => {
    const result = await appendDevlog(REPO, SESSION, [
      { type: 'impl', content: 'added devlog tool' },
    ]);

    expect(result.created).toBe(true);
    expect(result.appended).toBe(1);

    const filePath = path.join(tempDir, REPO, 'devlog', `${SESSION}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('session: ' + SESSION);
    expect(content).toContain('repository: ' + REPO);
    expect(content).toContain('[impl]');
    expect(content).toContain('added devlog tool');
  });

  it('appends to an existing session file without frontmatter', async () => {
    await appendDevlog(REPO, SESSION, [{ type: 'impl', content: 'first' }]);
    const result = await appendDevlog(REPO, SESSION, [{ type: 'insight', content: 'second' }]);

    expect(result.created).toBe(false);
    expect(result.appended).toBe(1);

    const filePath = path.join(tempDir, REPO, 'devlog', `${SESSION}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('first');
    expect(content).toContain('second');
  });

  it('formats problem entries with resolution arrow', async () => {
    await appendDevlog(REPO, SESSION, [
      { type: 'problem', content: 'lint failed', resolution: 'added noEmit flag' },
    ]);

    const filePath = path.join(tempDir, REPO, 'devlog', `${SESSION}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('lint failed → added noEmit flag');
  });

  it('includes branch in parentheses when provided', async () => {
    await appendDevlog(REPO, SESSION, [
      { type: 'impl', content: 'new feature', branch: 'feat/new-tools' },
    ]);

    const content = await fs.readFile(
      path.join(tempDir, REPO, 'devlog', `${SESSION}.md`),
      'utf-8',
    );
    expect(content).toContain('(feat/new-tools)');
  });

  it('appends multiple entries in one call', async () => {
    const result = await appendDevlog(REPO, SESSION, [
      { type: 'impl', content: 'entry one' },
      { type: 'insight', content: 'entry two' },
    ]);

    expect(result.appended).toBe(2);
    const content = await fs.readFile(
      path.join(tempDir, REPO, 'devlog', `${SESSION}.md`),
      'utf-8',
    );
    expect(content).toContain('entry one');
    expect(content).toContain('entry two');
  });

  it('scopes files to separate repositories', async () => {
    await appendDevlog('repo-a', SESSION, [{ type: 'impl', content: 'from a' }]);
    await appendDevlog('repo-b', SESSION, [{ type: 'impl', content: 'from b' }]);

    const a = await fs.readFile(path.join(tempDir, 'repo-a', 'devlog', `${SESSION}.md`), 'utf-8');
    const b = await fs.readFile(path.join(tempDir, 'repo-b', 'devlog', `${SESSION}.md`), 'utf-8');
    expect(a).toContain('from a');
    expect(b).toContain('from b');
  });
});

describe('tailDevlog', () => {
  it('returns empty entries for a nonexistent session', async () => {
    const result = await tailDevlog(REPO, 'nonexistent', 20);
    expect(result.entries).toEqual([]);
  });

  it('returns the last N log lines', async () => {
    for (let i = 1; i <= 5; i++) {
      await appendDevlog(REPO, SESSION, [{ type: 'impl', content: `entry ${i}` }]);
    }

    const result = await tailDevlog(REPO, SESSION, 3);
    expect(result.entries.length).toBe(3);
    expect(result.entries[result.entries.length - 1]).toContain('entry 5');
  });
});
