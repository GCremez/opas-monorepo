import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../src/components/ui/EmptyState';
import { Button } from '../../src/components/ui/Button';
import { SearchIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useDocumentStore } from '../../src/store/documentStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { usePremium } from '../../src/hooks/usePremium';
import { useThemeColors } from '../../src/store/themeStore';
import { track } from '../../src/lib/analytics';
import { collectDeadlines, documentName, formatDate } from '../../src/lib/decodeView';

// "Needs you" covers deadlines stated in the user's documents within this many days.
const NEEDS_YOU_WINDOW_DAYS = 14;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'good_morning';
  if (hour < 18) return 'good_afternoon';
  return 'good_evening';
}

// Section header — tracked caps over a rule underline (v2 signature).
function SectionHeader({ title, onSeeAll, seeAllLabel }: { title: string; onSeeAll?: () => void; seeAllLabel?: string }) {
  return (
    <View className="flex-row items-baseline justify-between pb-2.5 border-b border-rule">
      <Text className="font-semibold text-label uppercase text-fg">{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} accessibilityRole="button">
          <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted">{seeAllLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// "Needs you" ledger row — serif title, mono authority, dated status.
function ActionRow({
  title, meta, date, note, urgency, onPress,
}: {
  title: string; meta: string; date: string; note: string;
  urgency: 'danger' | 'warning' | 'muted'; onPress?: () => void;
}) {
  const tone = urgency === 'danger' ? 'text-danger' : urgency === 'warning' ? 'text-warning' : 'text-muted';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between gap-3.5 py-4 border-b border-hairline"
      accessibilityRole="button"
      accessibilityLabel={`${title} — ${note}`}
    >
      <View className="flex-1">
        <Text className="font-display text-heading text-fg" numberOfLines={1}>{title}</Text>
        <Text className="font-mono text-label tracking-[0.05em] uppercase text-muted mt-1">{meta}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-mono-medium text-data ${tone}`}>{date}</Text>
        <Text className={`font-semibold text-label tracking-[0.11em] uppercase mt-1 ${tone}`}>{note}</Text>
      </View>
    </Pressable>
  );
}

// "Your documents" ledger row — name + mono value + age.
function DocRow({
  name, value, age, valueTone = 'text-accent', onPress,
}: {
  name: string; value: string; age: string; valueTone?: string; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-baseline justify-between gap-3 py-3.5 border-b border-hairline"
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{name}</Text>
      <View className="flex-row items-baseline gap-2.5">
        <Text className={`font-mono-medium text-data ${valueTone}`}>{value}</Text>
        <Text className="font-mono text-meta tracking-[0.04em] text-muted">{age}</Text>
      </View>
    </Pressable>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'NOW';
  if (h < 24) return `${h}H`;
  return `${Math.floor(h / 24)}D`;
}

export default function RecordScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { documents, loading, error, fetchDocuments, clearError } = useDocumentStore();
  const { usage, fetchUsage } = useSubscriptionStore();
  const { user } = useAuthStore();
  const { isFree } = usePremium();
  const firstName = user?.name ? user.name.split(' ')[0] : '';

  useEffect(() => {
    fetchDocuments();
    fetchUsage();
  }, []);

  // Fire documents_list_viewed once, after the first load settles (mount count is
  // always 0). Guard so pull-to-refresh doesn't re-emit it.
  const listViewed = React.useRef(false);
  useEffect(() => {
    if (!loading && !error && !listViewed.current) {
      listViewed.current = true;
      track('documents_list_viewed', { count: documents.length, is_free: isFree });
    }
  }, [loading, error, documents.length, isFree]);

  const onRefresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const hasDocuments = documents.length > 0;
  const docCount = documents.length;
  const needsYou = collectDeadlines(documents)
    .filter((item) => item.days >= 0 && item.days <= NEEDS_YOU_WINDOW_DAYS)
    .slice(0, 3);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Masthead */}
        <View className="px-6 pt-3 pb-6">
          <View className="flex-row items-start justify-between">
            <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
              {t('record.eyebrow')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              className="w-9 h-9 -mt-2 items-center justify-center"
              accessibilityLabel={t('tabs.search')}
            >
              <SearchIcon size={20} color={c.muted} />
            </Pressable>
          </View>
          <Text className="font-display text-[31px] leading-[34px] tracking-[-0.01em] text-fg mt-2">
            {t(`home.${getGreeting()}`)},{firstName ? `\n${firstName}.` : '.'}
          </Text>
          {hasDocuments && (
            <Text className="font-serif text-[15px] leading-[23px] text-fg-soft mt-3">
              {needsYou.length > 0 ? (
                <Text className="text-danger">{t('record.needs_count', { count: needsYou.length }).trim()}</Text>
              ) : (
                t('record.nothing_needs')
              )}
            </Text>
          )}
        </View>

        {error && (
          <ErrorState
            title={error}
            description={t('record.load_error_desc')}
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        {!error && !loading && !hasDocuments && (
          <View className="flex-1 items-center justify-center px-8">
            {/* Centered empty state, per the design (3d). */}
            <View className="w-16 h-16 rounded-full border border-rule items-center justify-center mb-7">
              <Text className="font-display text-[30px] leading-[30px] text-accent">+</Text>
            </View>
            <Text className="font-display text-[27px] leading-[31px] tracking-[-0.01em] text-fg text-center">{t('record.empty_title')}</Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft text-center mt-3 mb-8">{t('record.empty_desc')}</Text>
            <Button variant="primary" size="lg" block onPress={() => { track('empty_state_cta_tap'); router.push('/(tabs)/scan'); }}>
              {t('record.scan_first')}
            </Button>
            <Pressable onPress={() => router.push('/(onboarding)')} className="items-center py-3.5 mt-3 min-h-touch justify-center">
              <Text className="font-semibold text-label tracking-[0.06em] uppercase text-muted">{t('record.see_how')}</Text>
            </Pressable>
          </View>
        )}

        {/* Needs you — the nearest deadlines stated in the user's own documents. */}
        {needsYou.length > 0 && (
          <View className="px-6 mt-2">
            <SectionHeader
              title={t('record.needs_you')}
              onSeeAll={() => router.push('/(tabs)/alerts')}
              seeAllLabel={t('record.see_all')}
            />
            {needsYou.map(({ document, deadline, days }) => (
              <ActionRow
                key={`${document.id}-${deadline.date}-${deadline.description}`}
                title={deadline.description || documentName(document)}
                meta={document.authority ?? documentName(document)}
                date={formatDate(deadline.date, i18n.language)}
                note={days === 0 ? t('document.due_today') : t('document.days_left', { count: days })}
                urgency={days <= 3 ? 'danger' : days <= 7 ? 'warning' : 'muted'}
                onPress={() => router.push(`/document/${document.id}`)}
              />
            ))}
          </View>
        )}

        {/* Your documents */}
        {hasDocuments && (
          <View className="px-6 mt-8">
            <SectionHeader
              title={t('record.your_documents')}
              onSeeAll={() => router.push('/(tabs)/docs')}
              seeAllLabel={t('record.see_all')}
            />
            {documents.slice(0, 6).map((d) => (
              <DocRow
                key={d.id}
                name={documentName(d)}
                value={t(`status.${d.status}`).toUpperCase()}
                age={timeAgo(d.updatedAt)}
                valueTone={d.status === 'ready' ? 'text-accent' : 'text-muted'}
                onPress={() => {
                  track('document_tap', { doc_id: d.id, status: d.status });
                  router.push(`/document/${d.id}`);
                }}
              />
            ))}
            <Text className="font-serif-italic text-[14px] leading-[22px] text-muted pt-4">
              {t(docCount === 1 ? 'record.footer_one' : 'record.footer_other', { count: docCount })}
            </Text>
          </View>
        )}

        {/* Free-tier nudge */}
        {isFree && hasDocuments && (
          <Pressable
            onPress={() => {
              track('upgrade_nudge_tap', { remaining: usage?.remaining ?? null, limit: usage?.limit ?? null });
              router.push('/subscription');
            }}
            className="mx-6 mt-8 p-5 rounded-lg bg-surface border border-hairline"
          >
            <Text className="font-semibold text-label uppercase text-warning mb-1.5">
              {t('profile.upgrade_title')}
            </Text>
            <Text className="font-serif text-prose text-fg-soft">{t('profile.upgrade_desc')}</Text>
            {usage && (
              <View className="flex-row items-center gap-3 mt-4 pt-3 border-t border-hairline">
                <View className="flex-1 h-1.5 bg-surface-2 rounded-pill overflow-hidden">
                  <View
                    className="h-full bg-accent rounded-pill"
                    style={{ width: `${Math.min(100, (usage.remaining / Math.max(usage.limit, 1)) * 100)}%` }}
                  />
                </View>
                <Text className="font-mono text-meta text-muted">
                  {t('profile.remaining_decodes', { remaining: usage.remaining, limit: usage.limit })}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
