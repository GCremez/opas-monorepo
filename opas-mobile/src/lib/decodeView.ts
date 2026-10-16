// Normalises a decode result's structuredData into what the document screens render.
// The data comes from a language model, so every field is checked rather than trusted:
// a malformed field becomes null/empty instead of crashing a screen or showing "[object]".
import type { DecodeResult, Document } from '../types';

export interface DecodeDeadline {
  /** Calendar date as YYYY-MM-DD, exactly as stated in the document. */
  date: string;
  description: string;
}

export interface DecodeView {
  authority: string | null;
  documentType: string | null;
  title: string | null;
  summary: string | null;
  language: string | null;
  issuedDate: string | null;
  /** Sorted by date, earliest first. Only well-formed dates are kept. */
  deadlines: DecodeDeadline[];
  actions: string[];
  keyFields: [label: string, value: string][];
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Parses a strict YYYY-MM-DD string as a local calendar date; null for anything else. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const m = value ? ISO_DATE.exec(value) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  // Rejects rollovers such as 2026-02-31.
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

function isoDate(value: unknown): string | null {
  const s = text(value);
  return s && parseIsoDate(s) ? s : null;
}

export function toDecodeView(result: DecodeResult | null | undefined): DecodeView | null {
  const data = result?.structuredData;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;

  const deadlines = (Array.isArray(d.deadlines) ? d.deadlines : [])
    .map((item): DecodeDeadline | null => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const date = isoDate(rec.date);
      return date ? { date, description: text(rec.description) ?? '' } : null;
    })
    .filter((x): x is DecodeDeadline => x !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const actions = (Array.isArray(d.actions) ? d.actions : [])
    .map(text)
    .filter((x): x is string => x !== null);

  const keyFields =
    d.keyFields && typeof d.keyFields === 'object' && !Array.isArray(d.keyFields)
      ? Object.entries(d.keyFields as Record<string, unknown>)
          .map(([label, value]): [string, string] | null => {
            const v = typeof value === 'number' ? String(value) : text(value);
            return label.trim() && v ? [label.trim(), v] : null;
          })
          .filter((x): x is [string, string] => x !== null)
      : [];

  return {
    authority: text(d.authority),
    documentType: text(d.documentType),
    title: text(d.title),
    summary: text(d.summary),
    language: text(d.language),
    issuedDate: isoDate(d.issuedDate),
    deadlines,
    actions,
    keyFields,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole days from today until the date (0 = today, negative = past). */
export function daysUntil(isoDateString: string, now: Date = new Date()): number | null {
  const date = parseIsoDate(isoDateString);
  if (!date) return null;
  return Math.round((date.getTime() - startOfDay(now).getTime()) / 86_400_000);
}

/** The earliest deadline that is today or later, or null when none is upcoming. */
export function nextDeadline(view: DecodeView | null, now: Date = new Date()): DecodeDeadline | null {
  return view?.deadlines.find((d) => (daysUntil(d.date, now) ?? -1) >= 0) ?? null;
}

/** Locale-formatted calendar date, e.g. "14 Apr 2026" / "14.4.2026". */
export function formatDate(isoDateString: string, locale: string): string {
  const date = parseIsoDate(isoDateString);
  if (!date) return isoDateString;
  try {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDateString;
  }
}

/** What a document is called in lists: its decoded title, else the uploaded filename. */
export function documentName(doc: Pick<Document, 'title' | 'filename'>): string {
  return doc.title?.trim() || doc.filename;
}

export interface DeadlineItem {
  document: Document;
  deadline: DecodeDeadline;
  /** Calendar days from today; negative once passed. */
  days: number;
}

/** Every stated deadline across the documents, earliest first. */
export function collectDeadlines(documents: Document[], now: Date = new Date()): DeadlineItem[] {
  const items: DeadlineItem[] = [];
  for (const document of documents) {
    for (const deadline of document.deadlines ?? []) {
      const days = daysUntil(deadline.date, now);
      if (days !== null) items.push({ document, deadline, days });
    }
  }
  return items.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
}
