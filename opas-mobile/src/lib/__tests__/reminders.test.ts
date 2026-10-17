import { describe, expect, it, jest } from '@jest/globals';
import type { TFunction } from 'i18next';
import type { Document } from '../../types';

jest.mock('expo-notifications', () => ({}));
// eslint-disable-next-line import/first
import { planReminders } from '../reminders';

const t = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}(${Object.values(opts).join(',')})` : key) as unknown as TFunction;

const doc = (over: Partial<Document>): Document => ({
  id: 'doc', filename: 'scan.jpg', contentType: 'image/jpeg', fileSize: 1, status: 'ready', folderId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', uploadUrl: null, downloadUrl: null,
  title: 'Housing allowance approved', authority: 'Kela',
  deadlines: [{ date: '2026-11-30', description: 'Report income changes' }],
  ...over,
});

const now = new Date(2026, 9, 17, 12); // 17 Oct 2026, noon

describe('planReminders', () => {
  it('reminds a week before, the day before and on the morning a deadline is due', () => {
    const plan = planReminders([doc({})], t, 'en', now);
    expect(plan.map((r) => r.at)).toEqual([
      new Date(2026, 10, 23, 9),
      new Date(2026, 10, 29, 9),
      new Date(2026, 10, 30, 9),
    ]);
    expect(plan[0].title).toBe('KELA — reminders.days_left(7)');
    expect(plan[0].body).toBe('reminders.body(Report income changes,Nov 30, 2026)');
    expect(plan[2].title).toBe('KELA — reminders.due_today');
    expect(plan[0].documentId).toBe('doc');
  });

  it('skips reminders whose time has passed', () => {
    const plan = planReminders([doc({ deadlines: [{ date: '2026-10-18', description: 'Soon' }] })], t, 'en', now);
    // A week before (11 Oct) and the day before at 9:00 (17 Oct) are already behind us.
    expect(plan.map((r) => r.at)).toEqual([new Date(2026, 9, 18, 9)]);
  });

  it('skips deadlines already ticked off and ones that have passed', () => {
    const done = doc({ completedTasks: [{ key: 'deadline:2026-11-30:Report income changes', completedAt: '2026-10-17T10:00:00Z' }] });
    const past = doc({ id: 'old', deadlines: [{ date: '2026-10-01', description: 'Old' }] });
    expect(planReminders([done, past], t, 'en', now)).toEqual([]);
  });
});
