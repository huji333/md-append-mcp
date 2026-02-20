import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getVaultPath, resolveSafePath, readNote, deleteNote, upsertNote } from '../vault.js';

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
    const result = resolveSafePath('note.md');
    expect(result).toBe(path.join(tempDir, 'note.md'));
  });

  it('resolves a nested relative path', () => {
    const result = resolveSafePath('devlog/2024-01-01.md');
    expect(result).toBe(path.join(tempDir, 'devlog/2024-01-01.md'));
  });

  it('throws on path traversal (../../)', () => {
    expect(() => resolveSafePath('../../etc/passwd')).toThrow('escapes the vault root');
  });

  it('throws on path that resolves to vault root itself (empty string)', () => {
    expect(() => resolveSafePath('')).toThrow('escapes the vault root');
  });

  it('throws on single dot (resolves to vault root)', () => {
    expect(() => resolveSafePath('.')).toThrow('escapes the vault root');
  });

  it('throws on path traversal that sneaks through sub-dir', () => {
    expect(() => resolveSafePath('devlog/../../secret')).toThrow('escapes the vault root');
  });
});

// ---------------------------------------------------------------------------
// readNote
// ---------------------------------------------------------------------------
describe('readNote', () => {
  it('returns content and exists:true for an existing file', async () => {
    await fs.writeFile(path.join(tempDir, 'hello.md'), '# Hello', 'utf-8');
    const result = await readNote('hello.md');
    expect(result).toEqual({ content: '# Hello', exists: true });
  });

  it('returns empty content and exists:false for a missing file', async () => {
    const result = await readNote('nonexistent.md');
    expect(result).toEqual({ content: '', exists: false });
  });

  it('reads a file in a sub-directory', async () => {
    await fs.mkdir(path.join(tempDir, 'sub'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'sub', 'note.md'), 'content', 'utf-8');
    const result = await readNote('sub/note.md');
    expect(result).toEqual({ content: 'content', exists: true });
  });
});

// ---------------------------------------------------------------------------
// deleteNote
// ---------------------------------------------------------------------------
describe('deleteNote', () => {
  it('deletes an existing file and returns deleted:true', async () => {
    const filePath = path.join(tempDir, 'to-delete.md');
    await fs.writeFile(filePath, 'content', 'utf-8');

    const result = await deleteNote('to-delete.md');

    expect(result).toEqual({ deleted: true });
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('returns deleted:false for a non-existent file', async () => {
    const result = await deleteNote('nonexistent.md');
    expect(result).toEqual({ deleted: false });
  });

  it('does not affect other files in the same directory', async () => {
    await fs.writeFile(path.join(tempDir, 'keep.md'), 'keep', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'remove.md'), 'remove', 'utf-8');

    await deleteNote('remove.md');

    const kept = await fs.readFile(path.join(tempDir, 'keep.md'), 'utf-8');
    expect(kept).toBe('keep');
  });
});

// ---------------------------------------------------------------------------
// upsertNote
// ---------------------------------------------------------------------------
describe('upsertNote', () => {
  describe('new file (does not exist)', () => {
    it('creates file with plain content and returns created:true', async () => {
      const result = await upsertNote('new.md', 'Hello');
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, 'new.md'), 'utf-8');
      expect(content).toBe('Hello');
    });

    it('creates file with frontmatter', async () => {
      const result = await upsertNote('fm.md', 'Body text', { tags: ['test'], date: '2024-01-01' });
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, 'fm.md'), 'utf-8');
      expect(content).toContain('tags:');
      expect(content).toContain('date:');
      expect(content).toContain('Body text');
    });

    it('creates parent directories automatically', async () => {
      const result = await upsertNote('deep/nested/note.md', 'Content');
      expect(result).toEqual({ created: true });
      const content = await fs.readFile(path.join(tempDir, 'deep/nested/note.md'), 'utf-8');
      expect(content).toBe('Content');
    });
  });

  describe('existing file (append)', () => {
    it('appends content with a leading newline and returns created:false', async () => {
      const filePath = path.join(tempDir, 'existing.md');
      await fs.writeFile(filePath, 'Original', 'utf-8');

      const result = await upsertNote('existing.md', 'Appended');

      expect(result).toEqual({ created: false });
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Original\nAppended');
    });

    it('appends multiple times correctly', async () => {
      const filePath = path.join(tempDir, 'log.md');
      await fs.writeFile(filePath, 'Line1', 'utf-8');

      await upsertNote('log.md', 'Line2');
      await upsertNote('log.md', 'Line3');

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('Line1\nLine2\nLine3');
    });

    it('ignores frontmatter argument when appending to existing file', async () => {
      const filePath = path.join(tempDir, 'existing.md');
      await fs.writeFile(filePath, '# Title', 'utf-8');

      await upsertNote('existing.md', 'new line', { tags: ['ignored'] });

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe('# Title\nnew line');
      expect(content).not.toContain('tags:');
    });
  });
});
