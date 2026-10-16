import * as React from 'react';
import { documentName } from '../../src/lib/decodeView';
import { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SearchIcon, XIcon } from '../../src/components/icons';
import { useDocumentStore } from '../../src/store/documentStore';
import { useThemeColors } from '../../src/store/themeStore';

type Authority = 'all' | 'kela' | 'vero' | 'migri' | 'suomi';

const AUTHORITIES: { key: Authority; labelKey: string }[] = [
  { key: 'all', labelKey: 'search.filters.all' },
  { key: 'kela', labelKey: 'search.filters.kela' },
  { key: 'vero', labelKey: 'search.filters.vero' },
  { key: 'migri', labelKey: 'search.filters.migri' },
];

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const { documents } = useDocumentStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Authority>('all');

  const toRow = (d: (typeof documents)[number]) => ({
    id: d.id,
    name: documentName(d),
    meta: (d.authority ?? t(`status.${d.status}`)).toUpperCase(),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return documents.filter((d) => {
      // Match what the user sees — decoded title and sender — not just the upload filename.
      const haystack = [d.title, d.authority, d.filename].filter(Boolean).join(' ').toLowerCase();
      const matchesFilter = activeFilter === 'all' || (d.authority ?? '').toLowerCase().includes(activeFilter);
      return haystack.includes(q) && matchesFilter;
    }).map(toRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, documents, activeFilter]);

  const recent = useMemo(() => {
    return documents.slice(0, 6).map(toRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-6 pt-3">
        <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
          Opas · {t('tabs.search')}
        </Text>

        {/* Serif search field over a hairline */}
        <View className="flex-row items-center gap-2.5 mt-4 pb-3">
          <SearchIcon size={18} color={c.muted} />
          <TextInput
            ref={inputRef}
            className="flex-1 font-body text-[16px] text-fg"
            placeholder={t('search.placeholder')}
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('common.cancel')}>
              <XIcon size={16} color={c.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter pills */}
        <View className="flex-row gap-2 mt-4">
          {AUTHORITIES.map((auth) => {
            const active = activeFilter === auth.key;
            return (
              <Pressable
                key={auth.key}
                onPress={() => setActiveFilter(auth.key)}
                className={`rounded-pill px-3 py-1.5 border ${active ? 'bg-accent border-accent' : 'border-rule'}`}
              >
                <Text className={`font-semibold text-label tracking-[0.11em] uppercase ${active ? 'text-on-accent' : 'text-fg-soft'}`}>
                  {t(auth.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        {query ? (
          filtered.length > 0 ? (
            <View className="px-6 mt-6">
              <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">
                {t('search.result_count', { count: filtered.length })}
              </Text>
              {filtered.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => router.push(`/document/${doc.id}`)}
                  className="flex-row items-baseline justify-between py-3.5 border-b border-hairline"
                >
                  <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{doc.name}</Text>
                  <Text className="font-mono text-meta text-muted">{doc.meta}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="items-center pt-20 px-8">
              <Text className="font-display text-title text-fg mb-2">{t('search.no_results')}</Text>
              <Text className="font-serif text-prose text-fg-soft text-center">{t('search.no_results_desc')}</Text>
            </View>
          )
        ) : (
          <>
            {/* Recent */}
            {recent.length > 0 && (
              <View className="px-6 mt-8">
                <View className="flex-row items-baseline justify-between pb-2.5 border-b border-rule">
                  <Text className="font-semibold text-label uppercase text-fg">{t('search.recent')}</Text>
                  {activeFilter !== 'all' && (
                    <Pressable onPress={() => setActiveFilter('all')}>
                      <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted">{t('search.show_all')}</Text>
                    </Pressable>
                  )}
                </View>
                {recent.map((doc) => (
                  <Pressable
                    key={doc.id}
                    onPress={() => router.push(`/document/${doc.id}`)}
                    className="flex-row items-baseline justify-between py-3.5 border-b border-hairline"
                  >
                    <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{doc.name}</Text>
                    <Text className="font-mono text-meta text-muted">{doc.meta}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {recent.length === 0 && (
              <View className="items-center pt-20 px-8">
                <Text className="font-display text-title text-fg mb-2">{t('search.empty_title')}</Text>
                <Text className="font-serif text-prose text-fg-soft text-center">{t('search.empty_desc')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
