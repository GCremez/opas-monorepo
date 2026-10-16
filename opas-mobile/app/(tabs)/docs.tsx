import * as React from 'react';
import { documentName } from '../../src/lib/decodeView';
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

const BUILT_IN_FOLDERS = [
  'tax', 'residence', 'kela', 'healthcare', 'employment', 'education', 'housing', 'finance',
] as const;

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
    if (!folderToDelete.id.startsWith('custom-')) await apiDeleteFolder(folderToDelete.id);
    setFolderToDelete(null);
  };

  const customFolders = useMemo(
    () => folders.map((f) => ({ key: f.id, folderId: f.id, name: f.name })),
    [folders],
  );

  const totalDocs = documents.length;
  const totalFolders = BUILT_IN_FOLDERS.length + customFolders.length;

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
            {`${totalDocs} DOCUMENTS · ${totalFolders} FOLDERS`}
          </Text>
        </View>

        {error && documents.length === 0 && (
          <ErrorState
            title={t('common.connection_lost')}
            description={error}
            onRetry={() => { clearError(); fetchDocuments(); }}
          />
        )}

        {/* By authority */}
        <View className="px-6">
          <Text className="font-semibold text-label uppercase text-fg pb-2.5 border-b border-rule">By authority</Text>

          {BUILT_IN_FOLDERS.map((key) => {
            const count = documents.length && key === 'kela' ? documents.length : 0;
            return (
              <View
                key={key}
                className="flex-row items-baseline justify-between py-4 border-b border-hairline"
              >
                <Text className="font-display text-heading text-fg">{t(`folders.folder_${key}`)}</Text>
                <Text className="font-mono text-meta text-muted">{count} DOCS ›</Text>
              </View>
            );
          })}

          {customFolders.map((f) => (
            <Pressable
              key={f.key}
              onLongPress={() => setFolderToDelete({ id: f.folderId, key: f.key })}
              className="flex-row items-baseline justify-between py-4 border-b border-hairline"
            >
              <Text className="font-display text-heading text-fg">{f.name}</Text>
              <Text className="font-mono text-meta text-muted">›</Text>
            </Pressable>
          ))}
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
                className="flex-row items-baseline justify-between py-3.5 border-b border-hairline"
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
                className="flex-1 font-body text-body text-fg bg-surface border border-hairline rounded-md px-3 h-[44px]"
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
