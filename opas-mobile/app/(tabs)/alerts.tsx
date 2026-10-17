import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useDocumentStore } from '../../src/store/documentStore';
import { useThemeColors } from '../../src/store/themeStore';
import { collectDeadlines, documentName, formatDate, type DeadlineItem } from '../../src/lib/decodeView';

// Passed deadlines stay visible for a month, then drop off the list.
const PASSED_WINDOW_DAYS = 30;

function SectionHeader({ title, tone }: { title: string; tone: string }) {
  return (
    <Text className={`font-semibold text-label tracking-[0.16em] uppercase pb-2 ${tone}`}>
      {title}
    </Text>
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
      className="flex-row items-center justify-between gap-3.5 py-4 border-b border-line"
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${note}`}
    >
      <View className="flex-1">
        <Text className="font-display text-[16px] leading-[19px] text-fg">{title}</Text>
        <Text className="font-mono text-label tracking-[0.05em] uppercase text-muted mt-1">{meta}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-mono-medium text-data ${tone}`}>{date}</Text>
        <Text className={`font-semibold text-label tracking-[0.11em] uppercase mt-1 ${tone}`}>{note}</Text>
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { documents, loading, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const onRefresh = useCallback(() => fetchDocuments(), [fetchDocuments]);
  const deadlines = collectDeadlines(documents);
  const thisWeek = deadlines.filter((i) => i.days >= 0 && i.days <= 7);
  const later = deadlines.filter((i) => i.days > 7);
  const passed = deadlines.filter((i) => i.days < 0 && i.days >= -PASSED_WINDOW_DAYS).reverse();
  const hasContent = thisWeek.length + later.length + passed.length > 0;

  const renderRow = ({ document, deadline, days }: DeadlineItem, tone: string) => (
    <DeadlineRow
      key={`${document.id}-${deadline.date}-${deadline.description}`}
      title={deadline.description || documentName(document)}
      meta={document.authority ?? documentName(document)}
      date={formatDate(deadline.date, i18n.language)}
      note={days < 0 ? t('alerts.passed') : days === 0 ? t('document.due_today') : t('document.days_left', { count: days })}
      tone={tone}
      onPress={() => router.push(`/document/${document.id}`)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <View className="px-6 pt-3 pb-6">
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
            {t('alerts.eyebrow')}
          </Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2.5">
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

        {/* Deadlines stated in the user's own documents. */}
        {thisWeek.length > 0 && (
          <View className="px-6 mb-8">
            <SectionHeader title={t('alerts.this_week')} tone="text-warning" />
            {thisWeek.map((item) => renderRow(item, item.days <= 3 ? 'text-danger' : 'text-warning'))}
          </View>
        )}
        {later.length > 0 && (
          <View className="px-6 mb-8">
            <SectionHeader title={t('alerts.later')} tone="text-fg" />
            {later.map((item) => renderRow(item, 'text-fg-soft'))}
          </View>
        )}
        {passed.length > 0 && (
          <View className="px-6 mb-8">
            <SectionHeader title={t('alerts.passed')} tone="text-muted" />
            {passed.map((item) => renderRow(item, 'text-muted'))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
