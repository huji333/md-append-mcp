import path from 'node:path';
import { validateRepositoryName, resolveSafe } from '../lib/path_validation.ts';
import { getVaultPath } from './note_usecase.ts';
import { runSearch } from '../service/ripgrep_service.ts';
import type { SearchResult } from '../types/index.ts';

export async function searchVault(
  query: string,
  repositoryName: string,
  pathFilter?: string,
): Promise<SearchResult[]> {
  validateRepositoryName(repositoryName);
  const vaultRoot = path.resolve(getVaultPath());
  const repoRoot = resolveSafe(vaultRoot, repositoryName);
  return runSearch(repoRoot, query, pathFilter);
}
