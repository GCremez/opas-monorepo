import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Svg, { Path, Polyline, Line } from 'react-native-svg';
import { Button } from '../../src/components/ui/Button';
import { Spinner } from '../../src/components/ui/Loading';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { getDocument } from '../../src/api/documents';
import { decodeDocument } from '../../src/api/decode';
import { useDocumentStore } from '../../src/store/documentStore';
import { useAuthStore } from '../../src/store/authStore';
import {
  CheckIcon,
  ChevronLeftIcon,
  DotsIcon,
  DownloadIcon,
  ArchiveIcon,
  CalendarIcon,
  EyeIcon,
  LockIcon,
} from '../../src/components/icons';
import type { Document, DecodeResult } from '../../src/types';
import { usePremium } from '../../src/hooks/usePremium';
import { addToCalendar } from '../../src/utils/calendar';

const act = '#92d9bb';
const fg = '#f5f5f7';
const muted = '#86868b';
const borderColor = 'rgba(56,56,58,0.6)';

type TabView = 'summary' | 'original' | 'dates' | 'actions';

const mockSummary =
  'KELA has approved your housing benefit application. Your monthly benefit has been calculated based on your reported income and housing costs.';

const mockKeyPoints = [
  { label: 'Approved amount', value: '€387.20/month', highlight: true },
  { label: 'Valid from', value: '1 April 2026' },
  { label: 'Payment date', value: '15th each month', urgent: true },
  { label: 'Next review', value: '31 December 2026' },
];

const mockSteps = [
  { title: 'Report income changes', desc: 'Notify KELA within 14 days if your employment status or income changes.' },
  { title: 'Keep your address updated', desc: 'Ensure KELA has your current address to receive all correspondence.' },
];

const mockDates = [
  { label: 'Document date', value: '15 March 2026' },
  { label: 'Valid from', value: '1 April 2026' },
  { label: 'Payment', value: '15th each month', urgent: true },
  { label: 'Next review', value: '31 December 2026' },
  { label: 'Report changes within', value: '14 days', urgent: true },
  { label: 'Reference', value: '12345/2026', mono: true },
];

const mockActions = [
  { title: 'Report income changes', desc: 'Due within 14 days of any change' },
  { title: 'Submit annual income declaration', desc: 'Due by 31 December 2026' },
];

