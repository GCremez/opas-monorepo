import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Linking, Share, Alert, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { Spinner } from '../../src/components/ui/Loading';
import { DecodeScramble, CountdownRing, StreamingText } from '../../src/components/motion';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { getDocument } from '../../src/api/documents';
import { decodeDocument, getDecodeResult, pollDecodeResult } from '../../src/api/decode';
import { useDocumentStore } from '../../src/store/documentStore';
import { completedAt, tasksOf } from '../../src/lib/tasks';
import { useFolderStore } from '../../src/store/folderStore';
import { folderName } from '../../src/lib/folders';
import { ChevronLeftIcon, DotsIcon } from '../../src/components/icons';
import { useThemeColors } from '../../src/store/themeStore';
import type { Document, DecodeResult } from '../../src/types';
import { usePremium } from '../../src/hooks/usePremium';
import { addToCalendar } from '../../src/utils/calendar';
import { daysUntil, formatDate, nextDeadline, parseIsoDate, toDecodeView } from '../../src/lib/decodeView';

type TabView = 'summary' | 'original' | 'dates' | 'actions';
type DecodeState = 'idle' | 'running' | 'failed';

export default function DocumentDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { deleteDocument, archiveDocument, assignFolder, setTaskDone } = useDocumentStore();
  const { folders, fetchFolders } = useFolderStore();
  const [categorySheet, setCategorySheet] = useState(false);
  const { isPremium } = usePremium();
  const [doc, setDoc] = useState<Document | null>(null);
  const [decode, setDecode] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [decodeState, setDecodeState] = useState<DecodeState>('idle');
  const [activeTab, setActiveTab] = useState<TabView>('summary');
  // The Plain Words (motion 13): a summary that was just written types itself in;
  // one opened later is simply there.
  const [justDecoded, setJustDecoded] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const view = toDecodeView(decode);
  const upcoming = nextDeadline(view);
  const tasks = view ? tasksOf(view.deadlines, view.actions) : [];
  const doneCount = tasks.filter((task) => completedAt(doc, task.key)).length;

  // Optimistic: the box ticks at once and unticks again if the server refuses.
  const toggleTask = async (key: string, done: boolean) => {
    if (!doc || !id) return;
    const before = doc;
    const others = (doc.completedTasks ?? []).filter((task) => task.key !== key);
    setDoc({ ...doc, completedTasks: done ? [...others, { key, completedAt: new Date().toISOString() }] : others });
    try {
      const updated = await setTaskDone(id, key, done);
      setDoc((d) => (d ? { ...d, completedTasks: updated.completedTasks } : d));
    } catch {
      setDoc(before);
    }
  };
  const locale = i18n.language;

  // Runs a decode step and maps its outcome onto the screen state. Every path ends the
  // spinner: a failure must never leave the screen stuck on "decoding".
  const runDecode = useCallback(async (step: () => Promise<DecodeResult>) => {
    setDecodeState('running');
    try {
      setDecode(await step());
      setJustDecoded(true);
      setDecodeState('idle');
    } catch {
      // DecodeFailedError (backend gave up), a timeout, or a network error: all retryable.
      setDecodeState('failed');
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await getDocument(id);
        if (cancelled) return;
        setDoc(loaded);
        // Show what already exists instead of re-running the decode.
        if (loaded.status === 'ready') {
          const existing = await getDecodeResult(id).catch(() => null);
          if (!cancelled) setDecode(existing);
        } else if (loaded.status === 'failed') {
          setDecodeState('failed');
        } else if (loaded.status === 'processing') {
          runDecode(() => pollDecodeResult(id));
        }
      } catch {
        // Leaves doc null → error state below.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, runDecode]);

  useEffect(() => {
    if (folders.length === 0) fetchFolders();
  }, [folders.length, fetchFolders]);

  const fileUnder = async (folderId: string | null) => {
    setCategorySheet(false);
    if (!doc || !id || doc.folderId === folderId) return;
    const previous = doc.folderId;
    setDoc({ ...doc, folderId }); // optimistic; reverted below if the request fails
    try {
      await assignFolder(id, folderId);
      fetchFolders(); // refresh the per-category counts on the Files screen
    } catch {
      setDoc((d) => (d ? { ...d, folderId: previous } : d));
      Alert.alert(t('common.error'));
    }
  };

  const handleDecode = () => {
    if (id) runDecode(() => decodeDocument(id));
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteDocument(id);
    setSheetVisible(false);
    router.back();
  };

  const handleOpenOriginal = () => {
    if (doc?.downloadUrl) Linking.openURL(doc.downloadUrl);
  };

  // Share the explanation, not a link: a presigned URL gives anyone holding it full
  // access to the original letter.
  const handleShare = () => {
    if (!doc) return;
    const title = view?.title ?? doc.filename;
    const message = [title, view?.summary, upcoming && `${formatDate(upcoming.date, locale)} — ${upcoming.description}`]
      .filter(Boolean)
      .join('\n\n');
    Share.share({ message, title });
  };

  const handleExport = () => {
    if (doc?.downloadUrl) Share.share({ url: doc.downloadUrl, title: doc.filename });
  };

  const handleDraftLetter = () => {
    if (!isPremium) {
      router.push('/subscription');
      return;
    }
    router.push(`/draft/${id}?filename=${encodeURIComponent(doc?.filename ?? '')}`);
  };

  // Only offered when the document itself states an upcoming date — never an invented one.
  const handleAddToCalendar = async () => {
    const date = upcoming && parseIsoDate(upcoming.date);
    if (!doc || !upcoming || !date) return;
    date.setHours(9, 0, 0, 0);
    const added = await addToCalendar({
      title: t('calendar.event_title', { name: upcoming.description || view?.title || doc.filename }),
      notes: t('calendar.event_notes', { filename: view?.title ?? doc.filename }),
      startDate: date,
      endDate: new Date(date.getTime() + 3600000),
    });
    setSheetVisible(false);
    if (added) Alert.alert(t('calendar.added'));
  };

  const handleArchive = async () => {
    if (!id) return;
    await archiveDocument(id);
    setSheetVisible(false);
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert(t('document.delete_confirm_title'), t('document.delete_confirm_message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('document.delete_document'), style: 'destructive', onPress: handleDelete },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" label={t('common.loading')} />
        </View>
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="font-serif text-prose text-fg-soft text-center">{t('common.error')}</Text>
          <Button variant="ghost" onPress={() => router.back()} className="mt-4">{t('common.back')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { key: TabView; label: string }[] = [
    { key: 'summary', label: t('document.summary') },
    { key: 'original', label: t('document.original') },
    { key: 'dates', label: t('document.dates') },
    { key: 'actions', label: t('document.actions') },
  ];

  const decoding = decodeState === 'running';
  const currentFolder = folders.find((f) => f.id === doc.folderId) ?? null;
  const canDecode = !decode && !decoding && (doc.status === 'uploaded' || doc.status === 'failed');
  const isImage = (doc.contentType ?? '').startsWith('image/');
  const docLanguage = view?.language?.toLowerCase();
  const translated = !!docLanguage && docLanguage !== locale.split('-')[0];
  const mastheadMeta = [
    translated ? `${docLanguage!.toUpperCase()} → ${locale.split('-')[0].toUpperCase()}` : null,
    view?.issuedDate
      ? t('document.issued', { date: formatDate(view.issuedDate, locale) })
      : `${t('document.uploaded_on')} ${formatDate(doc.createdAt.slice(0, 10), locale)}`,
  ].filter(Boolean).join(' · ');
  const footerAction = 'min-h-[44px] justify-center px-1';
  const footerLabel = 'font-semibold text-label uppercase';

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1">
        {/* Nav row */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </TouchableOpacity>
          <Text className="font-semibold text-label uppercase text-muted" numberOfLines={1}>
            {view?.authority ?? ''}
          </Text>
          <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('document.more')}>
            <DotsIcon size={20} color={c['fg-soft']} />
          </TouchableOpacity>
        </View>

        {/* Masthead — from this document's decode, falling back to its filename */}
        <View className="px-6 pt-3 pb-4">
          {view?.documentType && (
            <Text className="font-semibold text-label uppercase text-muted">{view.documentType}</Text>
          )}
          <Text className="font-display text-[27px] leading-[31px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">
            {view?.title ?? doc.filename}
          </Text>
          <Text className="font-mono text-meta text-muted mt-2.5">{mastheadMeta}</Text>
          {/* Category — pre-filled by the AI, always changeable by the user */}
          <Pressable
            onPress={() => setCategorySheet(true)}
            className="flex-row items-center gap-2 self-start mt-3 min-h-touch"
            accessibilityRole="button"
            accessibilityLabel={`${t('document.category')}: ${currentFolder ? folderName(currentFolder, t) : t('document.no_category')}`}
          >
            <Text className="font-semibold text-label uppercase text-muted">{t('document.category')}</Text>
            <Text className={`font-body text-body-sm ${currentFolder ? 'text-accent' : 'text-fg-soft'}`}>
              {currentFolder ? folderName(currentFolder, t) : t('document.choose_category')} ›
            </Text>
          </Pressable>
        </View>

        {/* Tab underline row — scrolls sideways when translated labels don't fit. */}
        <View className="mx-6 border-b border-line">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20 }} accessibilityRole="tablist">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className="pb-3 pt-2"
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text className={`font-semibold text-label uppercase ${active ? 'text-fg' : 'text-muted'}`}>{tab.label}</Text>
                  {active && <View className="absolute left-0 right-0 bottom-0 h-0.5 bg-accent" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {canDecode && decodeState !== 'failed' && (
            <View className="flex-row items-center gap-3 mx-6 mt-5 bg-surface rounded-md px-4 py-3">
              <Text className="flex-1 font-serif text-prose text-fg-soft">{t('document.not_decoded')}</Text>
              <Button variant="primary" size="sm" onPress={handleDecode}>{t('document.analyze')}</Button>
            </View>
          )}

          {decodeState === 'failed' && !decoding && (
            <View className="mx-6 mt-5 bg-surface rounded-md px-4 py-4" accessibilityRole="alert">
              <Text className="font-serif text-prose text-fg">{t('document.decode_failed')}</Text>
              <Text className="font-body text-body-sm text-fg-soft mt-1.5">{t('document.decode_failed_hint')}</Text>
              <Button variant="primary" size="sm" className="mt-3 self-start" onPress={handleDecode}>{t('common.retry')}</Button>
            </View>
          )}

          {decoding && (
            <View className="pt-12 items-center"><DecodeScramble label={t('scan.decoding')} /></View>
          )}

          {/* SUMMARY */}
          {!decoding && activeTab === 'summary' && decode && (
            <View className="px-6 pt-5">
              {view?.summary ? (
                justDecoded ? (
                  <StreamingText text={view.summary} className="font-serif text-prose text-fg" />
                ) : (
                  <Text className="font-serif text-prose text-fg">{view.summary}</Text>
                )
              ) : decode.rawResponse ? (
                // Older results (or a reply that wasn't valid JSON) only have the raw text.
                <Text className="font-serif text-prose text-fg-soft">{decode.rawResponse}</Text>
              ) : (
                <Text className="font-body text-body-sm text-muted">{t('document.no_summary')}</Text>
              )}
              {!!view?.keyFields.length && (
                <View className="mt-7">
                  <Text className="font-semibold text-label uppercase text-muted mb-2">{t('document.key_details')}</Text>
                  {view.keyFields.map(([label, value]) => (
                    <View key={label} className="flex-row justify-between gap-4 py-3 border-b border-line">
                      <Text className="font-body text-body-sm text-fg-soft flex-1">{label}</Text>
                      <Text className="font-mono text-data text-fg text-right flex-1">{value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ORIGINAL — the user's own file */}
          {!decoding && activeTab === 'original' && (
            <View className="px-6 pt-5">
              {isImage && doc.downloadUrl ? (
                <Image
                  source={{ uri: doc.downloadUrl }}
                  className="w-full rounded-md bg-surface mb-5"
                  style={{ aspectRatio: 3 / 4 }}
                  resizeMode="contain"
                  accessibilityLabel={doc.filename}
                />
              ) : (
                <Text className="font-body text-body-sm text-muted mb-5">{t('document.preview_unavailable')}</Text>
              )}
              {doc.downloadUrl && (
                <Button variant="outline" block onPress={handleOpenOriginal}>{`${t('common.open_original')} ↗`}</Button>
              )}
            </View>
          )}

          {/* DATES — only dates stated in the document */}
          {!decoding && activeTab === 'dates' && (
            <View className="px-6 pt-5">
              {upcoming && (
                <View className="items-center mb-6">
                  <CountdownRing days={Math.max(daysUntil(upcoming.date) ?? 0, 0)} label={t('document.days_to_deadline')} />
                </View>
              )}
              {view?.deadlines.length ? (
                view.deadlines.map((d) => {
                  const days = daysUntil(d.date) ?? 0;
                  const status = days < 0 ? t('document.date_passed') : days === 0 ? t('document.due_today') : t('document.days_left', { count: days });
                  return (
                    <View key={`${d.date}-${d.description}`} className="py-3 border-b border-line">
                      <View className="flex-row items-baseline justify-between">
                        <Text className="font-mono text-data text-fg">{formatDate(d.date, locale)}</Text>
                        <Text className={`font-body text-body-sm ${days < 0 ? 'text-muted' : 'text-warning'}`}>{status}</Text>
                      </View>
                      {!!d.description && <Text className="font-body text-body text-fg-soft mt-1">{d.description}</Text>}
                    </View>
                  );
                })
              ) : (
                <Text className="font-body text-body-sm text-muted">{decode ? t('document.no_dates') : t('document.not_decoded')}</Text>
              )}
            </View>
          )}

          {/* ACTIONS — a checklist of the deadlines and actions (design 4a) */}
          {!decoding && activeTab === 'actions' && (
            <View className="px-6 pt-5">
              <View className="flex-row items-baseline justify-between pb-1.5">
                <Text className="font-semibold text-label uppercase text-fg">{t('document.required_actions')}</Text>
                {tasks.length > 0 && (
                  <Text className="font-mono text-meta uppercase text-warning">
                    {t('document.done_count', { done: doneCount, total: tasks.length })}
                  </Text>
                )}
              </View>
              {tasks.length ? (
                tasks.map((task) => {
                  const doneAt = completedAt(doc, task.key);
                  const days = task.date ? daysUntil(task.date) : null;
                  const meta = doneAt
                    ? t('document.done_on', { date: formatDate(doneAt.slice(0, 10), locale) })
                    : task.date && days !== null
                      ? days < 0
                        ? t('document.date_passed')
                        : days <= 14
                          ? t('document.due_in', { count: days })
                          : t('document.by_date', { date: formatDate(task.date, locale) })
                      : null;
                  return (
                    <Pressable
                      key={task.key}
                      onPress={() => toggleTask(task.key, !doneAt)}
                      className="flex-row gap-[13px] py-[15px] border-b border-line"
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: !!doneAt }}
                      accessibilityLabel={task.title}
                    >
                      <View
                        className={`w-5 h-5 rounded-[5px] mt-0.5 items-center justify-center ${doneAt ? 'bg-accent border-accent' : 'border-rule'}`}
                        style={{ borderWidth: 1.5 }}
                      >
                        {doneAt && <Text className="font-semibold text-[11px] text-on-accent">✓</Text>}
                      </View>
                      <View className="flex-1">
                        <Text className={`font-display text-[16px] leading-[20px] ${doneAt ? 'text-muted line-through' : 'text-fg'}`}>
                          {task.title}
                        </Text>
                        {meta && (
                          <Text className={`font-mono text-meta uppercase mt-1.5 ${doneAt ? 'text-muted' : days !== null && days >= 0 && days <= 14 ? 'text-warning' : 'text-muted'}`}>
                            {meta}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="font-body text-body-sm text-muted pt-2">{decode ? t('document.no_actions') : t('document.not_decoded')}</Text>
              )}
              <Button variant="primary" block size="lg" className="mt-7" onPress={handleDraftLetter}>
                {t('document.draft_letter')}
              </Button>
            </View>
          )}
        </ScrollView>

        {/* Footer actions */}
        {!!decode && (
          <View className="flex-row items-center justify-between px-6" style={{ paddingBottom: insets.bottom + 4, paddingTop: 6 }}>
            <Pressable onPress={handleShare} className={footerAction} accessibilityRole="button">
              <Text className={`${footerLabel} text-fg-soft`}>{t('document.share')}</Text>
            </Pressable>
            <Pressable onPress={isPremium ? handleExport : () => router.push('/subscription')} className={footerAction} accessibilityRole="button">
              <Text className={`${footerLabel} text-fg-soft`}>{t('document.export')}</Text>
            </Pressable>
            <Pressable onPress={isPremium ? handleArchive : () => router.push('/subscription')} className={footerAction} accessibilityRole="button">
              <Text className={`${footerLabel} text-fg-soft`}>{t('document.archive')}</Text>
            </Pressable>
            <Pressable onPress={confirmDelete} className={footerAction} accessibilityRole="button">
              <Text className={`${footerLabel} text-danger`}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        title={view?.title ?? doc.filename}
        actions={[
          { label: t('document.share'), onPress: () => { setSheetVisible(false); handleShare(); } },
          { label: t('document.draft_letter'), onPress: () => { setSheetVisible(false); handleDraftLetter(); } },
          ...(upcoming ? [{ label: t('document.add_to_calendar'), onPress: handleAddToCalendar }] : []),
          { label: t('document.delete_document'), onPress: confirmDelete, destructive: true },
        ]}
        onClose={() => setSheetVisible(false)}
      />
      <BottomSheet
        visible={categorySheet}
        title={t('document.category_title')}
        actions={[
          ...folders.map((f) => ({
            label: `${f.id === doc.folderId ? '✓  ' : ''}${folderName(f, t)}`,
            onPress: () => fileUnder(f.id),
          })),
          { label: `${doc.folderId ? '' : '✓  '}${t('document.no_category')}`, onPress: () => fileUnder(null) },
        ]}
        onClose={() => setCategorySheet(false)}
      />
    </SafeAreaView>
  );
}
