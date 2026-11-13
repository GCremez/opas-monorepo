// Case timelines (launch plan P1-7). A case is the letters one sender wrote about one
// matter: same authority, same case or file number (diaarinumero, Dnro, ärendenummer,
// application number). The server reads that number from each letter
// (`caseReference`); grouping happens here, so letters explained before cases existed
// join their case too, and nothing has to be stored.
import type { Document } from '../types';
import { authorityOf } from './authorities';
import { daysUntil, type DeadlineItem } from './decodeView';
import { completedAt, deadlineKey } from './tasks';

export interface Case {
  /** Route key: authority key + normalised reference. */
  key: string;
  authority: string;
  /** The reference as the first letter wrote it. */
  reference: string;
  /** Oldest letter first. */
  documents: Document[];
}

// Prefixes letters put in front of the number itself: "Dnro 123/2026", "Ärende nr 55".
const PREFIX = /^(dnro|dnr|diaarinumero|diarienummer|asianumero|asiatunnus|ärendenummer|ärende|hakemusnumero|case|file|application|ref(erence)?|no|nro|nr|number)(?:[\s.:#-]+|(?=\d))/iu;

/** "Dnro 123 / 2026" and "123/2026" are the same case. Null when nothing is left. */
export function normalizeReference(raw: string | null | undefined): string | null {
  let value = raw?.trim() ?? '';
  for (let i = 0; i < 3; i++) value = value.replace(PREFIX, '');
  const key = value.toUpperCase().replace(/[^\p{L}\p{N}/.-]+/gu, '');
  // A case number always has a digit; a bare "Dnro" or a word is not one.
  return key.length >= 2 && /\d/.test(key) ? key : null;
}

export function caseKeyOf(doc: Pick<Document, 'authority' | 'caseReference'>): string | null {
  const authority = authorityOf(doc.authority);
  const reference = normalizeReference(doc.caseReference);
  return authority && reference ? `${authority.key}~${reference}` : null;
}

/** When the letter was written: its own date, else when it was added. */
export function letterDate(doc: Pick<Document, 'issuedDate' | 'createdAt'>): string {
  return doc.issuedDate ?? doc.createdAt.slice(0, 10);
}

/** Every case with at least two letters, most recently active first. */
export function groupCases(documents: Document[]): Case[] {
  const groups = new Map<string, Case>();
  for (const doc of documents) {
    const key = caseKeyOf(doc);
    if (!key) continue;
    const group = groups.get(key) ?? {
      key,
      authority: authorityOf(doc.authority)!.name,
      reference: doc.caseReference!.trim(),
      documents: [],
    };
    group.documents.push(doc);
    groups.set(key, group);
  }
  const byDate = (a: Document, b: Document) => letterDate(a).localeCompare(letterDate(b));
  return [...groups.values()]
    .filter((g) => g.documents.length >= 2)
    .map((g) => ({ ...g, documents: [...g.documents].sort(byDate) }))
    .sort((a, b) => letterDate(b.documents[b.documents.length - 1]).localeCompare(letterDate(a.documents[a.documents.length - 1])));
}

/** The case this letter belongs to, or null if it's the only letter about its matter. */
export function caseOf(documents: Document[], doc: Document): Case | null {
  const key = caseKeyOf(doc);
  return key ? groupCases(documents).find((c) => c.key === key) ?? null : null;
}

export type TimelineEntry =
  | { kind: 'letter'; date: string; document: Document }
  | { kind: 'deadline'; date: string; item: DeadlineItem; done: boolean };

/**
 * The case as one timeline: every letter on its date and every deadline the letters
 * state, oldest first. Deadlines that passed while still open stay, so a missed one shows.
 */
export function timelineOf(c: Case, now: Date = new Date()): TimelineEntry[] {
  const entries: TimelineEntry[] = c.documents.map((document) => ({ kind: 'letter', date: letterDate(document), document }));
  for (const document of c.documents) {
    for (const deadline of document.deadlines ?? []) {
      const days = daysUntil(deadline.date, now);
      if (days === null) continue;
      entries.push({
        kind: 'deadline',
        date: deadline.date,
        item: { document, deadline, days },
        done: !!completedAt(document, deadlineKey(deadline)),
      });
    }
  }
  // Same day: the letter first, then what it asks for.
  return entries.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'letter' ? -1 : 1) - (b.kind === 'letter' ? -1 : 1));
}

/** The next open deadline in the case (today or later), for the countdown. */
export function nextCaseDeadline(c: Case, now: Date = new Date()): DeadlineItem | null {
  const open = timelineOf(c, now).filter(
    (e): e is Extract<TimelineEntry, { kind: 'deadline' }> => e.kind === 'deadline' && !e.done && e.item.days >= 0,
  );
  return open[0]?.item ?? null;
}
