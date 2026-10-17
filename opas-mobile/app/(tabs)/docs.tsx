import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { GatherScrollView } from '../../src/components/motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../src/components/ui/EmptyState';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';
import { collectDeadlines } from '../../src/lib/decodeView';
import { authorityOf, groupByAuthority, UNREAD } from '../../src/lib/authorities';

/** "2H" / "3D" since the most recent change. */
function shortAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return '<1H';
  return h < 24 ? `${h}H` : `${Math.floor(h / 24)}D`;
}

function GroupRow({ name, meta, tone, onPress, onLongPress, muted }: {
  name: string; meta: string; tone: string; onPress: () => void; onLongPress?: () => void; muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-baseline justify-between gap-3 py-[15px] border-b border-line min-h-touch"
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${meta}`}
    >
      <Text className={`font-display text-[17px] flex-1 ${muted ? 'text-fg-soft' : 'text-fg'}`} numberOfLines={1}>{name}</Text>
      <Text className={`font-mono text-meta uppercase ${tone}`}>{meta} ›</Text>
    </Pressable>
  );
}

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { documents, loading, error, fetchDocuments, clearError } = useDocumentStore();
  const { folders, fetchFolders, createFolder: apiCreateFolder, deleteFolder: apiDeleteFolder } = useFolderStore();
  const inputRef = useRef<TextInput>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, [fetchDocuments, fetchFolders]);

  const onRefresh = useCallback(() => {
    fetchDocuments();
    fetchFolders();
  }, [fetchDocuments, fetchFolders]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await apiCreateFolder(name);
    } catch {
      // handled by store
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    await apiDeleteFolder(folderToDelete);
    setFolderToDelete(null);
  };

  // Design 2c: grouped by the sender. The user's own folders sit in the same list;
  // the built-in topics are browsed from Search instead.
  const authorities = useMemo(() => groupByAuthority(documents), [documents]);
  const ownFolders = folders.filter((f) => !f.categoryKey);
  const unread = documents.filter((d) => !authorityOf(d.authority));
  const groupCount = authorities.length + ownFolders.length;
  const lastUpdate = documents.reduce<string | null>((max, d) => (!max || d.updatedAt > max ? d.updatedAt : max), null);

  const meta = [t('documents.summary_docs', { count: documents.length }), t('documents.summary_folders', { count: groupCount })];
  if (lastUpdate) meta.push(t('documents.updated_ago', { ago: shortAgo(lastUpdate) }));

  const countLabel = (docs: { id: string }[], dueCount: number) =>
    dueCount > 0
      ? `${t('documents.docs_count', { count: docs.length })} · ${t('documents.due_count', { count: dueCount })}`
      : t('documents.docs_count', { count: docs.length });

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <GatherScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshing={loading}
        onRefresh={onRefresh}
      >
        <View className="px-6 pt-3 pb-[22px]">
          <Text className="font-semibold text-label uppercase text-muted">Opas · {t('tabs.files')}</Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">
            {t('documents.files_title')}
          </Text>
          <Text className="font-mono text-meta uppercase text-muted mt-1.5">{meta.join(' · ')}</Text>
        </View>

        {error && documents.length === 0 && (
          <ErrorState
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        <View className="px-6">
          <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">{t('documents.by_authority')}</Text>
          {authorities.map((g) => {
            const due = collectDeadlines(g.documents).filter((d) => d.days >= 0).length;
            return (
              <GroupRow
                key={g.key}
                name={g.name}
                meta={countLabel(g.documents, due)}
                tone={due > 0 ? 'text-danger' : 'text-muted'}
                onPress={() => router.push(`/authority/${encodeURIComponent(g.key)}`)}
              />
            );
          })}
          {ownFolders.map((f) => {
            const docs = documents.filter((d) => d.folderId === f.id);
            const due = collectDeadlines(docs).filter((d) => d.days >= 0).length;
            return (
              <GroupRow
                key={f.id}
                name={f.name}
                meta={countLabel(docs, due)}
                tone={due > 0 ? 'text-danger' : 'text-muted'}
                onPress={() => router.push(`/folder/${f.id}`)}
                onLongPress={() => setFolderToDelete(f.id)}
              />
            );
          })}
          {unread.length > 0 && (
            <GroupRow
              name={t('documents.not_read')}
              meta={t('documents.docs_count', { count: unread.length })}
              tone="text-muted"
              muted
              onPress={() => router.push(`/authority/${UNREAD}`)}
            />
          )}
          {groupCount === 0 && unread.length === 0 && !loading && (
            <Text className="font-serif text-prose text-fg-soft pt-4">{t('documents.files_empty')}</Text>
          )}
        </View>

        <View className="px-6 mt-[18px]">
          {isCreatingFolder ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                ref={inputRef}
                className="flex-1 font-body text-body text-fg bg-surface border border-line rounded-md px-3 h-[44px]"
                placeholder={t('documents.folder_name_placeholder')}
                placeholderTextColor={c.muted}
                value={newFolderName}
                onChangeText={setNewFolderName}
                onSubmitEditing={handleCreateFolder}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleCreateFolder}
                className="px-5 min-h-touch rounded-pill bg-accent items-center justify-center"
                accessibilityLabel={t('documents.add_folder')}
              >
                <Text className="font-semibold text-[12px] text-on-accent">{t('documents.add_folder')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
              className="min-h-touch justify-center self-start"
              accessibilityLabel={t('documents.new_folder')}
            >
              <Text className="font-semibold text-label uppercase text-accent">+ {t('documents.new_folder')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </GatherScrollView>

      <ConfirmSheet
        visible={folderToDelete !== null}
        title={t('documents.delete_folder_title')}
        message={t('documents.delete_folder_message')}
        confirmLabel={t('documents.delete_folder_label')}
        destructive
        onConfirm={handleDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />
    </SafeAreaView>
  );
}
