import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Linking, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { Pill } from '../../src/components/ui/Badge';
import { Spinner } from '../../src/components/ui/Loading';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { getDocument } from '../../src/api/documents';
import { decodeDocument } from '../../src/api/decode';
import { useDocumentStore } from '../../src/store/documentStore';
import { useAuthStore } from '../../src/store/authStore';
import { ChevronLeftIcon, DotsIcon } from '../../src/components/icons';
import { useThemeColors } from '../../src/store/themeStore';
import type { Document, DecodeResult } from '../../src/types';
import { usePremium } from '../../src/hooks/usePremium';
import { addToCalendar } from '../../src/utils/calendar';

type TabView = 'summary' | 'original' | 'dates' | 'actions';

const mockSummary =
  "KELA has approved your housing benefit. The amount is based on the income and housing costs you reported. It's paid on the 15th of each month.";

const mockKeyPoints = [
  { label: 'Approved amount', value: '€387.20/mo', tone: 'text-accent' },
  { label: 'Valid from', value: '1 APR 2026', tone: 'text-fg' },
  { label: 'Paid on', value: '15TH MONTHLY', tone: 'text-fg' },
  { label: 'Next review', value: '31 DEC 2026', tone: 'text-warning' },
];

const mockSteps = [
  { title: 'Read the decision', desc: '', note: '', done: true },
  { title: 'Report any income change', desc: 'Tell KELA within 14 days if your job or pay changes.', note: 'DUE WITHIN 14 DAYS', done: false },
];

const mockDates = [
  { label: 'Document date', value: '15 MAR 2026', urgent: false },
  { label: 'Valid from', value: '1 APR 2026', urgent: false },
  { label: 'Payment', value: '15TH MONTHLY', urgent: true },
  { label: 'Next review', value: '31 DEC 2026', urgent: false },
  { label: 'Report changes within', value: '14 DAYS', urgent: true },
  { label: 'Reference', value: '12345/2026', urgent: false },
];

const mockActions = [
  { title: 'Report income changes', desc: 'Due within 14 days of any change' },
  { title: 'Submit annual income declaration', desc: 'Due by 31 December 2026' },
];

