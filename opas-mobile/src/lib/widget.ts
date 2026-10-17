// Feeds the home-screen widget (design 6g): the nearest deadline that isn't done yet,
// with every label already in the user's language, since the widget can't translate.
import type { TFunction } from 'i18next';
import WidgetBridge from '../../modules/opas-widget-bridge';
import type { Document } from '../types';
import { collectDeadlines, documentName, formatDate } from './decodeView';
import { authorityOf } from './authorities';
import { completedAt, deadlineKey } from './tasks';

export function widgetPayload(documents: Document[], t: TFunction, locale: string, now: Date = new Date()) {
  const next = collectDeadlines(documents, now).find(
    (i) => i.days >= 0 && !completedAt(i.document, deadlineKey(i.deadline)),
  );
  return {
    documentId: next?.document.id ?? null,
    title: next ? next.deadline.description || documentName(next.document) : null,
    authority: next ? authorityOf(next.document.authority)?.name ?? null : null,
    date: next?.deadline.date ?? null,
    dateLabel: next ? formatDate(next.deadline.date, locale) : null,
    labels: {
      header: t('widget.header'),
      daysLeft: t('widget.days_left'),
      dayLeft: t('widget.day_left'),
      dueToday: t('widget.due_today'),
      due: t('widget.due'),
      empty: t('widget.empty'),
      scanHeader: t('widget.scan_header'),
      scanCta: t('widget.scan_cta'),
    },
  };
}

/** Push the current next deadline to the widget. A no-op in Expo Go, which has no widget. */
export function updateWidget(documents: Document[], t: TFunction, locale: string) {
  WidgetBridge?.setNextDeadline(JSON.stringify(widgetPayload(documents, t, locale)));
}
