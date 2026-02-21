import path from 'node:path';
import { validateRepositoryName, resolveSafe } from './path_validation.ts';

export function getVaultPath(): string {
  const vaultPath = process.env.VAULT_PATH;
  if (!vaultPath) throw new Error('VAULT_PATH environment variable is not set');
  return vaultPath;
}

export function resolveSafePath(repositoryName: string, ...segments: string[]): string {
  validateRepositoryName(repositoryName);
  const vaultPath = path.resolve(getVaultPath());
  return resolveSafe(vaultPath, repositoryName, ...segments);
}
