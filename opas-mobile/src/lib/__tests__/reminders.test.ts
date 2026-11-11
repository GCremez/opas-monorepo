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
  it('reminds a week, 3 days and 1 day before, and on the morning a deadline is due', () => {
    const plan = planReminders([doc({})], t, 'en', now);
    expect(plan.map((r) => r.at)).toEqual([
      new Date(2026, 10, 23, 9),
      new Date(2026, 10, 27, 9),
      new Date(2026, 10, 29, 9),
      new Date(2026, 10, 30, 9),
    ]);
    expect(plan[0].title).toBe('Kela — reminders.days_left(7)');
    expect(plan[0].body).toBe('reminders.body(Report income changes,Nov 30, 2026)');
    expect(plan[1].title).toBe('Kela — reminders.days_left(3)');
    expect(plan[3].title).toBe('Kela — reminders.due_today');
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

  it('sends one notification when several deadlines remind at the same moment', () => {
    const kela = doc({});
    const vero = doc({ id: 'vero', authority: 'Vero', deadlines: [{ date: '2026-11-26', description: 'Pay tax' }] });
    const plan = planReminders([kela, vero], t, 'en', now);
    // Kela's 3-day reminder (27 Nov) and Vero's 1-day reminder (25 Nov) differ, but
    // Kela's a-week reminder (23 Nov) and Vero's 3-day reminder (23 Nov) coincide.
    const merged = plan.filter((r) => r.at.getTime() === new Date(2026, 10, 23, 9).getTime());
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('reminders.several_title(2)');
    // Nearest deadline first, and tapping opens it.
    expect(merged[0].body).toBe(
      'reminders.several_item(Pay tax,reminders.days_left(3)) · reminders.several_item(Report income changes,reminders.days_left(7))',
    );
    expect(merged[0].documentId).toBe('vero');
    expect(new Set(plan.map((r) => r.id)).size).toBe(plan.length);
  });
});
