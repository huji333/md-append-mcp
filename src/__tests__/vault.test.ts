import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getVaultPath, resolveSafePath, readNote, deleteNote, upsertNote } from '../vault.js';

const REPO = 'test-repo';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'vault-test-'));
  process.env.VAULT_PATH = tempDir;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

// ---------------------------------------------------------------------------
// getVaultPath
// ---------------------------------------------------------------------------
describe('getVaultPath', () => {
  it('returns VAULT_PATH when set', () => {
    expect(getVaultPath()).toBe(tempDir);
  });

  it('throws when VAULT_PATH is not set', () => {
    delete process.env.VAULT_PATH;
    expect(() => getVaultPath()).toThrow('VAULT_PATH environment variable is not set');
  });
});

// ---------------------------------------------------------------------------
// resolveSafePath
// ---------------------------------------------------------------------------
describe('resolveSafePath', () => {
  it('resolves a simple relative path', () => {
    const result = resolveSafePath('note.md', REPO);
    expect(result).toBe(path.join(tempDir, REPO, 'note.md'));
  });

  it('resolves a nested relative path', () => {
    const result = resolveSafePath('devlog/2024-01-01.md', REPO);
    expect(result).toBe(path.join(tempDir, REPO, 'devlog/2024-01-01.md'));
  });

  it('throws on path traversal that escapes vault (../../)', () => {
    expect(() => resolveSafePath('../../etc/passwd', REPO)).toThrow('escapes the vault root');
  });

  it('throws on path traversal that sneaks through sub-dir and escapes vault', () => {
    expect(() => resolveSafePath('devlog/../../../etc/passwd', REPO)).toThrow('escapes the vault root');
  });

  it('throws on invalid repository_name containing slash', () => {
    expect(() => resolveSafePath('note.md', 'foo/bar')).toThrow('Invalid repository_name');
  });

  it('throws on repository_name ".."', () => {
    expect(() => resolveSafePath('note.md', '..')).toThrow('Invalid repository_name');
  });

  it('throws on repository_name "."', () => {
    expect(() => resolveSafePath('note.md', '.')).toThrow('Invalid repository_name');
  });

  it('throws on empty repository_name', () => {
    expect(() => resolveSafePath('note.md', '')).toThrow('Invalid repository_name');
  });

  it('different repository names resolve to different paths', () => {
    const pathA = resolveSafePath('note.md', 'repo-a');
    const pathB = resolveSafePath('note.md', 'repo-b');
    expect(pathA).toBe(path.join(tempDir, 'repo-a', 'note.md'));
    expect(pathB).toBe(path.join(tempDir, 'repo-b', 'note.md'));
    expect(pathA).not.toBe(pathB);
  });
});

