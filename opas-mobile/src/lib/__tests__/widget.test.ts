import { describe, expect, it, jest } from '@jest/globals';
import type { TFunction } from 'i18next';
import type { Document } from '../../types';

jest.mock('../../../modules/opas-widget-bridge', () => null);
// eslint-disable-next-line import/first
import { widgetPayload } from '../widget';

const t = ((key: string) => key) as unknown as TFunction;
const doc = (id: string, date: string, over: Partial<Document> = {}): Document => ({
  id, filename: `${id}.jpg`, contentType: 'image/jpeg', fileSize: 1, status: 'ready', folderId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', uploadUrl: null, downloadUrl: null,
  authority: 'Maahanmuuttovirasto', deadlines: [{ date, description: `Deadline ${id}` }], ...over,
});
const now = new Date(2026, 9, 17, 12);

describe('widgetPayload', () => {
  it('shows the nearest open deadline with a tidy authority name', () => {
    const p = widgetPayload([doc('later', '2026-12-01'), doc('soon', '2026-10-26')], t, 'en', now);
    expect(p).toMatchObject({ documentId: 'soon', title: 'Deadline soon', authority: 'Migri', date: '2026-10-26' });
  });

  it('skips deadlines that are done or already passed', () => {
    const done = doc('done', '2026-10-20', {
      completedTasks: [{ key: 'deadline:2026-10-20:Deadline done', completedAt: '2026-10-17T08:00:00Z' }],
    });
    const p = widgetPayload([done, doc('past', '2026-10-01'), doc('next', '2026-11-05')], t, 'en', now);
    expect(p.documentId).toBe('next');
  });

  it('has nothing to show when nothing is due', () => {
    expect(widgetPayload([], t, 'en', now)).toMatchObject({ documentId: null, title: null, date: null });
  });
});
