import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export function getVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) throw new Error('VAULT_PATH environment variable is not set');
  return vaultPath;
}

/**
 * Resolves a vault-relative path to an absolute path.
 * Throws if the resolved path escapes the vault root (path traversal protection).
 */
export function resolveSafePath(relativePath: string): string {
  const vaultPath = path.resolve(getVaultPath());
  const resolved = path.resolve(vaultPath, relativePath);
  if (resolved !== vaultPath && !resolved.startsWith(vaultPath + path.sep)) {
    throw new Error(`Invalid path: "${relativePath}" escapes the vault root`);
  }
  return resolved;
}

export async function readNote(
  relativePath: string,
): Promise<{ content: string; exists: boolean }> {
  const fullPath = resolveSafePath(relativePath);
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return { content, exists: true };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { content: '', exists: false };
    }
    throw err;
  }
}

/**
 * Creates a note with frontmatter if it doesn't exist,
 * or appends content to the end if it already exists.
 */
export async function upsertNote(
  relativePath: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): Promise<{ created: boolean }> {
  const fullPath = resolveSafePath(relativePath);

  let exists = true;
  try {
    await fs.access(fullPath);
  } catch {
    exists = false;
  }

  if (exists) {
    await fs.appendFile(fullPath, '\n' + content, 'utf-8');
    return { created: false };
  }

  // Create parent directories and write new file
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const fileContent = frontmatter
    ? matter.stringify('\n' + content, frontmatter)
    : content;
  await fs.writeFile(fullPath, fileContent, 'utf-8');
  return { created: true };
}