// ---------------------------------------------------------------------------
// readNote
// ---------------------------------------------------------------------------
describe('readNote', () => {
  it('returns content and exists:true for an existing file', async () => {
    await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
    await fs.writeFile(path.join(tempDir, REPO, 'hello.md'), '# Hello', 'utf-8');
    const result = await readNote('hello.md', REPO);
    expect(result).toEqual({ content: '# Hello', exists: true });
  });

  it('returns empty content and exists:false for a missing file', async () => {
    const result = await readNote('nonexistent.md', REPO);
    expect(result).toEqual({ content: '', exists: false });
  });

  it('reads a file in a sub-directory', async () => {
    await fs.mkdir(path.join(tempDir, REPO, 'sub'), { recursive: true });
    await fs.writeFile(path.join(tempDir, REPO, 'sub', 'note.md'), 'content', 'utf-8');
    const result = await readNote('sub/note.md', REPO);
    expect(result).toEqual({ content: 'content', exists: true });
  });

  it('reads from separate repositories independently', async () => {
    await fs.mkdir(path.join(tempDir, 'repo-a'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'repo-b'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'repo-a', 'note.md'), 'from-a', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'repo-b', 'note.md'), 'from-b', 'utf-8');

    const a = await readNote('note.md', 'repo-a');
    const b = await readNote('note.md', 'repo-b');
    expect(a.content).toBe('from-a');
    expect(b.content).toBe('from-b');
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------
describe('deleteNote', () => {
  it('deletes an existing file and returns deleted:true', async () => {
    const filePath = path.join(tempDir, REPO, 'to-delete.md');
    await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
    await fs.writeFile(filePath, 'content', 'utf-8');

    const result = await deleteNote('to-delete.md', REPO);

    expect(result).toEqual({ deleted: true });
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('returns deleted:false for a non-existent file', async () => {
    const result = await deleteNote('nonexistent.md', REPO);
    expect(result).toEqual({ deleted: false });
  });

  it('does not affect other files in the same directory', async () => {
    await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
    await fs.writeFile(path.join(tempDir, REPO, 'keep.md'), 'keep', 'utf-8');
    await fs.writeFile(path.join(tempDir, REPO, 'remove.md'), 'remove', 'utf-8');

    await deleteNote('remove.md', REPO);

    const kept = await fs.readFile(path.join(tempDir, REPO, 'keep.md'), 'utf-8');
    expect(kept).toBe('keep');
  });
});

// ---------------------------------------------------------------------------
// upsertNote
// ---------------------------------------------------------------------------
describe('upsertNote', () => {
  describe('new file (does not exist)', () => {
    it('creates file with plain content and returns created:true', async () => {
      const result = await upsertNote('new.md', 'Hello', REPO);
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, REPO, 'new.md'), 'utf-8');
      expect(content).toBe('Hello');
    });

    it('creates file with frontmatter', async () => {
      const result = await upsertNote('fm.md', 'Body text', REPO, { tags: ['test'], date: '2024-01-01' });
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, REPO, 'fm.md'), 'utf-8');
      expect(content).toContain('tags:');
      expect(content).toContain('date:');
      expect(content).toContain('Body text');
    });

    it('creates parent directories automatically', async () => {
      const result = await upsertNote('deep/nested/note.md', 'Content', REPO);
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, REPO, 'deep/nested/note.md'), 'utf-8');
      expect(content).toBe('Content');
    });

    it('writes to separate repo paths for different repository names', async () => {
      await upsertNote('note.md', 'content-a', 'repo-a');
      await upsertNote('note.md', 'content-b', 'repo-b');
      const a = await fs.readFile(path.join(tempDir, 'repo-a', 'note.md'), 'utf-8');
      const b = await fs.readFile(path.join(tempDir, 'repo-b', 'note.md'), 'utf-8');
      expect(a).toBe('content-a');
      expect(b).toBe('content-b');
    });
  });

  describe('existing file (append)', () => {
    it('appends content with a leading newline and returns created:false', async () => {
      const filePath = path.join(tempDir, REPO, 'existing.md');
      await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
      await fs.writeFile(filePath, 'Original', 'utf-8');

      const result = await upsertNote('existing.md', 'Appended', REPO);

      expect(result).toEqual({ created: false });
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Original\nAppended');
    });

    it('appends multiple times correctly', async () => {
      const filePath = path.join(tempDir, REPO, 'log.md');
      await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
      await fs.writeFile(filePath, 'Line1', 'utf-8');

      await upsertNote('log.md', 'Line2', REPO);
      await upsertNote('log.md', 'Line3', REPO);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Line1\nLine2\nLine3');
    });

    it('ignores frontmatter argument when appending to existing file', async () => {
      const filePath = path.join(tempDir, REPO, 'existing.md');
      await fs.mkdir(path.join(tempDir, REPO), { recursive: true });
      await fs.writeFile(filePath, '# Title', 'utf-8');

      await upsertNote('existing.md', 'new line', REPO, { tags: ['ignored'] });

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('# Title\nnew line');
      expect(content).not.toContain('tags:');
    });
  });
});
