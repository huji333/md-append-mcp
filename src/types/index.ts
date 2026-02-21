// repository types (used by note_repository.ts)
export type NoteReadResult   = { content: string; exists: boolean };
export type NoteDeleteResult = { deleted: boolean };

export type LogType = 'problem' | 'impl' | 'verify' | 'insight';

export interface LogEntry {
  type: LogType;
  content: string;
  resolution?: string; // problem only
  branch?: string;
}

export interface DevlogAppendResult {
  appended: number;
  created: boolean;
}

export interface DevlogTailResult {
  entries: string[];
  path: string;
}

export interface AdrInfo {
  number: number;
  slug: string;
  path: string;
}

export interface AdrWriteResult {
  number: number;
  path: string;
}

export interface AdrDeleteResult {
  deleted: boolean;
  path: string;
}

export interface AdrIndexResult {
  adrs: AdrInfo[];
}

export interface AdrViewResult {
  content: string;
  path: string;
}
