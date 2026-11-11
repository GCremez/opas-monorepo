// Deadline reminders (design 6f) are scheduled on the device: they need no server or push
// credentials, keep working offline, and only ever contain what's already on the phone.
// Every sync clears Opas' pending reminders and schedules them again from the documents,
// so a ticked-off, deleted or changed deadline never fires a stale reminder.
//
// They're Premium (launch plan §3): the server says whether this user gets them
// (`remindersIncluded` on /subscription/usage, on for everyone during the beta).
// "Smart" means: a week, 3 days and 1 day before, and the morning it's due; reminders
// for a deadline already ticked off are dropped; and deadlines that would remind at the
// same moment arrive as one notification instead of a stack of them.
import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import type { Document } from '../types';
import { collectDeadlines, documentName, formatDate } from './decodeView';
import { authorityOf } from './authorities';
import { completedAt, deadlineKey } from './tasks';

/** Days before a deadline to remind; 0 is the morning it's due. */
export const REMIND_DAYS_BEFORE = [7, 3, 1, 0];
const REMIND_HOUR = 9;
// iOS keeps at most 64 pending local notifications per app; leave room for others.
const MAX_SCHEDULED = 60;
const ID_PREFIX = 'opas-deadline:';

export interface PlannedReminder {
  id: string;
  at: Date;
  title: string;
  body: string;
  documentId: string;
}

/** What should be scheduled right now, soonest first. Pure, so it can be tested. */
export function planReminders(documents: Document[], t: TFunction, locale: string, now: Date = new Date()): PlannedReminder[] {
  const single: (PlannedReminder & { what: string; left: string; due: string })[] = [];
  for (const { document, deadline, days } of collectDeadlines(documents, now)) {
    if (days < 0 || completedAt(document, deadlineKey(deadline))) continue;
    const [y, m, d] = deadline.date.split('-').map(Number);
    for (const before of REMIND_DAYS_BEFORE) {
      const at = new Date(y, m - 1, d - before, REMIND_HOUR);
      if (at <= now) continue;
      const left = before === 0 ? t('reminders.due_today') : t('reminders.days_left', { count: before });
      const what = deadline.description || documentName(document);
      const sender = authorityOf(document.authority)?.name;
      single.push({
        id: `${ID_PREFIX}${document.id}:${deadline.date}:${before}`,
        at,
        // Like the design: a short subject and the time left on top, the action below.
        title: `${sender ?? documentName(document)} — ${left}`,
        body: t('reminders.body', { what, date: formatDate(deadline.date, locale) }),
        documentId: document.id,
        what,
        left,
        due: deadline.date,
      });
    }
  }

  // Deadlines that would remind at the same moment become one notification, nearest
  // deadline first; tapping it opens that letter.
  const byTime = new Map<number, typeof single>();
  for (const r of single) byTime.set(r.at.getTime(), [...(byTime.get(r.at.getTime()) ?? []), r]);
  const planned: PlannedReminder[] = [];
  for (const [time, group] of byTime) {
    if (group.length === 1) {
      const { id, at, title, body, documentId } = group[0];
      planned.push({ id, at, title, body, documentId });
      continue;
    }
    const ordered = [...group].sort((a, b) => a.due.localeCompare(b.due));
    planned.push({
      id: `${ID_PREFIX}group:${time}`,
      at: new Date(time),
      title: t('reminders.several_title', { count: group.length }),
      body: ordered.map((r) => t('reminders.several_item', { what: r.what, left: r.left })).join(' · '),
      documentId: ordered[0].documentId,
    });
  }
  return planned.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED);
}

async function cancelOpasReminders() {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Replace the scheduled reminders with ones for the current documents (or none when off). */
export async function syncReminders(documents: Document[], enabled: boolean, t: TFunction, locale: string) {
  await cancelOpasReminders();
  if (!enabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  for (const r of planReminders(documents, t, locale)) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: { documentId: r.documentId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at },
    });
  }
}
