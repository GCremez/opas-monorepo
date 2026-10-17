import * as React from 'react';
import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDocumentStore } from '../store/documentStore';
import { useThemeColors } from '../store/themeStore';
import { collectDeadlines, documentName, formatDate } from '../lib/decodeView';
import type { Document } from '../types';

interface Props {
  /** "Authority", "Folder" or "Topic". */
  eyebrow: string;
  title: string;
  documents: Document[];
  emptyText: string;
  /** Shown as "···" in the header, e.g. deleting a folder the user made. */
  onMore?: () => void;
}

/** One opened group of documents: an authority, a folder or a topic (design 4b). */
export function FileGroupScreen({ eyebrow, title, documents, emptyText, onMore }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { loading, fetchDocuments } = useDocumentStore();

  useEffect(() => {
    if (useDocumentStore.getState().documents.length === 0) fetchDocuments();
  }, [fetchDocuments]);

  const upcoming = collectDeadlines(documents).filter((d) => d.days >= 0);
  const next = upcoming[0];
  const withAction = new Set(upcoming.map((d) => d.document.id));

  const status = (d: Document): [string, string] => {
    if (withAction.has(d.id)) return [t('folder.status_action'), 'text-warning'];
    if (d.status === 'ready') return [t('folder.status_read'), 'text-muted'];
    if (d.status === 'failed') return [t('status.failed'), 'text-danger'];
    return [t(`status.${d.status}`), 'text-muted'];
  };

  const counts = [t('folder.documents', { count: documents.length })];
  if (upcoming.length) counts.push(t('folder.actions_due', { count: upcoming.length }));

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Text className="font-serif text-[20px] text-fg-soft">‹ {t('tabs.files')}</Text>
        </TouchableOpacity>
        {onMore && (
          <TouchableOpacity onPress={onMore} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('folder.options')}>
            <Text className="font-serif text-[20px] tracking-[0.05em] text-fg-soft">···</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDocuments} tintColor={c.accent} />}
      >
        <View className="px-6 pt-3 pb-[22px]">
          <Text className="font-semibold text-label uppercase text-muted">{eyebrow}</Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">{title}</Text>
          <Text className="font-mono text-meta uppercase text-muted mt-1.5">{counts.join(' · ')}</Text>
        </View>

        {next && (
          <Pressable
            onPress={() => router.push(`/document/${next.document.id}`)}
            className="mx-6 mb-5 px-[18px] py-[15px] bg-surface rounded-md flex-row items-center justify-between gap-3"
            accessibilityRole="button"
          >
            <View className="flex-1">
              <Text className="font-display text-[15px] text-fg" numberOfLines={2}>
                {next.deadline.description || documentName(next.document)}
              </Text>
              <Text className="font-mono text-meta uppercase text-warning mt-1">
                {t('folder.due', { date: formatDate(next.deadline.date, i18n.language) })}
              </Text>
            </View>
            <Text className="font-semibold text-[10px] tracking-[0.11em] uppercase text-warning border border-warning rounded-pill px-2.5 py-1">
              {next.days === 0
                ? t('document.due_today')
                : next.days < 14
                  ? t('folder.in_days', { count: next.days })
                  : t('folder.in_weeks', { count: Math.round(next.days / 7) })}
            </Text>
          </Pressable>
        )}

        <View className="px-6">
          {documents.length === 0 ? (
            <Text className="font-serif text-prose text-fg-soft pt-2">{emptyText}</Text>
          ) : (
            <>
              <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">{t('folder.documents_heading')}</Text>
              {documents.map((d) => {
                const [label, tone] = status(d);
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push(`/document/${d.id}`)}
                    className="flex-row items-baseline justify-between gap-3 py-3.5 border-b border-line min-h-touch"
                    accessibilityRole="button"
                  >
                    <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{documentName(d)}</Text>
                    <Text className={`font-mono text-meta uppercase ${tone}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
