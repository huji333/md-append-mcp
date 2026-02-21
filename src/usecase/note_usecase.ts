import path from 'node:path';
import { validateRepositoryName, resolveSafe } from '../lib/path_validation.ts';
import * as repo from '../repository/note_repository.ts';
import type { NoteReadResult, NoteUpsertResult, NoteDeleteResult } from '../types/index.ts';

export function getVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) throw new Error('VAULT_PATH environment variable is not set');
  return vaultPath;
}

export function resolveSafePath(relativePath: string, repositoryName: string): string {
  validateRepositoryName(repositoryName);
  const vaultPath = path.resolve(getVaultPath());
  return resolveSafe(vaultPath, repositoryName, relativePath);
}

export async function readNote(
  relativePath: string,
  repositoryName: string,
): Promise<NoteReadResult> {
  return repo.readNote(resolveSafePath(relativePath, repositoryName));
}

export async function upsertNote(
  relativePath: string,
  content: string,
  repositoryName: string,
  frontmatter?: Record<string, unknown>,
): Promise<NoteUpsertResult> {
  const absPath = resolveSafePath(relativePath, repositoryName);
  if (await repo.noteExists(absPath)) {
    await repo.appendNote(absPath, content);
    return { created: false };
  }
  await repo.writeNote(absPath, content, frontmatter);
  return { created: true };
}

export async function deleteNote(
  relativePath: string,
  repositoryName: string,
): Promise<NoteDeleteResult> {
  return repo.deleteNote(resolveSafePath(relativePath, repositoryName));
}
