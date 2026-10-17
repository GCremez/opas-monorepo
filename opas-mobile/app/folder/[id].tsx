import * as React from 'react';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileGroupScreen } from '../../src/components/FileGroupScreen';
import { ConfirmSheet } from '../../src/components/ui/ConfirmSheet';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { folderName } from '../../src/lib/folders';

/** A folder the user made, or one of the built-in topics. */
export default function FolderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documents = useDocumentStore((s) => s.documents);
  const { folders, fetchFolders, deleteFolder } = useFolderStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (useFolderStore.getState().folders.length === 0) fetchFolders();
  }, [fetchFolders]);

  const folder = folders.find((f) => f.id === id);
  const isTopic = !!folder?.categoryKey;

  return (
    <>
      <FileGroupScreen
        eyebrow={isTopic ? t('folder.topic') : t('folder.folder')}
        title={folder ? folderName(folder, t) : ''}
        documents={documents.filter((d) => d.folderId === id)}
        emptyText={t('folder.empty')}
        // Topics are built in; only the user's own folders can be deleted.
        onMore={folder && !isTopic ? () => setConfirmDelete(true) : undefined}
      />
      <ConfirmSheet
        visible={confirmDelete}
        title={t('documents.delete_folder_title')}
        message={t('documents.delete_folder_message')}
        confirmLabel={t('documents.delete_folder_label')}
        destructive
        onConfirm={async () => {
          setConfirmDelete(false);
          await deleteFolder(id);
          router.back();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
