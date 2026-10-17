import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { XIcon } from '../../src/components/icons';
import { OrbitLoader } from '../../src/components/motion';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Button } from '../../src/components/ui/Button';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';
import { toDecodeView, type DecodeView } from '../../src/lib/decodeView';
import { folderName } from '../../src/lib/folders';
import { track } from '../../src/lib/analytics';

type ScanState = 'ready' | 'capturing' | 'processing' | 'review' | 'error';

// The viewfinder is always the ink surface (design 2a), whatever the app theme.
const INK = {
  bg: '#16150e',
  fg: '#ece6d8',
  soft: '#b6ae9e',
  muted: '#857e6f',
  accent: '#8fbb9f',
  warning: '#d8a552',
};

const STEPS = [
  { key: 'uploading', duration: 2000 },
  { key: 'analyzing', duration: 3000 },
  { key: 'extracting', duration: 2500 },
];

// Design 3e: privacy-first "reading" checklist; steps tick off in order.
function ScanProgress({ filename }: { filename: string }) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) return;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), STEPS[stepIndex].duration);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  return (
    <View className="w-full px-[30px]">
      <Text className="font-mono text-meta uppercase text-muted" numberOfLines={1}>{filename}</Text>
      <Text className="font-semibold text-label uppercase text-muted mt-6">{t('scan.please_wait')}</Text>
      <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg mt-2 mb-7" accessibilityRole="header">
        {t('scan.reading')}
      </Text>

      {STEPS.map((step, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <View key={step.key} className="flex-row items-center gap-3 py-2.5">
            <Text className={`font-body text-[13px] w-4 ${done ? 'text-accent' : active ? 'text-warning' : 'text-muted'}`}>
              {done ? '✓' : active ? '◌' : '·'}
            </Text>
            <Text className={`font-mono text-[13px] tracking-[0.04em] uppercase ${active ? 'text-fg' : done ? 'text-fg-soft' : 'text-muted'}`}>
              {t(`scan.step_${step.key}`)}{active ? '…' : ''}
            </Text>
          </View>
        );
      })}

      <View className="mt-8 self-start"><OrbitLoader size={36} /></View>
    </View>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos[0] === 't';
  const left = pos[1] === 'l';
  return (
    <View
      style={{
        position: 'absolute',
        width: 26,
        height: 26,
        [top ? 'top' : 'bottom']: 16,
        [left ? 'left' : 'right']: 16,
        borderColor: INK.fg,
        [top ? 'borderTopWidth' : 'borderBottomWidth']: 2,
        [left ? 'borderLeftWidth' : 'borderRightWidth']: 2,
        [`border${top ? 'Top' : 'Bottom'}${left ? 'Left' : 'Right'}Radius`]: 6,
      }}
    />
  );
}

/** One label/value line in the "here's what we found" card (design 3f). */
function FactRow({ label, value, tone = 'text-fg', last, onPress }: {
  label: string; value: string; tone?: string; last?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className={`flex-row items-baseline justify-between gap-4 py-3 ${last ? '' : 'border-b border-rule'}`}
    >
      <Text className="font-body text-[14px] text-fg-soft">{label}</Text>
      <Text className={`font-mono-medium text-[14px] uppercase flex-shrink text-right ${tone}`} numberOfLines={2}>{value}</Text>
    </Pressable>
  );
}

