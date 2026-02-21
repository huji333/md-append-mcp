import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readNote, writeNote, appendNote, deleteNote, noteExists } from './note_repository.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'repo-test-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('readNote', () => {
  it('returns content and exists:true for existing file', async () => {
    const absPath = path.join(tempDir, 'note.md');
    await fs.writeFile(absPath, '# Hello', 'utf-8');
    expect(await readNote(absPath)).toEqual({ content: '# Hello', exists: true });
  });

  it('returns empty content and exists:false for missing file', async () => {
    expect(await readNote(path.join(tempDir, 'missing.md'))).toEqual({ content: '', exists: false });
  });
});

describe('writeNote', () => {
  it('creates file with plain content', async () => {
    const absPath = path.join(tempDir, 'new.md');
    await writeNote(absPath, 'Content');
    expect(await fs.readFile(absPath, 'utf-8')).toBe('Content');
  });

  it('creates parent directories automatically', async () => {
    const absPath = path.join(tempDir, 'deep/nested/note.md');
    await writeNote(absPath, 'x');
    expect(await fs.readFile(absPath, 'utf-8')).toBe('x');
  });

  it('creates file with frontmatter', async () => {
    const absPath = path.join(tempDir, 'fm.md');
    await writeNote(absPath, 'Body', { date: '2024-01-01', tags: ['test'] });
    const content = await fs.readFile(absPath, 'utf-8');
    expect(content).toContain('date:');
    expect(content).toContain('tags:');
    expect(content).toContain('Body');
  });
});

describe('appendNote', () => {
  it('appends content with a leading newline', async () => {
    const absPath = path.join(tempDir, 'note.md');
    await fs.writeFile(absPath, 'Original', 'utf-8');
    await appendNote(absPath, 'Appended');
    expect(await fs.readFile(absPath, 'utf-8')).toBe('Original\nAppended');
  });

  it('appends multiple times correctly', async () => {
    const absPath = path.join(tempDir, 'log.md');
    await fs.writeFile(absPath, 'Line1', 'utf-8');
    await appendNote(absPath, 'Line2');
    await appendNote(absPath, 'Line3');
    expect(await fs.readFile(absPath, 'utf-8')).toBe('Line1\nLine2\nLine3');
  });
});

describe('deleteNote', () => {
  it('deletes file and returns {deleted:true}', async () => {
    const absPath = path.join(tempDir, 'note.md');
    await fs.writeFile(absPath, 'x', 'utf-8');
    expect(await deleteNote(absPath)).toEqual({ deleted: true });
    await expect(fs.access(absPath)).rejects.toThrow();
  });

  it('returns {deleted:false} for missing file', async () => {
    expect(await deleteNote(path.join(tempDir, 'missing.md'))).toEqual({ deleted: false });
  });
});

describe('noteExists', () => {
  it('returns true for existing file', async () => {
    const absPath = path.join(tempDir, 'note.md');
    await fs.writeFile(absPath, 'x', 'utf-8');
    expect(await noteExists(absPath)).toBe(true);
  });

  it('returns false for missing file', async () => {
    expect(await noteExists(path.join(tempDir, 'missing.md'))).toBe(false);
  });
});
