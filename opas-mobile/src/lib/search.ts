// On-device search over what Opas has read from each letter (design 4c). The original
// text isn't kept, so matches come from the decode: the plain-language title, the letter's
// own title, the summary and the actions.
import type { Document } from '../types';

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

export interface SearchHit {
  document: Document;
  /** Where the term appears in the letter's content; null when only the name matched. */
  snippet: Snippet | null;
}

const CONTEXT = 28;

function snippetIn(text: string, needle: string): Snippet | null {
  const at = text.toLowerCase().indexOf(needle);
  if (at < 0) return null;
  const start = Math.max(0, at - CONTEXT);
  const end = Math.min(text.length, at + needle.length + CONTEXT);
  return {
    before: (start > 0 ? '…' : '') + text.slice(start, at).trimStart(),
    match: text.slice(at, at + needle.length),
    after: text.slice(at + needle.length, end).trimEnd() + (end < text.length ? '…' : ''),
  };
}

export function searchDocuments(documents: Document[], query: string): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const document of documents) {
    const content = [document.documentType, document.summary, ...(document.actions ?? [])].filter(
      (x): x is string => !!x,
    );
    const snippet = content.map((text) => snippetIn(text, needle)).find((s) => s !== null) ?? null;
    const nameMatches = [document.title, document.filename, document.authority].some((x) =>
      x?.toLowerCase().includes(needle),
    );
    if (snippet || nameMatches) hits.push({ document, snippet });
  }
  return hits;
}
