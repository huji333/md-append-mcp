import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { searchVault } from './search_usecase.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'search-usecase-test-'));
  process.env.VAULT_PATH = tempDir;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

// validateRepositoryName throws before runSearch is reached, so no ripgrep mock needed.
describe('searchVault repository_name validation', () => {
  it('throws on repository_name containing slash', async () => {
    await expect(searchVault('foo', 'foo/bar')).rejects.toThrow('Invalid repository_name');
  });

  it('throws on repository_name ".."', async () => {
    await expect(searchVault('foo', '..')).rejects.toThrow('Invalid repository_name');
  });

  it('throws on repository_name "."', async () => {
    await expect(searchVault('foo', '.')).rejects.toThrow('Invalid repository_name');
  });

  it('throws on empty repository_name', async () => {
    await expect(searchVault('foo', '')).rejects.toThrow('Invalid repository_name');
  });
});
