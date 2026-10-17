import * as React from 'react';
import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';
import { documentName } from '../../src/lib/decodeView';
import { folderName } from '../../src/lib/folders';

/** The documents in one category or folder; the id "unfiled" lists documents in none. */
export default function FolderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, loading, fetchDocuments } = useDocumentStore();
  const { folders, fetchFolders } = useFolderStore();

  useEffect(() => {
    if (documents.length === 0) fetchDocuments();
    if (folders.length === 0) fetchFolders();
  }, [documents.length, folders.length, fetchDocuments, fetchFolders]);

  const unfiled = id === 'unfiled';
  const folder = unfiled ? null : folders.find((f) => f.id === id);
  const title = unfiled ? t('documents.unfiled') : folder ? folderName(folder, t) : '';
  const items = documents.filter((d) => (unfiled ? !d.folderId : d.folderId === id));

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-row items-center px-6 pt-2 pb-1">
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <ChevronLeftIcon size={22} color={c['fg-soft']} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDocuments} tintColor={c.accent} />}
      >
        <View className="px-6 pt-3 pb-5">
          <Text className="font-semibold text-label uppercase text-muted">Opas · {t('tabs.files')}</Text>
          <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg mt-2.5" accessibilityRole="header">
            {title}
          </Text>
          <Text className="font-mono text-meta text-muted mt-2">{t('documents.docs_count', { count: items.length }).toUpperCase()}</Text>
        </View>

        <View className="px-6">
          {items.length === 0 ? (
            <Text className="font-serif text-prose text-fg-soft pt-2">
              {unfiled ? t('folder.empty_unfiled') : t('folder.empty')}
            </Text>
          ) : (
            <View className="border-t border-rule">
              {items.map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => router.push(`/document/${d.id}`)}
                  className="flex-row items-baseline justify-between gap-3 py-3.5 border-b border-hairline min-h-touch"
                  accessibilityRole="button"
                >
                  <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{documentName(d)}</Text>
                  <Text className={`font-mono text-meta ${d.status === 'ready' ? 'text-accent' : 'text-muted'}`}>
                    {(d.authority ?? t(`status.${d.status}`)).toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
