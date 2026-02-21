export type NoteReadResult   = { content: string; exists: boolean };
export type NoteUpsertResult = { created: boolean };
export type NoteDeleteResult = { deleted: boolean };
export type SearchResult     = { path: string; line: number; text: string };
