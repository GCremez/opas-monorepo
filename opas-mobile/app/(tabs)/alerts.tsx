import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { GatherScrollView } from '../../src/components/motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useDocumentStore } from '../../src/store/documentStore';
import { collectDeadlines, documentName, formatDate, type DeadlineItem } from '../../src/lib/decodeView';
import { authorityOf } from '../../src/lib/authorities';
import { completedAt, deadlineKey } from '../../src/lib/tasks';

// Passed and done deadlines stay visible for a month, then drop off the list.
const PASSED_WINDOW_DAYS = 30;
const DONE_WINDOW_MS = 30 * 24 * 3_600_000;

const doneRecently = (iso: string) => Date.now() - Date.parse(iso) < DONE_WINDOW_MS;

function SectionHeader({ title, tone }: { title: string; tone: string }) {
  return (
    <Text className={`font-semibold text-label uppercase pb-2 border-b border-rule ${tone}`}>{title}</Text>
  );
}

function DeadlineRow({
  title, meta, date, note, tone, onPress,
}: {
  title: string; meta: string; date: string; note: string; tone: string; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between gap-3.5 py-[15px] border-b border-line"
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${note}`}
    >
      <View className="flex-1">
        <Text className="font-display text-[16px] leading-[19px] text-fg">{title}</Text>
        <Text className="font-mono text-meta uppercase text-muted mt-1">{meta}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-mono-medium text-[13px] uppercase ${tone}`}>{date}</Text>
        <Text className={`font-semibold text-[10px] tracking-[0.11em] uppercase mt-1 ${tone}`}>{note}</Text>
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { documents, loading, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const onRefresh = useCallback(() => fetchDocuments(), [fetchDocuments]);
  const deadlines = collectDeadlines(documents);
  const isDone = (item: DeadlineItem) => completedAt(item.document, deadlineKey(item.deadline)) !== null;
  const open = deadlines.filter((i) => !isDone(i));
  const thisWeek = open.filter((i) => i.days >= 0 && i.days <= 7);
  const laterThisMonth = open.filter((i) => i.days > 7 && i.days <= 31);
  const later = open.filter((i) => i.days > 31);
  const passed = open.filter((i) => i.days < 0 && i.days >= -PASSED_WINDOW_DAYS).reverse();
  // Ticked off in the last month, most recent first (design 3g "Done").
  const done = deadlines
    .map((item) => ({ item, at: completedAt(item.document, deadlineKey(item.deadline)) }))
    .filter((x): x is { item: DeadlineItem; at: string } => x.at !== null && doneRecently(x.at))
    .sort((a, b) => b.at.localeCompare(a.at));
  const hasContent = open.some((i) => i.days >= -PASSED_WINDOW_DAYS) || done.length > 0;

  const renderRow = ({ document, deadline, days }: DeadlineItem, tone: string) => (
    <DeadlineRow
      key={`${document.id}-${deadline.date}-${deadline.description}`}
      title={deadline.description || documentName(document)}
      meta={authorityOf(document.authority)?.name ?? documentName(document)}
      date={formatDate(deadline.date, i18n.language)}
      note={days < 0 ? t('alerts.passed') : days === 0 ? t('document.due_today') : t('folder.in_days', { count: days })}
      tone={tone}
      onPress={() => router.push(`/document/${document.id}`)}
    />
  );

  const section = (title: string, tone: string, items: DeadlineItem[], rowTone: (i: DeadlineItem) => string) =>
    items.length > 0 && (
      <View className="px-6 mb-6">
        <SectionHeader title={title} tone={tone} />
        {items.map((item) => renderRow(item, rowTone(item)))}
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <GatherScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshing={loading}
        onRefresh={onRefresh}
      >
        <View className="px-6 pt-3 pb-[22px]">
          <Text className="font-semibold text-label uppercase text-muted">{t('alerts.eyebrow')}</Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">
            {t('alerts.title')}
          </Text>
        </View>

        {!hasContent && !loading && (
          <EmptyState
            title={t('alerts.no_alerts')}
            description={t('alerts.no_alerts_desc')}
            actionLabel={t('home.scan_first')}
            onAction={() => router.push('/(tabs)/scan')}
          />
        )}

        {/* Deadlines stated in the user's own documents (design 3g). */}
        {section(t('alerts.this_week'), 'text-danger', thisWeek, (i) => (i.days <= 3 ? 'text-danger' : 'text-warning'))}
        {section(t('alerts.later_this_month'), 'text-warning', laterThisMonth, () => 'text-warning')}
        {section(t('alerts.later'), 'text-fg', later, () => 'text-fg-soft')}
        {section(t('alerts.passed'), 'text-muted', passed, () => 'text-muted')}

        {done.length > 0 && (
          <View className="px-6 mb-6">
            <SectionHeader title={t('alerts.done')} tone="text-muted" />
            {done.map(({ item, at }) => (
              <Pressable
                key={`${item.document.id}-${item.deadline.date}-${item.deadline.description}`}
                onPress={() => router.push(`/document/${item.document.id}`)}
                className="flex-row items-center justify-between gap-3.5 py-[15px] border-b border-line"
                accessibilityRole="button"
              >
                <Text className="font-display text-[16px] leading-[19px] text-muted line-through flex-1">
                  {item.deadline.description || documentName(item.document)}
                </Text>
                <Text className="font-mono text-meta uppercase text-accent">✓ {formatDate(at.slice(0, 10), i18n.language)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </GatherScrollView>
    </SafeAreaView>
  );
}
