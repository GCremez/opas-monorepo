import * as React from 'react';
import { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SearchIcon, DocumentIcon, ChevronRightIcon, XIcon, ClockIcon } from '../../src/components/icons';
import { useDocumentStore } from '../../src/store/documentStore';
import { useAuthStore } from '../../src/store/authStore';

type Authority = 'all' | 'kela' | 'vero' | 'migri' | 'suomi';

type RecentDoc = {
  id: string;
  name: string;
  meta: string;
  color: string;
  authority: Authority;
};

const recentDocs: RecentDoc[] = [
  { id: 'recent-1', name: 'KELA \u2014 Housing Benefit', meta: '2 pages \u2022 Finnish', color: '#92d9bb', authority: 'kela' },
  { id: 'recent-2', name: 'Tax Card 2025', meta: '1 page \u2022 Finnish', color: '#30d158', authority: 'vero' },
  { id: 'recent-3', name: 'Residence Permit Extension', meta: '5 pages \u2022 Swedish', color: '#ff9f0a', authority: 'migri' },
  { id: 'recent-4', name: 'Finnish Tax Decision 2024', meta: '2 pages \u2022 Finnish', color: '#92d9bb', authority: 'vero' },
  { id: 'recent-5', name: 'Employment Contract Review', meta: '4 pages \u2022 English', color: '#30d158', authority: 'suomi' },
];

const AUTHORITIES: { key: Authority; labelKey: string }[] = [
  { key: 'all', labelKey: 'search.filters.all' },
  { key: 'kela', labelKey: 'search.filters.kela' },
  { key: 'vero', labelKey: 'search.filters.vero' },
  { key: 'migri', labelKey: 'search.filters.migri' },
  { key: 'suomi', labelKey: 'search.filters.suomi' },
];

const AUTHORITY_META = [
  { key: 'kela', color: '#92d9bb', icon: 'K', desc: 'Social Insurance' },
  { key: 'vero', color: '#30d158', icon: 'V', desc: 'Tax Administration' },
  { key: 'migri', color: '#ff9f0a', icon: 'M', desc: 'Immigration Service' },
  { key: 'suomi', color: '#5e5ce6', icon: 'S', desc: 'Suomi.fi' },
] as const;

