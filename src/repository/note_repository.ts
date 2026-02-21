import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { NoteReadResult, NoteDeleteResult } from '../types/index.ts';

export async function readNote(absPath: string): Promise<NoteReadResult> {
  try {
    const content = await fs.readFile(absPath, 'utf-8');
    return { content, exists: true };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { content: '', exists: false };
    }
    throw err;
  }
}

export async function writeNote(
  absPath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<void> {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const fileContent = frontmatter ? matter.stringify('\n' + content, frontmatter) : content;
  await fs.writeFile(absPath, fileContent, 'utf-8');
}

export async function appendNote(absPath: string, content: string): Promise<void> {
  await fs.appendFile(absPath, '\n' + content, 'utf-8');
}

export async function deleteNote(absPath: string): Promise<NoteDeleteResult> {
  try {
    await fs.unlink(absPath);
    return { deleted: true };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { deleted: false };
    }
    throw err;
  }
}

export async function noteExists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function listDir(absPath: string): Promise<string[]> {
  try {
    return await fs.readdir(absPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}
