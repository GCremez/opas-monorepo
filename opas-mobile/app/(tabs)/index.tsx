import * as React from 'react';
import { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../src/components/ui/Badge';
import { ErrorState, EmptyState } from '../../src/components/ui/EmptyState';
import { SearchIcon, ProfileIcon, DocumentIcon, FolderIcon, ScanIcon, CalendarIcon, ClockIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useDocumentStore } from '../../src/store/documentStore';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { usePremium } from '../../src/hooks/usePremium';
import { ChevronRightIcon } from '../../src/components/icons';
import type { Document } from '../../src/types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'good_morning';
  if (hour < 18) return 'good_afternoon';
  return 'good_evening';
}

type UserStage = 'new' | 'onboarding' | 'active';

function getUserStage(docs: Document[]): UserStage {
  if (docs.length === 0) return 'new';
  if (!docs.some((d) => d.status === 'ready')) return 'onboarding';
  return 'active';
}

const sampleDocs = [
  {
    id: 'sample-1',
    name: 'KELA Housing Benefit',
    meta: 'Scanned 2h ago \u2022 3 pages',
    badge: { label: 'New', variant: 'accent' as const },
  },
  {
    id: 'sample-2',
    name: 'Tax Card 2025',
    meta: 'Scanned yesterday \u2022 1 page',
    badge: { label: 'Translated', variant: 'success' as const },
  },
  {
    id: 'sample-3',
    name: 'Residence Permit Extension',
    meta: 'Scanned 3d ago \u2022 5 pages',
    badge: { label: 'Deadline Jun 30', variant: 'warning' as const },
  },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { documents, loading, error, fetchDocuments, clearError } = useDocumentStore();
  const { usage, fetchUsage } = useSubscriptionStore();
  const { user, isDemo } = useAuthStore();
  const { isFree, isPremium: premium } = usePremium();
  const userStage = getUserStage(documents);

  useEffect(() => {
    fetchDocuments();
    fetchUsage();
  }, []);

  const onRefresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#92d9bb" />}
      >
        <View className="flex-row items-center justify-between mt-2 mb-5">
          <Text className="font-display text-[24px] font-bold tracking-[-0.03em] text-fg">
            {t('home.title')}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              className="w-11 h-11 rounded-full items-center justify-center"
              accessibilityLabel={t('tabs.search')}
            >
              <SearchIcon size={20} color="#f5f5f7" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              className="w-11 h-11 rounded-full items-center justify-center"
              accessibilityLabel={t('tabs.profile')}
            >
              <ProfileIcon size={20} color="#f5f5f7" />
            </Pressable>
          </View>
        </View>

          <View className="bg-surface border border-border rounded-lg p-5 mb-5">
            <Text className="font-display text-[20px] font-bold tracking-[-0.02em] text-fg mb-0.5">
              {t(`home.${getGreeting()}`)}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </Text>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-1.5 ${userStage === 'active' ? 'bg-success' : 'bg-accent'}`} />
              <Text className="text-body-sm text-muted">
                {userStage === 'new' && t('home.status_new')}
                {userStage === 'onboarding' && t('home.status_onboarding')}
                {userStage === 'active' && t('home.status_ok')}
              </Text>
            </View>
          </View>

        {error && documents.length === 0 && (
          <ErrorState
            title={error}
            description="Make sure the backend server is running and your device is on the same network. Pull down to retry."
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}
        {error && documents.length > 0 && (
          <ErrorState
            title={error}
            description="Pull down to retry."
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        {!error && !loading && documents.length === 0 && !isDemo && (
          <EmptyState
            title={t('home.no_documents')}
            description={t('home.no_documents_desc')}
            actionLabel={t('home.scan_first')}
            onAction={() => router.push('/(tabs)/scan')}
          />
        )}

        {isDemo && (
          <Pressable
            onPress={() => router.push('/document/sample-3')}
            className="flex-row items-center bg-warning/10 border border-warning/20 rounded-md p-4 mb-5"
            accessibilityLabel={`${t('home.deadline_title')} — ${t('home.days_left')}`}
          >
            <View className="w-11 h-11 rounded-full bg-warning/20 items-center justify-center mr-3">
              <ClockIcon size={18} color="#ff9f0a" />
            </View>
            <View className="flex-1">
              <Text className="text-body font-semibold text-fg">{t('home.deadline_title')}</Text>
              <Text className="text-body-sm text-muted">{t('home.deadline_desc')}</Text>
            </View>
            <View className="items-end">
              <Text className="font-display text-[18px] font-bold text-warning">7</Text>
              <Text className="text-caption text-muted">{t('home.days_left')}</Text>
            </View>
          </Pressable>
        )}

        {isFree && !isDemo && (
          <Pressable
            onPress={() => router.push('/subscription')}
            className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-5"
          >
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-body font-semibold text-fg">{t('profile.upgrade_title')}</Text>
                <Text className="text-body-sm text-muted">{t('profile.upgrade_desc')}</Text>
              </View>
              <ChevronRightIcon size={18} color="#92d9bb" />
            </View>
            {usage && (
              <View className="flex-row items-center gap-2 mt-2 pt-2 border-t border-accent/20">
                <View className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${Math.min(100, (usage.remaining / Math.max(usage.limit, 1)) * 100)}%` }}
                  />
                </View>
                <Text className="text-caption text-muted">
                  {t('profile.remaining_decodes', { remaining: usage.remaining, limit: usage.limit })}
                </Text>
              </View>
            )}
          </Pressable>
        )}

        {isDemo && (
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-display text-heading-m text-fg">
              {t('home.recent_documents')}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/search')}
              accessibilityLabel={t('common.see_all')}
            >
              <Text className="text-body-sm text-accent">{t('common.see_all')}</Text>
            </Pressable>
          </View>
        )}

        {isDemo && (
          <View className="mb-6">
            {sampleDocs.map((doc) => (
              <Pressable
                key={doc.id}
                onPress={() => router.push(`/document/${doc.id}`)}
                className="flex-row items-center min-h-touch px-2"
                accessibilityLabel={doc.name}
              >
                <View className="w-11 h-11 rounded-md bg-accent-dim items-center justify-center mr-3">
                  <DocumentIcon size={20} color="#92d9bb" />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-medium text-fg" numberOfLines={1}>
                    {doc.name}
                  </Text>
                  <Text className="text-body-sm text-muted">{doc.meta}</Text>
                </View>
                <Badge variant={doc.badge.variant}>{doc.badge.label}</Badge>
              </Pressable>
            ))}
          </View>
        )}

        <Text className="font-display text-heading-m text-fg mb-4">
          {t('home.quick_actions')}
        </Text>
        <View className="bg-surface border border-border rounded-lg overflow-hidden mb-6">
          {(userStage === 'new' ? [
            { key: 'scan_first', icon: ScanIcon, action: '/(tabs)/scan', labelKey: 'scan_first', descKey: 'scan_first_desc', ctaKey: 'quick_action_open' },
            { key: 'browse_folders', icon: FolderIcon, action: '/(tabs)/docs', labelKey: 'browse_folders', descKey: 'browse_folders_desc', ctaKey: 'quick_action_open' },
            { key: 'how_opas_works', icon: SearchIcon, action: '/(tabs)/search', labelKey: 'how_opas_works', descKey: 'how_opas_works_desc', ctaKey: 'quick_action_open' },
          ] : userStage === 'onboarding' ? [
            { key: 'scan_first', icon: ScanIcon, action: '/(tabs)/scan', labelKey: 'scan_first', descKey: 'scan_first_desc', ctaKey: 'quick_action_open' },
            { key: 'browse_documents', icon: DocumentIcon, action: '/(tabs)/docs', labelKey: 'browse_documents', descKey: 'browse_documents_desc', ctaKey: 'quick_action_open' },
            { key: 'upcoming_deadlines', icon: CalendarIcon, action: '/(tabs)/docs', labelKey: 'upcoming_deadlines', descKey: 'upcoming_deadlines_desc', ctaKey: 'quick_action_view' },
          ] : [
            { key: 'continue_scanning', icon: ScanIcon, action: '/(tabs)/scan', labelKey: 'continue_scanning', descKey: 'continue_scanning_desc', ctaKey: 'quick_action_open' },
            { key: 'upcoming_deadlines', icon: CalendarIcon, action: '/(tabs)/docs', labelKey: 'upcoming_deadlines', descKey: 'upcoming_deadlines_desc', ctaKey: 'quick_action_view' },
            { key: 'browse_documents', icon: DocumentIcon, action: '/(tabs)/docs', labelKey: 'browse_documents', descKey: 'browse_documents_desc', ctaKey: 'quick_action_open' },
          ]).map((item, i, arr) => (
            <React.Fragment key={item.key}>
              <Pressable
                onPress={() => router.push(item.action as any)}
                className="flex-row items-center px-4 py-3.5 min-h-touch active:opacity-60"
                accessibilityLabel={t(`home.${item.labelKey}`)}
              >
                <View className="w-11 h-11 rounded-full bg-accent-dim items-center justify-center mr-3.5">
                  <item.icon size={20} color="#92d9bb" />
                </View>
                <View className="flex-1">
                  <Text className="text-body font-semibold text-fg">{t(`home.${item.labelKey}`)}</Text>
                  <Text className="text-body-sm text-muted">{t(`home.${item.descKey}`)}</Text>
                </View>
                <Text className="text-body-sm text-accent font-medium">{t(`home.${item.ctaKey}`)}</Text>
              </Pressable>
              {i < arr.length - 1 && <View className="h-[1px] bg-border mx-4" />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