function StaggerFadeIn({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, delay: index * 40, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [index]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const isReady = status === 'ready';
  return (
    <View className={`self-start px-2 py-0.5 rounded-full ${isReady ? 'bg-accent-dim' : 'bg-surface-2'}`}>
      <Text className={`text-[10px] font-semibold ${isReady ? 'text-accent' : 'text-muted'}`}>
        {isReady ? t('search.status_decoded') : t('search.status_pending')}
      </Text>
    </View>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const { documents } = useDocumentStore();
  const { isDemo } = useAuthStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Authority>('all');

  const hasRealDocs = documents.length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const fromReal = documents.filter((d) => {
      const matchesQuery = d.filename.toLowerCase().includes(q);
      const matchesFilter = activeFilter === 'all' || d.filename.toLowerCase().includes(activeFilter);
      return matchesQuery && matchesFilter;
    });

    if (fromReal.length > 0) return fromReal;

    if (!isDemo) return [];

    return recentDocs.filter((d) => {
      const matchesQuery = d.name.toLowerCase().includes(q);
      const matchesFilter = activeFilter === 'all' || d.authority === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [query, documents, activeFilter, isDemo]);

  const visibleRecent = useMemo(() => {
    if (isDemo) {
      return activeFilter === 'all'
        ? recentDocs
        : recentDocs.filter((d) => d.authority === activeFilter);
    }
    if (!hasRealDocs) return [];
    const filtered = activeFilter === 'all'
      ? documents
      : documents.filter((d) => d.filename.toLowerCase().includes(activeFilter));
    return filtered.slice(0, 5);
  }, [isDemo, hasRealDocs, documents, activeFilter]);

  const showBrowseCards = !query && activeFilter === 'all' && hasRealDocs;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-5 pt-3">
        <View className="flex-row items-center bg-surface border border-border rounded-full h-[44px] px-3">
          <SearchIcon size={18} color="#86868b" />
          <TextInput
            ref={inputRef}
            className="flex-1 font-body text-[15px] text-fg px-2 py-3"
            placeholder={t('search.placeholder')}
            placeholderTextColor="#86868b"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              className="w-7 h-7 rounded-full bg-surface-2 items-center justify-center"
              activeOpacity={0.6}
              accessibilityLabel={t('common.cancel')}
            >
              <XIcon size={14} color="#86868b" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5 pt-3 pb-3">
          <View className="flex-row gap-2">
            {AUTHORITIES.map((auth) => {
              const isActive = activeFilter === auth.key;
              return (
                <TouchableOpacity
                  key={auth.key}
                  activeOpacity={0.7}
                  onPress={() => setActiveFilter(auth.key)}
                  className={`px-3.5 py-1.5 rounded-full border items-center justify-center ${
                    isActive ? 'bg-accent border-accent' : 'bg-surface border-border'
                  }`}
                  accessibilityLabel={t(auth.labelKey)}
                >
                  <Text className={`text-body-sm font-medium ${isActive ? 'text-black' : 'text-muted'}`}>
                    {t(auth.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {query ? (
          filtered.length > 0 ? (
            <View className="mt-3 mb-8">
              <Text className="text-[13px] font-semibold text-muted mb-3">
                {t('search.result_count', { count: filtered.length })}
              </Text>
              <View className="gap-2">
                {filtered.map((doc, i) => {
                  const isRecent = 'authority' in doc;
                  const meta = isRecent ? (doc as RecentDoc).meta : `${(doc as any).pages || '1'} pages`;
                  const iconColor = isRecent ? (doc as RecentDoc).color : '#92d9bb';
                  const displayName = 'name' in doc ? (doc as RecentDoc).name : (doc as { filename: string }).filename;
                  const status = 'status' in doc ? (doc as any).status : 'ready';
                  return (
                    <StaggerFadeIn key={doc.id} index={i}>
                      <TouchableOpacity
                        className="flex-row items-center gap-3 p-3 min-h-touch rounded-lg bg-surface border border-border active:opacity-60"
                        activeOpacity={0.7}
                        onPress={() => router.push(`/document/${doc.id}`)}
                        accessibilityLabel={displayName}
                      >
                        <View className="w-11 h-11 rounded-lg bg-surface-2 items-center justify-center">
                          <DocumentIcon size={20} color={iconColor} />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-[14px] font-medium text-fg" numberOfLines={1}>
                            {displayName}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-1">
                            <Text className="text-[12px] text-muted">{meta}</Text>
                            {!isRecent && <StatusBadge status={status} />}
                          </View>
                        </View>
                        <ChevronRightIcon size={16} color="#38383a" />
                      </TouchableOpacity>
                    </StaggerFadeIn>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="items-center pt-20 px-8">
              <View className="w-14 h-14 rounded-full bg-surface border border-border items-center justify-center mb-5">
                <SearchIcon size={22} color="#86868b" />
              </View>
              <Text className="font-display text-[18px] text-fg mb-2">
                {t('search.no_results')}
              </Text>
              <Text className="font-body text-[14px] text-muted text-center leading-[1.6] mb-2">
                {t('search.no_results_desc')}
              </Text>
              <Text className="font-body text-[13px] text-muted/60 text-center leading-[1.5]">
                {t('search.no_results_hint')}
              </Text>
              <View className="flex-row gap-3 mt-8">
                {activeFilter !== 'all' && (
                  <TouchableOpacity
                    onPress={() => setActiveFilter('all')}
                    className="px-5 py-2.5 min-h-touch rounded-full bg-surface border border-border items-center justify-center"
                    accessibilityLabel={t('search.clear_filter')}
                  >
                    <Text className="text-[13px] font-medium text-muted">{t('search.clear_filter')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  className="px-5 py-2.5 min-h-touch rounded-full bg-accent-dim border border-accent items-center justify-center"
                  accessibilityLabel={t('search.clear_search')}
                >
                    <Text className="text-[13px] font-semibold text-accent">{t('search.clear_search')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : visibleRecent.length > 0 || isDemo ? (
          <View className="mt-3 mb-8">
            {showBrowseCards && (
              <View className="mb-8">
                <Text className="text-[13px] font-semibold text-muted mb-3">
                  {t('search.browse_by_authority')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {AUTHORITY_META.map((a) => (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() => setActiveFilter(a.key)}
                      className="flex-row items-center gap-2.5 px-4 py-3 rounded-lg bg-surface border border-border min-h-touch flex-1 min-w-[140px]"
                      activeOpacity={0.7}
                    >
                      <View className="w-9 h-9 rounded-lg items-center justify-center" style={{ backgroundColor: `${a.color}22` }}>
                        <Text className="text-[15px] font-bold" style={{ color: a.color }}>{a.icon}</Text>
                      </View>
                      <View>
                        <Text className="text-[14px] font-semibold text-fg">{t(`search.filters.${a.key}`)}</Text>
                        <Text className="text-[11px] text-muted">{a.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[13px] font-semibold text-muted">
                {t('search.recent')}
              </Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity onPress={() => setActiveFilter('all')}>
                  <Text className="text-[13px] text-accent font-medium">{t('search.show_all')}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View className="gap-1">
              {visibleRecent.map((doc, i) => {
                const isRecent = 'authority' in doc;
                const displayName = isRecent ? (doc as RecentDoc).name : (doc as { filename: string }).filename;
                const meta = isRecent ? (doc as RecentDoc).meta : `${(doc as any).pages || '1'} pages`;
                const iconColor = isRecent ? (doc as RecentDoc).color : '#92d9bb';
                const status = 'status' in doc ? (doc as any).status : 'ready';
                return (
                  <StaggerFadeIn key={doc.id} index={i}>
                    <TouchableOpacity
                      className="flex-row items-center gap-3 p-3 min-h-touch rounded-lg active:opacity-60"
                      activeOpacity={0.7}
                      onPress={() => router.push(`/document/${doc.id}`)}
                    >
                      <View className="w-10 h-10 rounded-lg bg-surface-2 items-center justify-center">
                        {isRecent ? (
                          <ClockIcon size={18} color={iconColor} />
                        ) : (
                          <DocumentIcon size={18} color={iconColor} />
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="text-[14px] font-medium text-fg" numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text className="text-[12px] text-muted mt-0.5">{meta}</Text>
                      </View>
                      {!isRecent && <StatusBadge status={status} />}
                    </TouchableOpacity>
                    {i < visibleRecent.length - 1 && (
                      <View className="h-[1px] bg-border/50 ml-[52px]" />
                    )}
                  </StaggerFadeIn>
                );
              })}
            </View>
          </View>
        ) : (
          <View className="items-center pt-20 px-8">
            <View className="w-14 h-14 rounded-full bg-surface border border-border items-center justify-center mb-5">
              <SearchIcon size={22} color="#86868b" />
            </View>
            <Text className="font-display text-[18px] text-fg mb-2">
              {t('search.empty_title')}
            </Text>
            <Text className="font-body text-[14px] text-muted text-center leading-[1.6]">
              {t('search.empty_desc')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-8 w-full max-w-[320px]">
              {AUTHORITY_META.map((a) => (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => setActiveFilter(a.key)}
                  className="flex-row items-center gap-2 px-4 py-2.5 rounded-full bg-surface border border-border min-h-touch"
                  activeOpacity={0.7}
                >
                  <View className="w-6 h-6 rounded items-center justify-center" style={{ backgroundColor: `${a.color}22` }}>
                    <Text className="text-[11px] font-bold" style={{ color: a.color }}>{a.icon}</Text>
                  </View>
                  <Text className="text-[13px] font-medium text-fg">{t(`search.filters.${a.key}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
