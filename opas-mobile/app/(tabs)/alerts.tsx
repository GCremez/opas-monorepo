import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useDocumentStore } from '../../src/store/documentStore';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';

function SectionHeader({ title, tone }: { title: string; tone: string }) {
  return (
    <Text className={`font-semibold text-[10px] tracking-[0.16em] uppercase pb-2 ${tone}`}>
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
      className="flex-row items-center justify-between gap-3.5 py-4 border-b border-hairline"
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${note}`}
    >
      <View className="flex-1">
        <Text className="font-display text-[16px] leading-[19px] text-fg">{title}</Text>
        <Text className="font-mono text-[10px] tracking-[0.05em] uppercase text-muted mt-1">{meta}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-mono-medium text-data ${tone}`}>{date}</Text>
        <Text className={`font-semibold text-[9px] tracking-[0.11em] uppercase mt-1 ${tone}`}>{note}</Text>
      </View>
    </Pressable>
  );
}

const demoThisWeek = [
  { title: 'Extend residence permit', meta: 'MIGRI', date: '30 JUN', note: '9 days', tone: 'text-danger', id: 'sample-3' },
];
const demoLater = [
  { title: 'Report income change', meta: 'KELA', date: '14 JUL', note: '23 days', tone: 'text-warning', id: 'sample-1' },
];
const demoDone = [
  { title: 'Submit tax card', meta: 'VERO', date: '✓ 12 MAY', id: 'sample-2' },
];

export default function AlertsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { documents, loading, fetchDocuments } = useDocumentStore();
  const { isDemo } = useAuthStore();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const onRefresh = useCallback(() => fetchDocuments(), [fetchDocuments]);
  const hasContent = isDemo || documents.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <View className="px-6 pt-3 pb-6">
          <Text className="font-semibold text-[10.5px] tracking-[0.20em] uppercase text-muted">
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

        {isDemo && (
          <>
            <View className="px-6">
              <SectionHeader title={t('alerts.this_week')} tone="text-danger" />
              {demoThisWeek.map((d) => (
                <DeadlineRow key={d.title} {...d} onPress={() => router.push('/application/12345')} />
              ))}
            </View>
            <View className="px-6 mt-6">
              <SectionHeader title={t('alerts.later')} tone="text-warning" />
              {demoLater.map((d) => (
                <DeadlineRow key={d.title} {...d} onPress={() => router.push(`/document/${d.id}`)} />
              ))}
            </View>
            <View className="px-6 mt-6">
              <SectionHeader title={t('alerts.done')} tone="text-muted" />
              {demoDone.map((d) => (
                <Pressable
                  key={d.title}
                  onPress={() => router.push(`/document/${d.id}`)}
                  className="flex-row items-center justify-between gap-3.5 py-4 border-b border-hairline"
                >
                  <Text className="font-display text-[16px] text-muted line-through">{d.title}</Text>
                  <Text className="font-mono text-[11px] text-accent">{d.date}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Real data: list ready documents as tracked items (no deadline model yet). */}
        {!isDemo && documents.length > 0 && (
          <View className="px-6">
            <SectionHeader title={t('alerts.this_week')} tone="text-warning" />
            {documents.map((d) => (
              <DeadlineRow
                key={d.id}
                title={d.filename}
                meta={d.status.toUpperCase()}
                date={new Date(d.updatedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }).toUpperCase()}
                note=""
                tone="text-muted"
                onPress={() => router.push(`/document/${d.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
