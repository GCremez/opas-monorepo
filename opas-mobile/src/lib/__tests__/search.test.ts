import { describe, expect, it } from '@jest/globals';
import { searchDocuments } from '../search';
import type { Document } from '../../types';

const doc = (over: Partial<Document>): Document => ({
  id: 'd', filename: 'scan.jpg', contentType: 'image/jpeg', fileSize: 1, status: 'ready', folderId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', uploadUrl: null, downloadUrl: null, ...over,
});

describe('searchDocuments', () => {
  it('finds a term in the letter content and shows it in context', () => {
    const [hit] = searchDocuments(
      [doc({ title: 'Housing benefit approved', documentType: 'Päätös yleisestä asumistuesta' })],
      'asumistu',
    );
    expect(hit.snippet).toEqual({ before: 'Päätös yleisestä ', match: 'asumistu', after: 'esta' });
  });

  it('trims long content around the match', () => {
    const summary = `${'a'.repeat(50)} income change ${'b'.repeat(50)}`;
    const [hit] = searchDocuments([doc({ summary })], 'INCOME');
    expect(hit.snippet?.before.startsWith('…')).toBe(true);
    expect(hit.snippet?.match).toBe('income');
    expect(hit.snippet?.after.endsWith('…')).toBe(true);
  });

  it('matches the name or sender without a snippet', () => {
    const [hit] = searchDocuments([doc({ authority: 'Kela' })], 'kela');
    expect(hit.snippet).toBeNull();
  });

  it('returns nothing for a blank query or no match', () => {
    expect(searchDocuments([doc({ title: 'Tax card' })], '  ')).toEqual([]);
    expect(searchDocuments([doc({ title: 'Tax card' })], 'migri')).toEqual([]);
  });
});