export default function ScanScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { uploadAndDecode, deleteDocument, assignFolder, error, failedDocumentId, clearError } = useDocumentStore();
  const { folders, fetchFolders } = useFolderStore();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // Bumped on cancel/close so a late upload result doesn't flip the screen back.
  const runRef = useRef(0);
  const [state, setState] = useState<ScanState>('ready');
  const [flashOn, setFlashOn] = useState(false);
  const [filename, setFilename] = useState('');
  const [found, setFound] = useState<{ documentId: string; view: DecodeView | null; folderId: string | null } | null>(null);
  const [categorySheet, setCategorySheet] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  const run = async (name: string, contentType: string, uri: string, source: 'camera' | 'gallery', startedAt: number) => {
    const runId = ++runRef.current;
    clearError();
    setFilename(name);
    setState('processing');
    const result = await uploadAndDecode(name, contentType, uri);
    if (runId !== runRef.current) return;

    if (result) {
      const doc = useDocumentStore.getState().documents.find((d) => d.id === result.documentId);
      fetchFolders();
      setFound({ documentId: result.documentId, view: toDecodeView(result), folderId: doc?.folderId ?? null });
      setState('review');
      track('scan_completed', { document_id: result.documentId, duration_ms: Date.now() - startedAt });
    } else {
      setState('error');
      track('scan_failed', { error: useDocumentStore.getState().error ?? 'unknown', stage: source });
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || state !== 'ready') return;
    const startedAt = Date.now();
    setState('capturing');
    track('scan_started', { source: 'camera' });
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) { setState('ready'); return; }
      track('scan_photo_captured');
      await run(`scan_${Date.now()}.jpg`, 'image/jpeg', photo.uri, 'camera', startedAt);
    } catch {
      setState('error');
      track('scan_failed', { error: 'capture_exception', stage: 'capture' });
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    track('scan_started', { source: 'gallery' });
    track('scan_gallery_pick');
    await run(asset.fileName ?? `photo_${Date.now()}.jpg`, asset.mimeType ?? 'image/jpeg', asset.uri, 'gallery', Date.now());
  };

  const reset = () => {
    runRef.current++;
    clearError();
    setFound(null);
    setState('ready');
  };

  const handleCancel = () => {
    track('scan_cancelled', { at_state: state });
    reset();
  };

  const handleClose = () => {
    reset();
    router.back();
  };

  const openDocument = (id: string) => {
    reset();
    router.push(`/document/${id}`);
  };

  // A letter that couldn't be read is kept so it can be retried from its page. Scanning
  // it again instead would leave that copy behind as a duplicate, so it goes first.
  const discardFailed = async () => {
    if (failedDocumentId) await deleteDocument(failedDocumentId);
  };

  const fileUnder = async (folderId: string | null) => {
    setCategorySheet(false);
    if (!found || found.folderId === folderId) return;
    const previous = found.folderId;
    setFound({ ...found, folderId });
    try {
      await assignFolder(found.documentId, folderId);
      fetchFolders();
    } catch {
      setFound((f) => (f ? { ...f, folderId: previous } : f));
    }
  };

  if (state === 'processing') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          <ScanProgress filename={filename} />
        </View>
        <Text className="font-serif-italic text-[14px] leading-[22px] text-muted text-center px-10">{t('scan.privacy_note')}</Text>
        <View className="px-6 pt-4 pb-2">
          <Button variant="ghost" onPress={handleCancel}>{t('common.cancel')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    const limit = error === 'DECODE_LIMIT_REACHED';
    const upload = error === 'UPLOAD_FAILED';
    const title = limit ? t('scan.limit_title') : upload ? t('scan.upload_failed_title') : t('scan.cant_read_title');
    const body = limit ? t('scan.limit_desc') : upload ? t('scan.upload_failed_desc') : t('scan.cant_read_desc');
    const retry = async () => { await discardFailed(); reset(); };
    const gallery = async () => { await discardFailed(); reset(); handlePickFromGallery(); };
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="px-6 pt-2">
          <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')} className="self-start">
            <XIcon size={20} color={c['fg-soft']} />
          </TouchableOpacity>
        </View>
        <FadeIn>
          {/* Design 5c */}
          <View className="flex-1 justify-center px-[34px]">
            <View className="w-[50px] h-[50px] rounded-full items-center justify-center self-center mb-[22px]" style={{ backgroundColor: `${c.danger}1a` }}>
              <Text className="font-body text-[20px] text-danger">!</Text>
            </View>
            <Text className="font-display text-[24px] leading-[28px] text-fg text-center" accessibilityRole="header">{title}</Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft text-center mt-3 mb-[22px]">{body}</Text>

            {!limit && !upload && (
              <View className="bg-surface rounded-md px-[18px] py-4 mb-[26px]">
                {(['tip_flatten', 'tip_glare', 'tip_corners'] as const).map((k) => (
                  <View key={k} className="flex-row gap-2.5 py-1.5">
                    <Text className="font-body text-[14px] text-accent">✓</Text>
                    <Text className="font-body text-[14px] text-fg-soft">{t(`scan.${k}`)}</Text>
                  </View>
                ))}
              </View>
            )}

            {limit ? (
              <Button variant="primary" block onPress={() => { reset(); router.push('/subscription'); }}>{t('scan.upgrade')}</Button>
            ) : (
              <Button variant="primary" block onPress={retry}>{t('common.retry')}</Button>
            )}
            {limit ? (
              <TouchableOpacity onPress={handleClose} className="items-center py-3.5 mt-2 min-h-touch justify-center">
                <Text className="font-semibold text-label uppercase text-fg-soft">{t('common.close')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={gallery} className="items-center py-3.5 mt-2 min-h-touch justify-center">
                <Text className="font-semibold text-label uppercase text-fg-soft">{t('scan.pick_gallery_instead')}</Text>
              </TouchableOpacity>
            )}
            {failedDocumentId && (
              <TouchableOpacity onPress={() => openDocument(failedDocumentId)} className="items-center py-2 min-h-touch justify-center">
                <Text className="font-serif-italic text-[14px] text-muted">{t('scan.open_saved_copy')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>
      </SafeAreaView>
    );
  }

  if (state === 'review' && found) {
    // Design 3f: show what was understood before it goes into the record.
    const { view } = found;
    const folder = found.folderId ? folders.find((f) => f.id === found.folderId) : undefined;
    const facts = view?.keyFields.slice(0, 2) ?? [];
    const firstAction = view?.actions[0];
    const from = view?.language?.toUpperCase();
    const to = i18n.language.slice(0, 2).toUpperCase();
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <FadeIn>
          <View className="px-[26px] pt-6">
            <Text className="font-semibold text-label uppercase text-accent">{t('scan.found_eyebrow')}</Text>
            <Text className="font-display text-[28px] leading-[31px] tracking-[-0.01em] text-fg mt-2.5" accessibilityRole="header">
              {view?.title ?? filename}
            </Text>
            {from && from !== to && (
              <Text className="font-mono text-meta text-muted mt-2">{t('scan.translated', { from, to })}</Text>
            )}
          </View>

          <View className="mx-[26px] mt-[22px] px-5 py-2 bg-surface rounded-lg">
            {facts.map(([label, value], i) => (
              <FactRow key={label} label={label} value={value} tone={i === 0 ? 'text-accent' : 'text-fg'} />
            ))}
            {firstAction && (
              <FactRow
                label={t('scan.action_needed')}
                value={view!.actions.length > 1 ? `${view!.actions.length} · ${firstAction}` : firstAction}
                tone="text-warning"
              />
            )}
            <FactRow
              label={t('document.category')}
              value={`${folder ? folderName(folder, t) : t('document.choose_category')} ›`}
              tone={folder ? 'text-fg' : 'text-muted'}
              last
              onPress={() => setCategorySheet(true)}
            />
          </View>

          <View className="flex-1" />
          <View className="px-[30px] pb-4">
            <Button variant="primary" size="lg" block onPress={() => openDocument(found.documentId)}>{t('scan.save_record')}</Button>
            <View className="flex-row justify-center gap-[26px] mt-3">
              <TouchableOpacity
                onPress={async () => { await deleteDocument(found.documentId); reset(); }}
                className="py-3 min-h-touch justify-center"
              >
                <Text className="font-semibold text-label uppercase text-fg-soft">{t('scan.rescan')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openDocument(found.documentId)} className="py-3 min-h-touch justify-center">
                <Text className="font-semibold text-label uppercase text-fg-soft">{t('scan.edit_details')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeIn>

        <BottomSheet
          visible={categorySheet}
          title={t('document.category_title')}
          actions={[
            ...folders.map((f) => ({
              label: `${f.id === found.folderId ? '✓  ' : ''}${folderName(f, t)}`,
              onPress: () => fileUnder(f.id),
            })),
            { label: `${found.folderId ? '' : '✓  '}${t('document.no_category')}`, onPress: () => fileUnder(null) },
          ]}
          onClose={() => setCategorySheet(false)}
        />
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: INK.bg }} />;
  }

  if (!permission.granted) {
    // No camera: the gallery still works, so offer it instead of a dead end.
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="px-6 pt-2">
          <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')} className="self-start">
            <XIcon size={20} color={c['fg-soft']} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 justify-center px-[30px]">
          <Text className="font-display text-[28px] leading-[31px] tracking-[-0.01em] text-fg" accessibilityRole="header">
            {t('common.camera_access_needed')}
          </Text>
          <Text className="font-serif text-prose text-fg-soft mt-3">{t('scan.grant_permission_desc')}</Text>
        </View>
        <View className="px-[30px] pb-4 gap-3">
          <Button variant="primary" block onPress={requestPermission}>{t('common.grant_permission')}</Button>
          <Button variant="outline" block onPress={handlePickFromGallery}>{t('scan.gallery')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  // Design 2a: the viewfinder.
  const capturing = state === 'capturing';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: INK.bg }} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between px-[26px] pt-1.5 pb-1">
        <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')} className="w-28">
          <XIcon size={20} color={INK.soft} />
        </TouchableOpacity>
        <Text className="font-semibold text-label uppercase" style={{ color: INK.fg }}>{t('scan.new_scan')}</Text>
        <TouchableOpacity
          onPress={() => setFlashOn((on) => !on)}
          hitSlop={12}
          accessibilityRole="switch"
          accessibilityState={{ checked: flashOn }}
          accessibilityLabel={t('scan.flash')}
          className="w-28 items-end"
        >
          <Text className="font-semibold text-label uppercase" numberOfLines={1} style={{ color: flashOn ? INK.warning : INK.soft }}>
            {flashOn ? t('scan.flash_on') : t('scan.flash_off')}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 m-[22px] rounded-[20px] overflow-hidden items-center justify-center" style={{ backgroundColor: '#1d1b13' }}>
        <CameraView
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          enableTorch={flashOn}
        />
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />
        <Text className="font-mono text-[11px] leading-[18px] tracking-[0.08em] text-center" style={{ color: INK.muted }}>
          {t('scan.align_frame')}
        </Text>
      </View>

      <View className="px-[34px] pb-1.5 items-center">
        <Text className="font-display text-[20px] leading-[26px]" style={{ color: INK.fg }}>{t('scan.point_title')}</Text>
        <Text className="font-serif-italic text-[15px]" style={{ color: INK.muted }}>{t('scan.point_sub')}</Text>
      </View>

      <View className="flex-row items-center justify-between px-10 pt-[22px] pb-4">
        <TouchableOpacity
          onPress={handlePickFromGallery}
          disabled={capturing}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel={t('scan.gallery')}
          className="w-16"
        >
          <Text className="font-semibold text-label uppercase" style={{ color: INK.soft }}>{t('scan.gallery_short')}</Text>
        </TouchableOpacity>

        <Pressable
          onPress={handleCapture}
          disabled={capturing}
          accessibilityRole="button"
          accessibilityLabel={t('scan.capture')}
          className="w-[70px] h-[70px] rounded-full items-center justify-center"
          style={{ borderWidth: 3, borderColor: INK.fg }}
        >
          {({ pressed }) => (
            <View
              className="w-[54px] h-[54px] rounded-full items-center justify-center"
              style={{ backgroundColor: INK.accent, opacity: pressed ? 0.8 : 1 }}
            >
              {capturing && <ActivityIndicator color={INK.bg} />}
            </View>
          )}
        </Pressable>

        <View className="w-16" />
      </View>
    </SafeAreaView>
  );
}
