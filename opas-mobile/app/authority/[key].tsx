import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileGroupScreen } from '../../src/components/FileGroupScreen';
import { useDocumentStore } from '../../src/store/documentStore';
import { authorityOf, UNREAD } from '../../src/lib/authorities';

/** Every document from one authority (design 4b). */
export default function AuthorityScreen() {
  const { t } = useTranslation();
  const { key } = useLocalSearchParams<{ key: string }>();
  const documents = useDocumentStore((s) => s.documents);

  const unread = key === UNREAD;
  const items = documents.filter((d) => (unread ? !authorityOf(d.authority) : authorityOf(d.authority)?.key === key));
  const name = unread ? t('documents.not_read') : authorityOf(items[0]?.authority)?.name ?? '';

  return (
    <FileGroupScreen
      eyebrow={unread ? t('folder.not_sorted') : t('folder.authority')}
      title={name}
      documents={items}
      emptyText={t('folder.empty')}
    />
  );
}
