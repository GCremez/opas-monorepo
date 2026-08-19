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
          <Text className="font-semibold text-[10px] tracking-[0.14em] uppercase text-muted">{seeAllLabel}</Text>
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
        <Text className="font-mono text-[10px] tracking-[0.05em] uppercase text-muted mt-1">{meta}</Text>
      </View>
      <View className="items-end">
        <Text className={`font-mono-medium text-data ${tone}`}>{date}</Text>
        <Text className={`font-semibold text-[9px] tracking-[0.11em] uppercase mt-1 ${tone}`}>{note}</Text>
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
        <Text className="font-mono text-[10px] tracking-[0.04em] text-muted">{age}</Text>
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
  const { t } = useTranslation();
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

  const onRefresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const hasDocuments = documents.length > 0;
  const docCount = documents.length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Masthead */}
        <View className="px-6 pt-3 pb-6">
          <View className="flex-row items-start justify-between">
            <Text className="font-semibold text-[10.5px] tracking-[0.20em] uppercase text-muted">
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
              {t('record.all_clear')}
              <Text className="text-danger">{t('record.one_thing')}</Text>
            </Text>
          )}
        </View>

        {error && (
          <ErrorState
            title={error}
            description={documents.length === 0
              ? 'Make sure the backend server is running and your device is on the same network. Pull down to retry.'
              : 'Pull down to retry.'}
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        {!error && !loading && !hasDocuments && (
          <View className="px-6 pt-6">
            <Text className="font-display text-[27px] leading-[30px] tracking-[-0.01em] text-fg">{t('record.empty_title')}</Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mt-3 mb-7">{t('record.empty_desc')}</Text>
            <Button variant="primary" size="lg" block onPress={() => router.push('/(tabs)/scan')}>
              {t('record.scan_first')}
            </Button>
            <Pressable onPress={() => router.push('/(onboarding)')} className="items-center py-3.5 mt-3 min-h-touch justify-center">
              <Text className="font-semibold text-[11px] tracking-[0.06em] uppercase text-muted">{t('record.see_how')}</Text>
            </Pressable>
          </View>
        )}

        {/* Your documents */}
        {hasDocuments && (
          <View className="px-6 mt-6">
            <SectionHeader
              title={t('record.your_documents')}
              onSeeAll={() => router.push('/(tabs)/docs')}
              seeAllLabel={t('record.see_all')}
            />
            {documents.slice(0, 6).map((d) => (
              <DocRow
                key={d.id}
                name={d.filename}
                value={d.status === 'ready' ? 'READ' : d.status.toUpperCase()}
                age={timeAgo(d.updatedAt)}
                valueTone={d.status === 'ready' ? 'text-accent' : 'text-muted'}
                onPress={() => router.push(`/document/${d.id}`)}
              />
            ))}
            <Text className="font-serif-italic text-[14px] leading-[22px] text-muted pt-4">
              {t(docCount === 1 ? 'record.footer_one' : 'record.footer_other', { count: docCount })}
            </Text>
          </View>
        )}

        {/* Explore Opas — always show for all users */}
        <View className="px-6 mt-8">
          <SectionHeader title={t('record.explore')} />
          {[
            { label: t('record.ask_opas'), meta: t('record.ask_opas_meta'), route: '/ask' as const },
            { label: t('record.guides'), meta: t('record.guides_meta'), route: '/guide/register-address' as const },
            { label: t('record.journey'), meta: t('record.journey_meta'), route: '/journey' as const },
          ].map((item) => (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route)}
              className="flex-row items-baseline justify-between py-3.5 border-b border-hairline"
            >
              <View className="flex-1">
                <Text className="font-display text-heading text-fg">{item.label}</Text>
                <Text className="font-body text-body-sm text-muted mt-0.5">{item.meta}</Text>
              </View>
              <Text className="font-mono text-[13px] text-muted">›</Text>
            </Pressable>
          ))}
        </View>

        {/* Free-tier nudge */}
        {isFree && hasDocuments && (
          <Pressable
            onPress={() => router.push('/subscription')}
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
                <Text className="font-mono text-[11px] text-muted">
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
