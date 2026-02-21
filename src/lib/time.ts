/** "HH:MM" — injected into devlog entries at write time */
export function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" — used for ADR frontmatter */
export function currentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** "20260221-1423" → "2026-02-21" */
export function parseDateFromSessionId(sessionId: string): string {
  const d = sessionId.slice(0, 8);
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}
