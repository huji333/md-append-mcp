import * as repo from '../repository/note_repository.ts';
import { resolveSafePath } from '../lib/vault.ts';
import { currentDate } from '../lib/time.ts';
import type { AdrInfo, AdrWriteResult, AdrDeleteResult, AdrIndexResult, AdrViewResult } from '../types/index.ts';

function titleToSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'untitled';
}

function parseAdrFilename(filename: string): AdrInfo | null {
  const match = filename.match(/^ADR-(\d{3})-(.+)\.md$/);
  if (!match) return null;
  return {
    number: parseInt(match[1], 10),
    slug: match[2],
    path: `adr/${filename}`,
  };
}

async function listAdrs(repositoryName: string): Promise<AdrInfo[]> {
  const files = await repo.listDir(resolveSafePath(repositoryName, 'adr'));
  return files
    .map(f => parseAdrFilename(f))
    .filter((a): a is AdrInfo => a !== null)
    .sort((a, b) => a.number - b.number);
}

export async function writeAdr(
  repositoryName: string,
  title: string,
  content: string,
  branch?: string,
  status: 'proposed' | 'accepted' = 'accepted',
  related: string[] = [],
): Promise<AdrWriteResult> {
  const limit = parseInt(process.env.ADR_BODY_LIMIT_CHARS ?? '1000', 10);
  if (content.length > limit) {
    throw new Error(`ADR content exceeds ${limit} chars (got ${content.length})`);
  }

  const adrs = await listAdrs(repositoryName);
  const nextNumber = adrs.length > 0 ? adrs[adrs.length - 1].number + 1 : 1;
  const nnn = String(nextNumber).padStart(3, '0');
  const slug = titleToSlug(title);
  const relPath = `adr/ADR-${nnn}-${slug}.md`;
  const date = currentDate();

  const frontmatter: Record<string, unknown> = {
    tags: ['adr', status],
    adr: nextNumber,
    date,
    status,
    repository: repositoryName,
    related,
    ...(branch?.trim() ? { branch: branch.trim() } : {}),
  };

  await repo.writeNote(
    resolveSafePath(repositoryName, relPath),
    `# ADR-${nnn}: ${title}\n\n${content}\n`,
    frontmatter,
  );

  const indexRelPath = 'adr/_index.md';
  const indexAbsPath = resolveSafePath(repositoryName, indexRelPath);
  const indexRow = `| ADR-${nnn} | ${title} | ${date} | ${status} | [[ADR-${nnn}-${slug}]] |`;
  if (!(await repo.noteExists(indexAbsPath))) {
    await repo.writeNote(
      indexAbsPath,
      `| # | Title | Date | Status | File |\n|---|-------|------|--------|------|\n${indexRow}\n`,
    );
  } else {
    await repo.appendNote(indexAbsPath, indexRow);
  }

  return { number: nextNumber, path: relPath };
}

export async function deleteAdr(
  repositoryName: string,
  number: number,
): Promise<AdrDeleteResult> {
  const adrs = await listAdrs(repositoryName);
  const adr = adrs.find(a => a.number === number);
  if (!adr) return { deleted: false, path: '' };

  const result = await repo.deleteNote(resolveSafePath(repositoryName, adr.path));
  return { deleted: result.deleted, path: adr.path };
}

export async function indexAdrs(repositoryName: string): Promise<AdrIndexResult> {
  return { adrs: await listAdrs(repositoryName) };
}

export async function viewAdr(
  repositoryName: string,
  number: number,
): Promise<AdrViewResult> {
  const adrs = await listAdrs(repositoryName);
  const adr = adrs.find(a => a.number === number);
  if (!adr) throw new Error(`ADR-${String(number).padStart(3, '0')} not found`);

  const { content } = await repo.readNote(resolveSafePath(repositoryName, adr.path));
  return { content, path: adr.path };
}
