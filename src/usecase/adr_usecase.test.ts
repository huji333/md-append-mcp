import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAdr, deleteAdr, indexAdrs, viewAdr } from './adr_usecase.ts';

const REPO = 'test-repo';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(tmpdir(), 'vault-adr-'));
  process.env.VAULT_PATH = tempDir;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.VAULT_PATH;
});

describe('writeAdr', () => {
  it('creates ADR-001 when no ADRs exist', async () => {
    const result = await writeAdr(REPO, 'Use Bun', 'Context\n\nDecision\n\nConsequences');

    expect(result.number).toBe(1);
    expect(result.path).toBe('adr/ADR-001-use-bun.md');

    const content = await fs.readFile(path.join(tempDir, REPO, result.path), 'utf-8');
    expect(content).toContain('# ADR-001: Use Bun');
    expect(content).toContain('adr: 1');
  });

  it('auto-increments ADR number', async () => {
    await writeAdr(REPO, 'First Decision', 'content');
    const result = await writeAdr(REPO, 'Second Decision', 'content');

    expect(result.number).toBe(2);
    expect(result.path).toBe('adr/ADR-002-second-decision.md');
  });

  it('creates _index.md with header on first ADR', async () => {
    await writeAdr(REPO, 'Use Bun', 'content');

    const indexContent = await fs.readFile(
      path.join(tempDir, REPO, 'adr/_index.md'),
      'utf-8',
    );
    expect(indexContent).toContain('| # | Title |');
    expect(indexContent).toContain('ADR-001');
    expect(indexContent).toContain('Use Bun');
  });

  it('appends to _index.md for subsequent ADRs', async () => {
    await writeAdr(REPO, 'First', 'content');
    await writeAdr(REPO, 'Second', 'content');

    const indexContent = await fs.readFile(
      path.join(tempDir, REPO, 'adr/_index.md'),
      'utf-8',
    );
    expect(indexContent).toContain('ADR-001');
    expect(indexContent).toContain('ADR-002');
  });

  it('rejects content over the limit (default 1000 chars)', async () => {
    const longContent = 'x'.repeat(1001);
    await expect(writeAdr(REPO, 'Too Long', longContent)).rejects.toThrow('exceeds 1000 chars');
  });

  it('respects ADR_BODY_LIMIT_CHARS env var', async () => {
    process.env.ADR_BODY_LIMIT_CHARS = '200';
    const longContent = 'x'.repeat(201);
    await expect(writeAdr(REPO, 'Too Long', longContent)).rejects.toThrow('exceeds 200 chars');
    delete process.env.ADR_BODY_LIMIT_CHARS;
  });

  it('includes branch in frontmatter when provided', async () => {
    const result = await writeAdr(REPO, 'Branch ADR', 'content', 'feat/new-tools');
    const content = await fs.readFile(path.join(tempDir, REPO, result.path), 'utf-8');
    expect(content).toContain('branch: feat/new-tools');
  });

  it('slugifies title with special characters', async () => {
    const result = await writeAdr(REPO, 'Use Bun (v1.0) — Runtime', 'content');
    expect(result.path).toContain('use-bun-v1-0-runtime');
  });
});

describe('deleteAdr', () => {
  it('deletes an existing ADR and returns deleted:true', async () => {
    const { number } = await writeAdr(REPO, 'To Delete', 'content');
    const result = await deleteAdr(REPO, number);

    expect(result.deleted).toBe(true);
    expect(result.path).toContain('ADR-001');
  });

  it('returns deleted:false for a non-existent ADR number', async () => {
    const result = await deleteAdr(REPO, 99);
    expect(result.deleted).toBe(false);
    expect(result.path).toBe('');
  });
});

describe('indexAdrs', () => {
  it('returns empty list when no ADRs exist', async () => {
    const result = await indexAdrs(REPO);
    expect(result.adrs).toEqual([]);
  });

  it('returns ADRs sorted by number', async () => {
    await writeAdr(REPO, 'First', 'content');
    await writeAdr(REPO, 'Second', 'content');

    const result = await indexAdrs(REPO);
    expect(result.adrs).toHaveLength(2);
    expect(result.adrs[0].number).toBe(1);
    expect(result.adrs[1].number).toBe(2);
  });
});

describe('viewAdr', () => {
  it('returns content of an existing ADR', async () => {
    await writeAdr(REPO, 'My Decision', 'This is the content');
    const result = await viewAdr(REPO, 1);

    expect(result.content).toContain('My Decision');
    expect(result.content).toContain('This is the content');
    expect(result.path).toBe('adr/ADR-001-my-decision.md');
  });

  it('throws for a non-existent ADR number', async () => {
    await expect(viewAdr(REPO, 99)).rejects.toThrow('ADR-099 not found');
  });
});