export default function DocumentDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { deleteDocument, archiveDocument } = useDocumentStore();
  const { isPremium } = usePremium();
  const { isDemo } = useAuthStore();
  const [doc, setDoc] = useState<Document | null>(null);
  const [decode, setDecode] = useState<DecodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [decoding, setDecoding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>('summary');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [checkedActions, setCheckedActions] = useState([true, false]);

  useEffect(() => {
    if (!id) return;
    if (isDemo) {
      setDoc({
        id,
        filename: 'KELA Housing Benefit Decision',
        status: 'ready',
        contentType: 'application/pdf',
        fileSize: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadUrl: null,
        downloadUrl: null,
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    getDocument(id).then(setDoc).finally(() => setLoading(false));
  }, [id, isDemo]);

  const handleDecode = async () => {
    if (!id) return;
    setDecoding(true);
    const result = await decodeDocument(id);
    setDecode(result);
    setDecoding(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteDocument(id);
    setSheetVisible(false);
    router.back();
  };

  const handleOpenOriginal = async () => {
    if (isDemo) return;
    if (doc?.downloadUrl) Linking.openURL(doc.downloadUrl);
  };

  const handleShare = async () => {
    if (!doc) return;
    if (isDemo) { Share.share({ message: 'KELA Housing Benefit Decision - Shared from Opas' }); return; }
    Share.share(doc.downloadUrl ? { message: doc.downloadUrl, title: doc.filename } : { message: doc.filename, title: doc.filename });
  };

  const handleExport = async () => {
    if (!doc) return;
    if (isDemo) { Share.share({ message: 'KELA Housing Benefit Decision - Exported from Opas' }); return; }
    if (doc.downloadUrl) Share.share({ url: doc.downloadUrl, title: doc.filename }); else handleShare();
  };

  const handleDraftLetter = () => {
    if (!isPremium) { router.push('/subscription'); return; }
    router.push(`/draft/${id}?filename=${encodeURIComponent(doc?.filename ?? '')}`);
  };

  const handleAddToCalendar = async () => {
    if (!doc) return;
    if (isDemo) { setSheetVisible(false); return; }
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);
    const added = await addToCalendar({
      title: t('calendar.event_title', { name: doc.filename }),
      notes: t('calendar.event_notes', { filename: doc.filename }),
      startDate: deadlineDate,
      endDate: new Date(deadlineDate.getTime() + 3600000),
    });
    setSheetVisible(false);
    if (added) Alert.alert(t('calendar.added'));
  };

  const handleArchive = async () => {
    if (!id) return;
    if (isDemo) { setSheetVisible(false); return; }
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

  const toggleChecked = (index: number) =>
    setCheckedActions((prev) => prev.map((v, i) => (i === index ? !v : v)));

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
          <Button variant="ghost" onPress={() => router.back()} className="mt-4">{t('common.cancel')}</Button>
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

  const showDecodeGate = doc.status === 'uploaded' && !decode;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="flex-1">
        {/* Nav row */}
        <View className="flex-row items-center justify-between px-6 pt-2 pb-1">
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </TouchableOpacity>
          <Text className="font-semibold text-[9.5px] tracking-[0.16em] uppercase text-muted">KELA</Text>
          <TouchableOpacity onPress={() => setSheetVisible(true)} hitSlop={8} accessibilityLabel="More">
            <DotsIcon size={20} color={c['fg-soft']} />
          </TouchableOpacity>
        </View>

        {/* Masthead */}
        <View className="px-6 pt-3 pb-4">
          <Text className="font-semibold text-[10px] tracking-[0.16em] uppercase text-muted">Päätös asumistuesta</Text>
          <Text className="font-display text-[27px] leading-[30px] tracking-[-0.01em] text-fg mt-2">Housing benefit,{'\n'}approved.</Text>
          <Text className="font-mono text-[10px] tracking-[0.05em] text-muted mt-2.5">TRANSLATED · FI → EN · 2 PAGES · 15 MAR 2026</Text>
        </View>

        {/* Tab underline row */}
        <View className="flex-row gap-5 mx-6 border-b border-hairline">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} className="pb-3">
                <Text className={`font-semibold text-[10.5px] tracking-[0.12em] uppercase ${active ? 'text-fg' : 'text-muted'}`}>
                  {tab.label}
                </Text>
                {active && <View className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent" />}
              </Pressable>
            );
          })}
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {showDecodeGate && !decoding && (
            <View className="flex-row items-center gap-3 mx-6 mt-5 bg-surface rounded-md px-4 py-3">
              <Text className="flex-1 font-serif text-prose text-fg-soft">{t('document.not_decoded')}</Text>
              <Button variant="primary" size="sm" loading={decoding} onPress={handleDecode}>{t('document.summary')}</Button>
            </View>
          )}

          {decoding && (
            <View className="pt-10 items-center"><Spinner size="lg" label={t('scan.decoding')} /></View>
          )}

          {/* SUMMARY — demo */}
          {!decoding && activeTab === 'summary' && isDemo && (
            <View className="px-6 pt-5">
              <View className="flex-row items-end justify-between gap-3">
                <Text className="font-display text-[34px] leading-[34px] text-fg">
                  €387.20<Text className="font-serif text-[15px] text-muted"> / month</Text>
                </Text>
                <Pill variant="accent">Approved</Pill>
              </View>
              <Text className="font-serif text-prose text-fg-soft mt-4">{mockSummary}</Text>

              <Text className="font-semibold text-label uppercase text-fg mt-6 pb-2.5 border-b border-rule">{t('document.key_points')}</Text>
              {mockKeyPoints.map((p) => (
                <View key={p.label} className="flex-row items-baseline justify-between py-3">
                  <Text className="font-body text-body text-fg-soft">{p.label}</Text>
                  <Text className={`font-mono-medium text-data ${p.tone}`}>{p.value}</Text>
                </View>
              ))}

              <Text className="font-semibold text-label uppercase text-fg mt-6 pb-2.5 border-b border-rule">{t('document.what_to_do')}</Text>
              {mockSteps.map((s) => (
                <View key={s.title} className="flex-row gap-3 py-3.5 border-b border-hairline">
                  <View className={`w-[19px] h-[19px] rounded-sm border items-center justify-center mt-0.5 ${s.done ? 'bg-accent border-accent' : 'border-rule'}`}>
                    {s.done && <Text className="text-on-accent text-[11px] font-semibold">✓</Text>}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-display text-[16px] leading-[20px] ${s.done ? 'text-muted line-through' : 'text-fg'}`}>{s.title}</Text>
                    {!!s.desc && <Text className="font-body text-body-sm text-fg-soft mt-1">{s.desc}</Text>}
                    {!!s.note && <Text className="font-mono text-[10px] tracking-[0.05em] text-warning mt-1.5">{s.note}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* SUMMARY — real */}
          {!decoding && activeTab === 'summary' && !isDemo && decode && (
            <View className="px-6 pt-5">
              {decode.structuredData ? (
                Object.entries(decode.structuredData as Record<string, unknown>).map(([key, value]) => (
                  <View key={key} className="mb-5">
                    <Text className="font-semibold text-label uppercase text-muted mb-1.5">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </Text>
                    <Text className="font-serif text-prose text-fg">
                      {typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                    </Text>
                  </View>
                ))
              ) : decode.rawResponse ? (
                <Text className="font-mono text-body-sm text-fg-soft leading-[1.8]">
                  {typeof decode.rawResponse === 'object' ? JSON.stringify(decode.rawResponse, null, 2) : String(decode.rawResponse)}
                </Text>
              ) : (
                <View className="items-center py-8"><Text className="font-body text-body-sm text-muted">No structured data available.</Text></View>
              )}
            </View>
          )}

          {/* ORIGINAL */}
          {!decoding && activeTab === 'original' && (
            <View className="px-6 pt-5">
              <TouchableOpacity onPress={handleOpenOriginal} activeOpacity={0.7} className="items-center rounded-md border border-rule py-3.5 mb-5">
                <Text className="font-semibold text-[12px] tracking-[0.04em] text-fg">Open original document ↗</Text>
              </TouchableOpacity>
              <View className="bg-surface rounded-md p-4">
                <Text className="font-semibold text-[10px] tracking-[0.14em] uppercase text-muted mb-2">KELA — Päätös asumistuesta</Text>
                <Text className="font-mono text-[11px] text-muted mb-4">PAGE 1/2</Text>
                <Text className="font-display text-[16px] text-fg mb-2">Asumistuen määrääminen</Text>
                <Text className="font-serif text-prose text-fg-soft">
                  Kela on päättänyt, että sinulla on oikeus asumistukeen 1.4.2026 alkaen.{'\n\n'}
                  Asumistuen määrä on 387,20 €/kk.{'\n\n'}
                  Tukea maksetaan 15. päivänä joka kuukausi jälkikäteen.
                </Text>
              </View>
            </View>
          )}

          {/* DATES */}
          {!decoding && activeTab === 'dates' && (
            <View className="px-6 pt-5">
              <Text className="font-display text-title text-fg mb-4">{t('document.extracted_dates')}</Text>
              {(isDemo ? mockDates : []).map((item) => (
                <View key={item.label} className="flex-row items-baseline justify-between py-3.5 border-b border-hairline">
                  <Text className="font-body text-body text-fg-soft">{item.label}</Text>
                  <View className="flex-row items-baseline gap-2.5">
                    <Text className={`font-mono-medium text-data ${item.urgent ? 'text-warning' : 'text-fg'}`}>{item.value}</Text>
                    {item.urgent && <Text className="font-semibold text-[8.5px] tracking-[0.11em] uppercase text-warning">Due</Text>}
                  </View>
                </View>
              ))}
              {!isDemo && decode?.structuredData &&
                Object.entries(decode.structuredData as Record<string, unknown>).map(([key, value]) => (
                  <View key={key} className="mb-4">
                    <Text className="font-semibold text-label uppercase text-muted mb-1.5">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</Text>
                    <Text className="font-mono text-data text-fg">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* ACTIONS */}
          {!decoding && activeTab === 'actions' && (
            <View className="px-6 pt-5">
              <View className="flex-row items-baseline justify-between mb-2 pb-2.5">
                <Text className="font-semibold text-label uppercase text-fg">{t('document.required_actions')}</Text>
                {isDemo && <Text className="font-mono text-[11px] text-muted">{checkedActions.filter(Boolean).length}/{mockActions.length}</Text>}
              </View>
              {(isDemo ? mockActions : []).map((action, i) => (
                <TouchableOpacity key={action.title} onPress={() => toggleChecked(i)} activeOpacity={0.6} className="flex-row gap-3 py-3.5 border-b border-hairline">
                  <View className={`w-[20px] h-[20px] rounded-sm border items-center justify-center mt-0.5 ${checkedActions[i] ? 'bg-accent border-accent' : 'border-rule'}`}>
                    {checkedActions[i] && <Text className="text-on-accent text-[11px] font-semibold">✓</Text>}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-display text-[16px] ${checkedActions[i] ? 'text-muted line-through' : 'text-fg'}`}>{action.title}</Text>
                    <Text className="font-body text-body-sm text-fg-soft mt-0.5">{action.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {!isDemo && decode?.structuredData &&
                Object.entries(decode.structuredData as Record<string, unknown>).map(([key, value]) => (
                  <View key={key} className="mb-4">
                    <Text className="font-semibold text-label uppercase text-muted mb-1.5">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</Text>
                    <Text className="font-body text-body text-fg">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</Text>
                  </View>
                ))}
            </View>
          )}
        </ScrollView>

        {/* Footer actions — tracked caps */}
        {(!showDecodeGate || decode) && (
          <View
            className="flex-row items-center justify-between px-8"
            style={{ paddingBottom: insets.bottom + 12, paddingTop: 14 }}
          >
            <Pressable onPress={handleShare}><Text className="font-semibold text-[9.5px] tracking-[0.13em] uppercase text-fg-soft">{t('document.share')}</Text></Pressable>
            <Pressable onPress={isPremium ? handleExport : () => router.push('/subscription')}><Text className="font-semibold text-[9.5px] tracking-[0.13em] uppercase text-fg-soft">{t('document.export')}</Text></Pressable>
            <Pressable onPress={isPremium ? handleArchive : () => router.push('/subscription')}><Text className="font-semibold text-[9.5px] tracking-[0.13em] uppercase text-fg-soft">{t('document.archive')}</Text></Pressable>
            <Pressable onPress={confirmDelete}><Text className="font-semibold text-[9.5px] tracking-[0.13em] uppercase text-danger">{t('document.delete_document')}</Text></Pressable>
          </View>
        )}
      </View>

      <BottomSheet
        visible={sheetVisible}
        title={doc.filename}
        actions={[
          { label: t('document.share'), onPress: () => { setSheetVisible(false); handleShare(); } },
          { label: t('document.draft_letter'), onPress: () => { setSheetVisible(false); handleDraftLetter(); } },
          { label: t('document.add_to_calendar'), onPress: () => { setSheetVisible(false); handleAddToCalendar(); } },
          { label: t('document.mark_done'), onPress: () => setSheetVisible(false) },
          { label: t('document.delete_document'), onPress: confirmDelete, destructive: true },
        ]}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}
