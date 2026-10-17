import * as React from 'react';
import { documentName } from '../../src/lib/decodeView';
import { folderName } from '../../src/lib/folders';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '../../src/components/ui/EmptyState';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { documents, loading, error, fetchDocuments, deleteDocument, clearError } = useDocumentStore();
  const { folders, fetchFolders, createFolder: apiCreateFolder, deleteFolder: apiDeleteFolder } = useFolderStore();
  const inputRef = useRef<TextInput>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; key: string } | null>(null);

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
    await apiDeleteFolder(folderToDelete.id);
    setFolderToDelete(null);
  };

  // The backend returns the built-in categories first, then the user's own folders.
  const unfiledCount = useMemo(() => documents.filter((d) => !d.folderId).length, [documents]);
  const totalDocs = documents.length;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Masthead */}
        <View className="px-6 pt-3 pb-5">
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
            Opas · {t('tabs.files')}
          </Text>
          <Text className="font-display text-[30px] leading-[32px] tracking-[-0.01em] text-fg mt-2.5">
            {t('documents.title')}
          </Text>
          <Text className="font-mono text-meta tracking-[0.05em] text-muted mt-2">
            {t('documents.summary_counts', { docs: totalDocs, folders: folders.length }).toUpperCase()}
          </Text>
        </View>

        {error && documents.length === 0 && (
          <ErrorState
            title={t('common.connection_lost')}
            description={error}
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        {/* Categories: built-in ones, then the user's own folders, then what's unfiled */}
        <View className="px-6">
          <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">{t('documents.categories')}</Text>

          {folders.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => router.push(`/folder/${f.id}`)}
              // Only folders the user made can be deleted; built-in categories always exist.
              onLongPress={f.categoryKey ? undefined : () => setFolderToDelete({ id: f.id, key: f.id })}
              className="flex-row items-baseline justify-between py-4 border-b border-line min-h-touch"
              accessibilityRole="button"
            >
              <Text className="font-display text-heading text-fg flex-1" numberOfLines={1}>{folderName(f, t)}</Text>
              <Text className={`font-mono text-meta ${f.documentCount > 0 ? 'text-fg-soft' : 'text-muted'}`}>
                {t('documents.docs_count', { count: f.documentCount }).toUpperCase()} ›
              </Text>
            </Pressable>
          ))}

          {unfiledCount > 0 && (
            <Pressable
              onPress={() => router.push('/folder/unfiled')}
              className="flex-row items-baseline justify-between py-4 border-b border-line min-h-touch"
              accessibilityRole="button"
            >
              <Text className="font-display text-heading text-fg-soft flex-1">{t('documents.unfiled')}</Text>
              <Text className="font-mono text-meta text-muted">{t('documents.docs_count', { count: unfiledCount }).toUpperCase()} ›</Text>
            </Pressable>
          )}
        </View>

        {/* All documents ledger */}
        {documents.length > 0 && (
          <View className="px-6 mt-8">
            <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">{t('documents.title')}</Text>
            {documents.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/document/${d.id}`)}
                onLongPress={() => setDeleteTarget(d.id)}
                className="flex-row items-baseline justify-between py-3.5 border-b border-line"
              >
                <Text className="font-medium text-body text-fg flex-1" numberOfLines={1}>{documentName(d)}</Text>
                <Text className={`font-mono text-meta ${d.status === 'ready' ? 'text-accent' : 'text-muted'}`}>
                  {(d.authority ?? t(`status.${d.status}`)).toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* New folder */}
        <View className="px-6 mt-6">
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
              className="min-h-touch justify-center"
              accessibilityLabel={t('documents.new_folder')}
            >
              <Text className="font-semibold text-label tracking-[0.14em] uppercase text-accent">+ {t('documents.new_folder')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={deleteTarget !== null}
        title={t('documents.delete_document_title')}
        message={t('documents.delete_document_message')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (deleteTarget) await deleteDocument(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

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