function OpenIcon({ size = 20, color = '#8e8e93' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points="15 3 21 3 21 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="10" y1="14" x2="21" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ToolbarButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-1 items-center gap-0.5 py-2"
      activeOpacity={0.5}
      onPress={onPress}
    >
      {icon}
      <Text
        className="text-[10px] font-medium tracking-wide"
        style={{ color: color || '#86868b' }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DocumentDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    getDocument(id)
      .then(setDoc)
      .finally(() => setLoading(false));
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
    if (doc?.downloadUrl) {
      Linking.openURL(doc.downloadUrl);
    }
  };

  const handleShare = async () => {
    if (!doc) return;
    if (isDemo) {
      Share.share({ message: 'KELA Housing Benefit Decision - Shared from Opas' });
      return;
    }
    if (doc.downloadUrl) {
      Share.share({ message: doc.downloadUrl, title: doc.filename });
    } else {
      Share.share({ message: doc.filename, title: doc.filename });
    }
  };

  const handleExport = async () => {
    if (!doc) return;
    if (isDemo) {
      Share.share({ message: 'KELA Housing Benefit Decision - Exported from Opas' });
      return;
    }
    if (doc.downloadUrl) {
      Share.share({ url: doc.downloadUrl, title: doc.filename });
    } else {
      handleShare();
    }
  };

  const handleDraftLetter = () => {
    if (!isPremium) {
      router.push('/subscription');
      return;
    }
    router.push(`/draft/${id}?filename=${encodeURIComponent(doc?.filename ?? '')}`);
  };

  const handleAddToCalendar = async () => {
    if (!doc) return;
    if (isDemo) {
      setSheetVisible(false);
      return;
    }
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7);
    const added = await addToCalendar({
      title: t('calendar.event_title', { name: doc.filename }),
      notes: t('calendar.event_notes', { filename: doc.filename }),
      startDate: deadlineDate,
      endDate: new Date(deadlineDate.getTime() + 3600000),
    });
    setSheetVisible(false);
    if (added) {
      Alert.alert(t('calendar.added'));
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    if (isDemo) {
      setSheetVisible(false);
      return;
    }
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

  const handlePremiumFeature = () => {
    router.push('/subscription');
  };

  const toggleChecked = (index: number) => {
    setCheckedActions((prev) => prev.map((c, i) => (i === index ? !c : c)));
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
          <Text className="text-body text-muted text-center">{t('common.error')}</Text>
          <Button variant="ghost" onPress={() => router.back()} className="mt-4">
            {t('common.cancel')}
          </Button>
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
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeftIcon size={22} color="#8e8e93" />
          </TouchableOpacity>
          <Text
            className="font-display text-[17px] font-semibold text-fg flex-1 text-center"
            numberOfLines={1}
          >
            {doc.filename}
          </Text>
          <TouchableOpacity
            onPress={() => setSheetVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <DotsIcon size={22} color="#8e8e93" />
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 px-5 pb-4">
          <View className="w-[6px] h-[6px] rounded-full bg-success" />
          <Text className="text-[12px] text-muted">Translated</Text>
          <Text className="text-[12px] text-muted">·</Text>
          <Text className="text-[12px] text-muted">2 pages · Finnish → English</Text>
        </View>

        <View className="mx-5 mb-4 flex-row p-0.5 bg-surface rounded-[9px] border" style={{ borderColor }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-[7px] items-center ${active ? 'bg-accent' : ''}`}
              >
                <Text
                  className={`text-[12px] font-semibold tracking-wide ${active ? 'text-black' : 'text-muted'}`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {showDecodeGate && !decoding && (
            <View className="flex-row items-center gap-3 bg-accent-dim rounded-lg px-4 py-3 mb-4 border" style={{ borderColor: 'rgba(146,217,187,0.2)' }}>
              <Text className="flex-1 text-[13px] text-accent leading-[1.5]">
                {t('document.not_decoded')}
              </Text>
              <Button variant="primary" size="sm" loading={decoding} onPress={handleDecode}>
                {t('document.summary')}
              </Button>
            </View>
          )}

          {decoding && (
            <View className="pt-8 items-center">
              <Spinner size="lg" label={t('scan.decoding')} />
            </View>
          )}

          {!decoding && activeTab === 'summary' && isDemo && (
            <View className="pt-3">
              <Text className="text-[12px] font-medium text-muted tracking-wide uppercase mb-2">
                KELA — Housing Benefit
              </Text>
              <Text className="font-display text-[22px] font-semibold text-fg leading-[1.2] mb-1">
                €387.20/month
              </Text>
              <Text className="text-[13px] text-accent font-medium mb-5">Approved</Text>

              <Text className="text-[14px] text-muted leading-[1.7] mb-6">{mockSummary}</Text>

              <Text className="text-[12px] font-semibold text-fg uppercase tracking-wide mb-3">
                {t('document.key_points')}
              </Text>
              {mockKeyPoints.map((point, i) => (
                <View
                  key={point.label}
                  className="flex-row items-center justify-between py-2.5"
                  style={{ borderBottomWidth: i < mockKeyPoints.length - 1 ? 1 : 0, borderColor }}
                >
                  <Text className="text-[14px] text-muted">{point.label}</Text>
                  <Text
                    className={`text-[14px] font-medium ${point.highlight ? 'text-accent' : ''} ${point.urgent ? 'text-warning' : 'text-fg'}`}
                  >
                    {point.value}
                  </Text>
                </View>
              ))}

              <Text className="text-[12px] font-semibold text-fg uppercase tracking-wide mt-6 mb-3">
                {t('document.what_to_do')}
              </Text>
              {mockSteps.map((step) => (
                <View
                  key={step.title}
                  className="flex-row items-start gap-3 py-3"
                  style={{ borderBottomWidth: 1, borderColor }}
                >
                  <View className="w-5 h-5 rounded-full bg-accent/20 items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckIcon size={10} color={act} strokeWidth={3} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-medium text-fg">{step.title}</Text>
                    <Text className="text-[13px] text-muted leading-[1.5] mt-0.5">{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {!decoding && activeTab === 'summary' && !isDemo && decode && (
            <View className="pt-3">
              {decode.structuredData ? (
                Object.entries(decode.structuredData as Record<string, unknown>).map(
                  ([key, value]) => (
                    <View key={key} className="mb-5">
                      <Text className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      </Text>
                      <Text className="text-[14px] text-fg leading-[1.7]">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </Text>
                    </View>
                  )
                )
              ) : decode.rawResponse ? (
                <View>
                  <Text className="text-[13px] text-muted leading-[1.8] font-mono">
                    {typeof decode.rawResponse === 'object'
                      ? JSON.stringify(decode.rawResponse, null, 2)
                      : String(decode.rawResponse)}
                  </Text>
                </View>
              ) : (
                <View className="items-center py-8">
                  <Text className="text-body-sm text-muted">No structured data available.</Text>
                </View>
              )}
            </View>
          )}

          {!decoding && activeTab === 'original' && (
            <View className="pt-3">
              {isDemo ? (
                <>
                  <TouchableOpacity
                    className="flex-row items-center justify-center gap-2.5 bg-surface rounded-lg py-4 mb-5 border"
                    style={{ borderColor }}
                    activeOpacity={0.7}
                  >
                    <EyeIcon size={18} color={act} />
                    <Text className="text-[14px] font-medium text-accent">Open original document</Text>
                  </TouchableOpacity>

                  <View className="py-4 px-4 rounded-lg" style={{ backgroundColor: 'rgba(28,28,30,0.5)' }}>
                    <Text className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">
                      KELA — Päätös asumistuesta
                    </Text>
                    <Text className="text-[12px] text-muted mb-4">Page 1/2</Text>

                    <Text className="text-[14px] text-fg font-semibold mb-2">
                      Asumistuen määrääminen
                    </Text>

                    <View className="flex-row gap-5 mb-3">
                      <View>
                        <Text className="text-[11px] text-muted">Date</Text>
                        <Text className="text-[13px] text-fg">15.03.2026</Text>
                      </View>
                      <View>
                        <Text className="text-[11px] text-muted">Reference</Text>
                        <Text className="text-[13px] text-fg font-mono">12345/2026</Text>
                      </View>
                    </View>

                    <View className="pt-3" style={{ borderTopWidth: 1, borderColor }}>
                      <Text className="text-[14px] text-fg font-semibold mb-1.5">Päätös</Text>
                      <Text className="text-[14px] text-muted leading-[1.8] mb-3">
                        Kela on päättänyt, että sinulla on oikeus asumistukeen 1.4.2026 alkaen.
                        {'\n\n'}
                        Asumistuen määrä on 387,20 €/kk.
                        {'\n\n'}
                        Tukea maksetaan 15. päivänä joka kuukausi jälkikäteen.
                      </Text>

                      <Text className="text-[14px] text-fg font-semibold mb-1.5">Edellytykset</Text>
                      <Text className="text-[14px] text-muted leading-[1.8]">
                        Asumistuen saamisen edellytyksenä on, että asut vakituisesti
                        {'\n'}
                        vuokra-asunnossa Suomessa.
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleOpenOriginal}
                    className="flex-row items-center justify-center gap-2.5 bg-surface rounded-lg py-4 mb-5 border"
                    style={{ borderColor }}
                    activeOpacity={0.7}
                  >
                    <EyeIcon size={18} color={act} />
                    <Text className="text-[14px] font-medium text-accent">Open original document</Text>
                  </TouchableOpacity>

                  {decode?.rawResponse && (
                    <View className="py-4 px-4 rounded-lg" style={{ backgroundColor: 'rgba(28,28,30,0.5)' }}>
                      <Text className="text-[13px] text-muted leading-[1.8] font-mono">
                        {typeof decode.rawResponse === 'object'
                          ? JSON.stringify(decode.rawResponse, null, 2)
                          : String(decode.rawResponse)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {!decoding && activeTab === 'dates' && isDemo && (
            <View className="pt-3">
              <Text className="font-display text-[20px] font-semibold text-fg mb-5">
                {t('document.extracted_dates')}
              </Text>
              {mockDates.map((item) => (
                <View
                  key={item.label}
                  className="flex-row items-center gap-3 py-3.5"
                  style={{ borderBottomWidth: 1, borderColor }}
                >
                  <View
                    className="w-9 h-9 rounded-lg items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: item.urgent ? 'rgba(255,159,10,0.1)' : 'rgba(146,217,187,0.1)' }}
                  >
                    <CalendarIcon
                      size={17}
                      color={item.urgent ? '#ff9f0a' : act}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] text-muted mb-0.5">{item.label}</Text>
                    <Text
                      className={`text-[15px] font-semibold ${item.urgent ? 'text-warning' : 'text-fg'} ${item.mono ? 'font-mono' : ''}`}
                    >
                      {item.value}
                    </Text>
                  </View>
                  {item.urgent && (
                    <View className="px-2 py-0.5 rounded-md bg-warning/10">
                      <Text className="text-[10px] font-semibold text-warning">URGENT</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {!decoding && activeTab === 'dates' && !isDemo && decode?.structuredData && (
            <View className="pt-3">
              <Text className="font-display text-[20px] font-semibold text-fg mb-5">
                {t('document.extracted_dates')}
              </Text>
              {Object.entries(decode.structuredData as Record<string, unknown>).map(
                ([key, value]) => (
                  <View key={key} className="mb-4">
                    <Text className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </Text>
                    <Text className="text-[14px] text-fg">
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

          {!decoding && activeTab === 'actions' && isDemo && (
            <View className="pt-3">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="font-display text-[20px] font-semibold text-fg">
                  {t('document.required_actions')}
                </Text>
                <Text className="text-[13px] text-muted">
                  {checkedActions.filter(Boolean).length}/{mockActions.length}
                </Text>
              </View>

              {mockActions.map((action, i) => (
                <TouchableOpacity
                  key={action.title}
                  onPress={() => toggleChecked(i)}
                  className="flex-row items-start gap-3 py-3.5"
                  style={{ borderBottomWidth: 1, borderColor }}
                  activeOpacity={0.6}
                >
                  <View
                    className={`w-[20px] h-[20px] rounded-[4px] border-2 items-center justify-center flex-shrink-0 mt-0.5 ${
                      checkedActions[i]
                        ? 'bg-accent border-accent'
                        : 'border-border'
                    }`}
                  >
                    {checkedActions[i] && <CheckIcon size={11} color="#000" strokeWidth={3} />}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-[14px] font-medium ${checkedActions[i] ? 'text-muted line-through' : 'text-fg'}`}
                    >
                      {action.title}
                    </Text>
                    <Text className="text-[13px] text-muted leading-[1.5] mt-0.5">{action.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!decoding && activeTab === 'actions' && !isDemo && decode?.structuredData && (
            <View className="pt-3">
              <Text className="font-display text-[20px] font-semibold text-fg mb-5">
                {t('document.required_actions')}
              </Text>
              {Object.entries(decode.structuredData as Record<string, unknown>).map(
                ([key, value]) => (
                  <View key={key} className="mb-4">
                    <Text className="text-[12px] font-semibold text-muted uppercase tracking-wide mb-1.5">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    </Text>
                    <Text className="text-[14px] text-fg">
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </Text>
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>

        {!showDecodeGate || decode ? (
          <View
            className="flex-row items-center"
            style={{
              borderTopWidth: 1,
              borderColor: 'rgba(56,56,58,0.4)',
              paddingBottom: insets.bottom + 4,
              paddingTop: 4,
            }}
          >
            <ToolbarButton icon={<DownloadIcon size={18} color="#86868b" />} label={t('document.share')} onPress={handleShare} />
            <ToolbarButton
              icon={isPremium ? <OpenIcon size={18} color="#86868b" /> : <LockIcon size={16} color="#86868b" />}
              label={t('document.export')}
              onPress={isPremium ? handleExport : handlePremiumFeature}
            />
            <ToolbarButton
              icon={isPremium ? <ArchiveIcon size={18} color="#86868b" /> : <LockIcon size={16} color="#86868b" />}
              label={t('document.archive')}
              onPress={isPremium ? handleArchive : handlePremiumFeature}
            />
            <ToolbarButton
              icon={
                <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <Path d="M3 6h18" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#ff453a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              }
              label={t('document.delete_document')}
              color="#ff453a"
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </View>

      <BottomSheet
        visible={sheetVisible}
        title={doc.filename}
        actions={[
          { label: t('document.share'), onPress: () => setSheetVisible(false) },
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
