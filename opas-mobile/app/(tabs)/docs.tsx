import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import Svg, { Path, Polyline, Circle, Line, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon } from '../../src/components/icons';
import { ErrorState } from '../../src/components/ui/EmptyState';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useAuthStore } from '../../src/store/authStore';

interface DocTag {
  type: 'new' | 'translated' | 'deadline' | 'urgent' | 'archived';
  label: string;
  date?: string;
}

const DEADLINES = [
  { key: 'residence', priority: 'warning', date: 'Jun 30', days: 7 },
  { key: 'tax', priority: 'danger', date: 'Jun 15', days: 2 },
] as const;

const BUILT_IN_FOLDERS = [
  'tax', 'residence', 'kela', 'healthcare', 'employment', 'education', 'housing', 'finance',
] as const;

function DocIcon({ tags }: { tags: DocTag[] }) {
  const hasUrgent = tags.some((t) => t.type === 'urgent');
  const hasDeadline = tags.some((t) => t.type === 'deadline');
  const hasTranslated = tags.some((t) => t.type === 'translated');
  const hasArchived = tags.some((t) => t.type === 'archived');

  if (hasUrgent) {
    return (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="8" x2="12" y2="12" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="16" x2="12.01" y2="16" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (hasDeadline) {
    return (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="16" y1="2" x2="16" y2="6" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="8" y1="2" x2="8" y2="6" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="3" y1="10" x2="21" y2="10" stroke="#ff9f0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (hasTranslated) {
    return (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <Polyline points="20 6 9 17 4 12" stroke="#30d158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (hasArchived) {
    return (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <Path d="M4 4h16v4H4z" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 8v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="12" y1="12" x2="12" y2="16" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1="10" y1="14" x2="14" y2="14" stroke="#86868b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#92d9bb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="14 2 14 8 20 8" stroke="#92d9bb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="9" y1="13" x2="15" y2="13" stroke="#92d9bb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="9" y1="17" x2="13" y2="17" stroke="#92d9bb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StatusBadge({ tag }: { tag: DocTag }) {
  const baseClass = 'px-2 py-0.5 rounded-full border';

  switch (tag.type) {
    case 'new':
      return (
        <View className={`${baseClass} bg-accent-dim border-accent`}>
          <Text className="text-caption text-accent font-semibold">{tag.label}</Text>
        </View>
      );
    case 'translated':
      return (
        <View className={`${baseClass} bg-success/15 border-success/30 flex-row items-center gap-1`}>
          <Svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <Polyline points="20 6 9 17 4 12" stroke="#30d158" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text className="text-caption text-success font-semibold">{tag.label}</Text>
        </View>
      );
    case 'deadline':
      return (
        <View className={`${baseClass} bg-warning/15 border-warning/30`}>
          <Text className="text-caption text-warning font-semibold">{tag.label}</Text>
        </View>
      );
    case 'urgent':
      return (
        <View className={`${baseClass} bg-danger/15 border-danger/30`}>
          <Text className="text-caption text-danger font-semibold">{tag.label}</Text>
        </View>
      );
    case 'archived':
      return (
        <View className={`${baseClass} bg-surface-3 border-surface-3`}>
          <Text className="text-caption text-muted font-semibold">{tag.label}</Text>
        </View>
      );
  }
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { documents, loading, error, fetchDocuments, deleteDocument, clearError } = useDocumentStore();
  const { folders, fetchFolders, createFolder: apiCreateFolder, deleteFolder: apiDeleteFolder } = useFolderStore();
  const { isDemo } = useAuthStore();
  const inputRef = useRef<TextInput>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
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

  const toggleFolder = (key: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await apiCreateFolder(name);
      setExpandedFolders((prev) => new Set(prev).add(folder.id));
    } catch {
      // error handled by store
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    if (!folderToDelete.id.startsWith('custom-')) {
      await apiDeleteFolder(folderToDelete.id);
    }
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.delete(folderToDelete.key);
      return next;
    });
    setFolderToDelete(null);
  };

  const allFolders = useMemo(() => {
    const builtInItems = BUILT_IN_FOLDERS.map((key) => ({ key, folderId: key, name: t(`folders.folder_${key}`), isBuiltIn: true as const }));
    const customItems = folders.map((f) => ({ key: f.id, folderId: f.id, name: f.name, isBuiltIn: false as const }));
    return [...builtInItems, ...customItems];
  }, [folders, t]);

  const folderDocs = useMemo(() => {
    const grouped: Record<string, { id: string; title: string; subtitle: string; tags: DocTag[] }[]> = {};
    documents.forEach((d) => {
      const key = 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: d.id,
        title: d.filename,
        subtitle: d.status,
        tags: [{ type: d.status === 'ready' ? 'translated' : 'new', label: d.status } as DocTag],
      });
    });
    return grouped;
  }, [documents]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-5 mt-2 mb-4">
          <Text className="font-display text-heading-l text-fg">
            {t('documents.title')}
          </Text>
          {isCreatingFolder ? (
            <View className="flex-row items-center gap-2">
              <TextInput
                ref={inputRef}
                className="text-body text-fg bg-surface border border-border rounded-md px-3 py-1.5 h-[44px] w-[160px]"
                placeholder={t('documents.folder_name_placeholder')}
                placeholderTextColor="#86868b"
                value={newFolderName}
                onChangeText={setNewFolderName}
                onSubmitEditing={handleCreateFolder}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleCreateFolder}
                activeOpacity={0.7}
                className="px-4 py-2 min-h-touch rounded-md bg-accent items-center justify-center"
                accessibilityLabel={t('documents.add_folder')}
              >
                <Text className="text-body-sm font-semibold text-black">{t('documents.add_folder')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setIsCreatingFolder(true); setNewFolderName(''); }}
              className="w-11 h-11 rounded-full bg-surface border border-border items-center justify-center"
              accessibilityLabel={t('documents.new_folder')}
            >
              <Text className="text-[20px] text-muted leading-none">+</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#92d9bb" />
          }
        >
          {error && documents.length === 0 && (
            <ErrorState
              title={t('common.connection_lost')}
              description={error}
              onRetry={() => { clearError(); fetchDocuments(); }}
            />
          )}

          {isDemo && (
            <View className="gap-2 mb-6">
              {DEADLINES.map((deadline) => {
                const isWarning = deadline.priority === 'warning';
                const tintBg = isWarning ? 'bg-warning/10' : 'bg-danger/10';
                const tintBorder = isWarning ? 'border-warning/20' : 'border-danger/20';
                return (
                  <Pressable
                    key={deadline.key}
                    onPress={() => router.push('/document/mock-id')}
                    className={`${tintBg} ${tintBorder} border rounded-md px-4 py-3 min-h-touch`}
                    accessibilityLabel={`${t(`folders.deadline_${deadline.key}`)} — ${deadline.date}, ${t('folders.days_left', { count: deadline.days })}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-body font-semibold text-fg">{t(`folders.deadline_${deadline.key}`)}</Text>
                        <Text className="text-body-sm text-muted mt-0.5">{t(`folders.deadline_${deadline.key}_sub`)}</Text>
                      </View>
                      <View className="items-end ml-3">
                        <Text className={`text-body-sm font-semibold ${isWarning ? 'text-warning' : 'text-danger'}`}>{deadline.date}</Text>
                        <Text className="text-caption text-muted mt-0.5">{t('folders.days_left', { count: deadline.days })}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="pb-[120px]">
            {allFolders.map((folder) => {
              const docs = folderDocs[folder.folderId] ?? folderDocs['other'] ?? [];
              const isExpanded = expandedFolders.has(folder.key);
              const realCount = docs.length;

              return (
                <View key={folder.key} className="mb-5">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleFolder(folder.key)}
                    onLongPress={!folder.isBuiltIn ? () => setFolderToDelete({ id: folder.folderId, key: folder.key }) : undefined}
                    className="flex-row items-center gap-2 mb-2 min-h-touch"
                    accessibilityLabel={`${folder.name} — ${realCount} ${t('documents.pages', { count: realCount })}`}
                  >
                    <View className={`w-1.5 h-1.5 rounded-full ${realCount > 0 ? 'bg-accent' : 'bg-surface-3'}`} />
                    <Text className="text-body font-semibold text-fg flex-1">
                      {folder.name}
                    </Text>
                    {!folder.isBuiltIn && (
                      <TouchableOpacity
                        onPress={() => setFolderToDelete({ id: folder.folderId, key: folder.key })}
                        activeOpacity={0.6}
                        className="min-h-touch justify-center"
                        accessibilityLabel={t('documents.delete_folder_label')}
                      >
                        <Text className="text-body-sm text-danger font-medium">{t('documents.delete_folder_label')}</Text>
                      </TouchableOpacity>
                    )}
                    <Text className="text-body-sm text-muted">{realCount}</Text>
                    <View className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRightIcon size={16} color="#86868b" />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    realCount > 0 ? (
                      <View className="gap-1.5 ml-4">
                        {docs.map((doc) => (
                          <Pressable
                            key={doc.id}
                            onPress={() => router.push(`/document/${doc.id}`)}
                            onLongPress={() => setDeleteTarget(doc.id)}
                            className="flex-row items-center bg-surface border border-border rounded-md p-3 min-h-touch"
                            accessibilityLabel={`${doc.title} — ${doc.subtitle}`}
                          >
                            <View className="w-11 h-11 rounded-md bg-surface-2 items-center justify-center mr-3">
                              <DocIcon tags={doc.tags} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-body-sm font-medium text-fg mb-0.5" numberOfLines={1}>
                                {doc.title}
                              </Text>
                              <Text className="text-caption text-muted mb-1">
                                {doc.subtitle}
                              </Text>
                              <View className="flex-row gap-1.5">
                                {doc.tags.map((tag, i) => (
                                  <StatusBadge key={i} tag={tag} />
                                ))}
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-body-sm text-muted ml-4 py-2">
                        {t('documents.no_documents_in_folder')}
                      </Text>
                    )
                  )}
                </View>
              );
            })}

          </View>
        </ScrollView>
      </View>

      <ConfirmSheet
        visible={deleteTarget !== null}
        title={t('documents.delete_document_title')}
        message={t('documents.delete_document_message')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteDocument(deleteTarget);
          }
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
