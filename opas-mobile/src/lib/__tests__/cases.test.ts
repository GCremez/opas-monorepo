import { describe, expect, it } from '@jest/globals';
import type { Document } from '../../types';
import { caseKeyOf, caseOf, groupCases, nextCaseDeadline, normalizeReference, timelineOf } from '../cases';

const doc = (over: Partial<Document>): Document => ({
  id: 'doc', filename: 'scan.jpg', contentType: 'image/jpeg', fileSize: 1, status: 'ready', folderId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', uploadUrl: null, downloadUrl: null,
  title: 'Letter', authority: 'Kela', deadlines: [], ...over,
});

const now = new Date(2026, 10, 11, 12); // 11 Nov 2026

describe('normalizeReference', () => {
  it('treats the same number written differently as one case', () => {
    expect(normalizeReference('Dnro 123 / 2026')).toBe('123/2026');
    expect(normalizeReference('123/2026')).toBe('123/2026');
    expect(normalizeReference('Ärendenummer: 4711-2026')).toBe('4711-2026');
    expect(normalizeReference('KELA/55/2026')).toBe('KELA/55/2026');
  });

  it('keeps a prefix-looking start that is part of the number', () => {
    expect(normalizeReference('NOR-123')).toBe('NOR-123');
  });

  it('is null when there is no number', () => {
    expect(normalizeReference('  ')).toBeNull();
    expect(normalizeReference(null)).toBeNull();
    expect(normalizeReference('Dnro')).toBeNull();
  });
});

describe('groupCases', () => {
  const first = doc({ id: 'a', authority: 'KELA', caseReference: 'Dnro 123/2026', issuedDate: '2026-08-01' });
  const second = doc({ id: 'b', authority: 'Kela', caseReference: '123/2026', issuedDate: '2026-10-02' });
  const otherCase = doc({ id: 'c', authority: 'Kela', caseReference: '999/2026' });
  const otherSender = doc({ id: 'd', authority: 'Migri', caseReference: '123/2026' });
  const noReference = doc({ id: 'e', authority: 'Kela' });

  it('groups letters from the same sender with the same reference, oldest first', () => {
    const cases = groupCases([second, otherCase, otherSender, noReference, first]);
    expect(cases).toHaveLength(1);
    expect(cases[0].authority).toBe('Kela');
    expect(cases[0].documents.map((d) => d.id)).toEqual(['a', 'b']);
    expect(caseKeyOf(first)).toBe(caseKeyOf(second));
  });

  it('a single letter about a matter is not a case', () => {
    expect(caseOf([first, otherCase], otherCase)).toBeNull();
    expect(caseOf([first, second], second)?.documents).toHaveLength(2);
  });
});

describe('timelineOf', () => {
  const request = doc({
    id: 'a', caseReference: '123/2026', issuedDate: '2026-10-01',
    deadlines: [{ date: '2026-10-20', description: 'Send payslips' }],
    completedTasks: [{ key: 'deadline:2026-10-20:Send payslips', completedAt: '2026-10-15T09:00:00Z' }],
  });
  const decision = doc({
    id: 'b', caseReference: '123/2026', issuedDate: '2026-11-03',
    deadlines: [{ date: '2026-12-03', description: 'Appeal' }],
  });
  const kase = groupCases([decision, request])[0];

  it('puts letters and their deadlines in date order, done ones marked', () => {
    const entries = timelineOf(kase, now);
    expect(entries.map((e) => `${e.kind}:${e.date}`)).toEqual([
      'letter:2026-10-01', 'deadline:2026-10-20', 'letter:2026-11-03', 'deadline:2026-12-03',
    ]);
    expect(entries[1]).toMatchObject({ kind: 'deadline', done: true });
  });

  it('counts down to the next open deadline', () => {
    const next = nextCaseDeadline(kase, now);
    expect(next?.deadline.description).toBe('Appeal');
    expect(next?.days).toBe(22);
  });
});
