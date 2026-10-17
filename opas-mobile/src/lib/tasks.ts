// A document's to-dos: the dated deadlines and the other actions from its decode. Each has
// a stable key so the backend can remember which ones the user has ticked off; the key is
// built from the decoded text, so it survives reloads as long as the decode doesn't change.
import type { DecodeDeadline } from './decodeView';
import type { Document } from '../types';

export interface Task {
  key: string;
  title: string;
  /** YYYY-MM-DD for deadlines; null for actions without a date. */
  date: string | null;
}

export const deadlineKey = (d: DecodeDeadline) => `deadline:${d.date}:${d.description}`;
export const actionKey = (action: string) => `action:${action}`;

/** Deadlines first (by date), then the actions that aren't already one of them. */
export function tasksOf(deadlines: DecodeDeadline[], actions: string[]): Task[] {
  const dated = deadlines.map((d) => ({ key: deadlineKey(d), title: d.description, date: d.date }));
  const titles = new Set(dated.map((t) => t.title.toLowerCase()));
  const undated = actions
    .filter((a) => !titles.has(a.toLowerCase()))
    .map((a) => ({ key: actionKey(a), title: a, date: null }));
  return [...dated, ...undated];
}

/** When the task was ticked off, or null if it's still open. */
export function completedAt(doc: Pick<Document, 'completedTasks'> | null | undefined, key: string): string | null {
  return doc?.completedTasks?.find((t) => t.key === key)?.completedAt ?? null;
}
