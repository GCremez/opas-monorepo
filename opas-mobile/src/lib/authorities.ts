// Files are grouped by the authority that sent them (design 2c). The sender comes from
// the decode as free text, so the same office can arrive as "KELA", "Kela" or "Social
// Insurance Institution of Finland"; the common Finnish authorities are folded into one
// group each, anything else is grouped under its own name.
import type { Document } from '../types';

/** Route key for documents Opas hasn't read yet, so they have no sender. */
export const UNREAD = '_unread';

export interface Authority {
  key: string;
  name: string;
}

const KNOWN: (Authority & { match: RegExp })[] = [
  { key: 'kela', name: 'KELA', match: /\bkela\b|\bfpa\b|social insurance institution/i },
  { key: 'vero', name: 'Verohallinto', match: /\bvero(hallinto)?\b|tax administration|skatteförvaltning/i },
  { key: 'migri', name: 'Migri', match: /\bmigri\b|maahanmuuttovirasto|immigration service|migrationsverket/i },
  { key: 'dvv', name: 'DVV', match: /\bdvv\b|digi- ja väestötieto|digital and population data|myndigheten för digitalisering/i },
  { key: 'te', name: 'TE-palvelut', match: /\bte[- ](palvelut|services|office|toimisto)\b|työllisyyspalvelut|employment services/i },
];

export function authorityOf(raw: string | null | undefined): Authority | null {
  const name = raw?.trim();
  if (!name) return null;
  const known = KNOWN.find((a) => a.match.test(name));
  if (known) return { key: known.key, name: known.name };
  return { key: name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, ''), name };
}

export interface AuthorityGroup extends Authority {
  documents: Document[];
}

/** Documents grouped by sender, largest group first. Documents with no sender yet are left out. */
export function groupByAuthority(documents: Document[]): AuthorityGroup[] {
  const groups = new Map<string, AuthorityGroup>();
  for (const doc of documents) {
    const authority = authorityOf(doc.authority);
    if (!authority) continue;
    const group = groups.get(authority.key) ?? { ...authority, documents: [] };
    group.documents.push(doc);
    groups.set(authority.key, group);
  }
  return [...groups.values()].sort((a, b) => b.documents.length - a.documents.length || a.name.localeCompare(b.name));
}
