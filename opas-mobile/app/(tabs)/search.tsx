import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';
import { documentName } from '../../src/lib/decodeView';
import { authorityOf } from '../../src/lib/authorities';
import { folderName } from '../../src/lib/folders';
import { searchDocuments } from '../../src/lib/search';

const FILTERS = ['all', 'kela', 'vero', 'migri', 'dvv'] as const;
type Filter = (typeof FILTERS)[number];

function ago(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return 'NOW';
  return h < 24 ? `${h}H` : `${Math.floor(h / 24)}D`;
}

function SectionHeader({ title }: { title: string }) {
  return <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">{title}</Text>;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const { documents, fetchDocuments } = useDocumentStore();
  const { folders, fetchFolders } = useFolderStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (useDocumentStore.getState().documents.length === 0) fetchDocuments();
    if (useFolderStore.getState().folders.length === 0) fetchFolders();
  }, [fetchDocuments, fetchFolders]);

  const inScope = useMemo(
    () => (filter === 'all' ? documents : documents.filter((d) => authorityOf(d.authority)?.key === filter)),
    [documents, filter],
  );

  // The built-in categories are the topics (design 2b); only ones holding documents are listed.
  const topics = useMemo(
    () =>
      folders
        .filter((f) => f.categoryKey)
        .map((f) => ({ folder: f, count: inScope.filter((d) => d.folderId === f.id).length }))
        .filter((x) => x.count > 0),
    [folders, inScope],
  );

  const q = query.trim().toLowerCase();
  const hits = useMemo(() => searchDocuments(inScope, q), [inScope, q]);
  const topicHits = q ? topics.filter((x) => folderName(x.folder, t).toLowerCase().includes(q)) : [];
  const resultCount = hits.length + topicHits.length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-6 pt-3">
        <Text className="font-semibold text-label uppercase text-muted">Opas · {t('tabs.search')}</Text>

        {/* Design 2b: the field is a ruled line, not a box. */}
        <View className="flex-row items-center gap-2.5 mt-4 pb-[11px] border-b border-rule">
          <Text className={`font-serif text-[18px] ${q ? 'text-accent' : 'text-muted'}`}>⌕</Text>
          <TextInput
            ref={inputRef}
            className={`flex-1 text-[17px] text-fg ${query ? 'font-mono' : 'font-serif-italic'}`}
            placeholder={t('search.placeholder')}
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('search.clear_search')}>
              <Text className="font-serif text-[16px] text-muted">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {q ? (
          <Text className="font-mono text-meta uppercase text-muted mt-3.5">
            {t('search.results_across', { results: t('search.result_count', { count: resultCount }), docs: t('search.document_count', { count: inScope.length }) })}
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2 mt-4">
            {FILTERS.map((key) => {
              const active = filter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setFilter(key)}
                  className={`rounded-pill px-[11px] py-1.5 border ${active ? 'bg-accent border-accent' : 'border-rule'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text className={`font-semibold text-label uppercase ${active ? 'text-on-accent' : 'text-fg-soft'}`}>
                    {t(`search.filters.${key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        {q ? (
          resultCount > 0 ? (
            // Design 4c
            <View className="px-6 pt-2">
              {hits.map(({ document: d, snippet }) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/document/${d.id}`)}
                  className="py-3.5 border-b border-line"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="font-display text-[16px] text-fg flex-1" numberOfLines={1}>{documentName(d)}</Text>
                    {d.authority && <Text className="font-mono text-meta uppercase text-muted">{authorityOf(d.authority)?.name}</Text>}
                  </View>
                  {snippet && (
                    <Text className="font-body text-[13px] leading-[19px] text-fg-soft mt-1" numberOfLines={2}>
                      {snippet.before}
                      <Text className="font-semibold text-warning">{snippet.match}</Text>
                      {snippet.after}
                    </Text>
                  )}
                </Pressable>
              ))}
              {topicHits.map(({ folder, count }) => (
                <Pressable
                  key={folder.id}
                  onPress={() => router.push(`/folder/${folder.id}`)}
                  className="py-3.5 border-b border-line"
                  accessibilityRole="button"
                >
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="font-display text-[16px] text-fg flex-1">{folderName(folder, t)}</Text>
                    <Text className="font-mono text-meta uppercase text-muted">{t('search.topic')}</Text>
                  </View>
                  <Text className="font-body text-[13px] text-fg-soft mt-1">{t('search.in_topic', { count })}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View className="px-6 pt-10">
              <Text className="font-display text-title text-fg mb-2">{t('search.no_results')}</Text>
              <Text className="font-serif text-prose text-fg-soft">{t('search.no_results_desc')}</Text>
            </View>
          )
        ) : (
          <>
            {topics.length > 0 && (
              <View className="px-6 pt-[26px]">
                <SectionHeader title={t('search.browse_by_topic')} />
                {topics.map(({ folder, count }) => (
                  <Pressable
                    key={folder.id}
                    onPress={() => router.push(`/folder/${folder.id}`)}
                    className="flex-row items-baseline justify-between py-3.5 border-b border-line min-h-touch"
                    accessibilityRole="button"
                  >
                    <Text className="font-display text-[16px] text-fg flex-1" numberOfLines={1}>{folderName(folder, t)}</Text>
                    <Text className="font-mono text-meta uppercase text-muted">{t('documents.docs_count', { count })} ›</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {inScope.length > 0 && (
              <View className="px-6 pt-6">
                <SectionHeader title={t('search.recent')} />
                {inScope.slice(0, 6).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push(`/document/${d.id}`)}
                    className="flex-row items-baseline justify-between gap-3 py-[13px] border-b border-line min-h-touch"
                    accessibilityRole="button"
                  >
                    <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{documentName(d)}</Text>
                    <Text className="font-mono text-meta text-muted">{ago(d.updatedAt)}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {inScope.length === 0 && (
              <View className="px-6 pt-10">
                <Text className="font-display text-title text-fg mb-2">{t('search.empty_title')}</Text>
                <Text className="font-serif text-prose text-fg-soft">{t('search.empty_desc')}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
