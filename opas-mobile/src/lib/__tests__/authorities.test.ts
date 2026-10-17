import { describe, expect, it } from '@jest/globals';
import { authorityOf, groupByAuthority } from '../authorities';
import type { Document } from '../../types';

const doc = (id: string, authority: string | null): Document => ({
  id, filename: `${id}.jpg`, contentType: 'image/jpeg', fileSize: 1, status: 'ready', folderId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', uploadUrl: null, downloadUrl: null, authority,
});

describe('authorityOf', () => {
  it('folds the ways a known authority is written into one group', () => {
    expect(authorityOf('Kela')?.key).toBe('kela');
    expect(authorityOf('Social Insurance Institution of Finland (Kela)')?.key).toBe('kela');
    expect(authorityOf('Finnish Tax Administration')).toEqual({ key: 'vero', name: 'Verohallinto' });
    expect(authorityOf('Maahanmuuttovirasto')?.key).toBe('migri');
    expect(authorityOf('Digi- ja väestötietovirasto')?.key).toBe('dvv');
  });

  it('keeps an unknown sender under its own name', () => {
    expect(authorityOf('Helsingin kaupunki')).toEqual({ key: 'helsingin-kaupunki', name: 'Helsingin kaupunki' });
  });

  it('has no group for a document that has not been read', () => {
    expect(authorityOf(null)).toBeNull();
    expect(authorityOf('  ')).toBeNull();
  });
});

describe('groupByAuthority', () => {
  it('groups by sender, largest first, skipping unread documents', () => {
    const groups = groupByAuthority([doc('a', 'Kela'), doc('b', 'Migri'), doc('c', 'KELA'), doc('d', null)]);
    expect(groups.map((g) => [g.key, g.documents.length])).toEqual([['kela', 2], ['migri', 1]]);
  });
});
