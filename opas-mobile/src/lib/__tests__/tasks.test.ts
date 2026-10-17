import { describe, expect, it } from '@jest/globals';
import { completedAt, deadlineKey, tasksOf } from '../tasks';

describe('tasksOf', () => {
  it('lists deadlines first, then actions that are not already a deadline', () => {
    const tasks = tasksOf(
      [{ date: '2026-11-30', description: 'Report income changes' }],
      ['Report income changes', 'Read the decision'],
    );
    expect(tasks).toEqual([
      { key: 'deadline:2026-11-30:Report income changes', title: 'Report income changes', date: '2026-11-30' },
      { key: 'action:Read the decision', title: 'Read the decision', date: null },
    ]);
  });
});

describe('completedAt', () => {
  it('finds when a task was ticked off', () => {
    const key = deadlineKey({ date: '2026-11-30', description: 'Report' });
    const doc = { completedTasks: [{ key, completedAt: '2026-10-17T09:00:00Z' }] };
    expect(completedAt(doc, key)).toBe('2026-10-17T09:00:00Z');
    expect(completedAt(doc, 'action:other')).toBeNull();
    expect(completedAt(null, key)).toBeNull();
  });
});
