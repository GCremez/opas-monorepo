import { describe, expect, it } from '@jest/globals';
import { collectDeadlines, daysUntil, documentName, nextDeadline, parseIsoDate, toDecodeView } from '../decodeView';
import type { DecodeResult } from '../../types';

const result = (structuredData: unknown): DecodeResult =>
  ({ structuredData } as unknown as DecodeResult);

describe('toDecodeView', () => {
  it('maps a well-formed decode', () => {
    const view = toDecodeView(
      result({
        authority: 'Kela',
        documentType: 'Päätös asumistuesta',
        title: 'Housing allowance approved',
        summary: 'You get housing allowance from April.',
        language: 'fi',
        issuedDate: '2026-03-15',
        deadlines: [
          { date: '2026-05-01', description: 'Send payslips' },
          { date: '2026-04-14', description: 'Appeal deadline' },
        ],
        actions: ['Send payslips'],
        keyFields: { Amount: '387,20 €/kk', Months: 12 },
      })
    );

    expect(view?.authority).toBe('Kela');
    expect(view?.deadlines.map((d) => d.date)).toEqual(['2026-04-14', '2026-05-01']);
    expect(view?.keyFields).toEqual([
      ['Amount', '387,20 €/kk'],
      ['Months', '12'],
    ]);
  });

  it('drops malformed fields instead of throwing', () => {
    const view = toDecodeView(
      result({
        title: 42,
        issuedDate: 'March 15',
        deadlines: [{ date: '2026-02-31', description: 'bad' }, 'nope', { description: 'no date' }],
        actions: ['ok', '', null, { a: 1 }],
        keyFields: ['not', 'an', 'object'],
      })
    );

    expect(view?.title).toBeNull();
    expect(view?.issuedDate).toBeNull();
    expect(view?.deadlines).toEqual([]);
    expect(view?.actions).toEqual(['ok']);
    expect(view?.keyFields).toEqual([]);
  });

  it('returns null without structured data', () => {
    expect(toDecodeView(null)).toBeNull();
    expect(toDecodeView(result(null))).toBeNull();
    expect(toDecodeView(result(['array']))).toBeNull();
  });
});

describe('dates', () => {
  const now = new Date(2026, 3, 10, 18, 30); // 10 Apr 2026, evening

  it('parses strict ISO dates only', () => {
    expect(parseIsoDate('2026-04-14')?.getDate()).toBe(14);
    expect(parseIsoDate('2026-4-14')).toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
  });

  it('counts calendar days regardless of time of day', () => {
    expect(daysUntil('2026-04-10', now)).toBe(0);
    expect(daysUntil('2026-04-14', now)).toBe(4);
    expect(daysUntil('2026-04-09', now)).toBe(-1);
  });

  it('picks the earliest deadline that has not passed', () => {
    const view = toDecodeView(
      result({
        deadlines: [
          { date: '2026-04-01', description: 'past' },
          { date: '2026-04-10', description: 'today' },
          { date: '2026-05-01', description: 'later' },
        ],
      })
    );
    expect(nextDeadline(view, now)?.description).toBe('today');
    expect(nextDeadline(toDecodeView(result({ deadlines: [] })), now)).toBeNull();
  });
});

describe('collectDeadlines', () => {
  const now = new Date(2026, 3, 10);
  const doc = (id: string, deadlines: { date: string; description: string }[]) =>
    ({ id, filename: `${id}.jpg`, deadlines } as unknown as import('../../types').Document);

  it('flattens and sorts deadlines across documents with day counts', () => {
    const items = collectDeadlines([
      doc('a', [{ date: '2026-04-20', description: 'later' }]),
      doc('b', [
        { date: '2026-04-08', description: 'passed' },
        { date: 'garbage', description: 'ignored' },
      ]),
      doc('c', []),
    ], now);

    expect(items.map((i) => [i.document.id, i.days])).toEqual([
      ['b', -2],
      ['a', 10],
    ]);
  });

  it('names documents by decoded title, falling back to the filename', () => {
    expect(documentName({ title: 'Tax decision', filename: 'x.jpg' })).toBe('Tax decision');
    expect(documentName({ title: '  ', filename: 'x.jpg' })).toBe('x.jpg');
    expect(documentName({ filename: 'x.jpg' })).toBe('x.jpg');
  });
});
