import path from 'node:path';

/**
 * Validates a repository name.
 * Throws if the name is empty, contains path separators, or is a dot-segment.
 */
export function validateRepositoryName(name: string): void {
  if (!name || /[/\\]/.test(name) || name === '..' || name === '.') {
    throw new Error(`Invalid repository_name: "${name}"`);
  }
}

/**
 * Resolves path segments against a root directory.
 * Throws if the resolved path escapes the root (path traversal protection).
 */
export function resolveSafe(root: string, ...segments: string[]): string {
  const resolved = path.resolve(root, ...segments);
  if (resolved === root || !resolved.startsWith(root + path.sep)) {
    throw new Error(`Path escapes root: "${segments.join('/')}"`);
  }
  return resolved;
}
