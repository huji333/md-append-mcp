import * as repo from '../repository/note_repository.ts';
import { resolveSafePath } from '../lib/vault.ts';
import { currentTime, parseDateFromSessionId } from '../lib/time.ts';
import type { LogEntry, DevlogAppendResult, DevlogTailResult } from '../types/index.ts';

function formatEntry(entry: LogEntry, time: string): string {
  const tag = `[${entry.type}]`.padEnd(9); // "[problem]" = 9 chars, others get padded
  const branch = entry.branch?.trim() ? `(${entry.branch.trim()})  ` : '';
  const body =
    entry.type === 'problem' && entry.resolution
      ? `${entry.content} → ${entry.resolution}`
      : entry.content;
  return `${tag} ${time}  ${branch}${body}`;
}

export async function appendDevlog(
  repositoryName: string,
  sessionId: string,
  entries: LogEntry[],
): Promise<DevlogAppendResult> {
  const relPath = `devlog/${sessionId}.md`;
  const absPath = resolveSafePath(repositoryName, relPath);
  const time = currentTime();
  const lines = entries.map(e => formatEntry(e, time)).join('\n');

  const exists = await repo.noteExists(absPath);
  if (!exists) {
    const frontmatter = {
      tags: ['devlog'],
      session: sessionId,
      repository: repositoryName,
      date: parseDateFromSessionId(sessionId),
    };
    await repo.writeNote(absPath, lines + '\n', frontmatter);
    return { appended: entries.length, created: true };
  }

  await repo.appendNote(absPath, lines);
  return { appended: entries.length, created: false };
}

export async function tailDevlog(
  repositoryName: string,
  sessionId: string,
  n: number,
): Promise<DevlogTailResult> {
  const relPath = `devlog/${sessionId}.md`;
  const absPath = resolveSafePath(repositoryName, relPath);
  const { content, exists } = await repo.readNote(absPath);
  if (!exists) return { entries: [], path: relPath };

  const lines = content.split('\n').filter(l => /^\[(impl|problem|verify|insight)\]/.test(l.trim()));
  return { entries: lines.slice(-n), path: relPath };
}
