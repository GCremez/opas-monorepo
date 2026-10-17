import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { XIcon, FlashIcon, GalleryIcon } from '../../src/components/icons';
import { OrbitLoader, SnagError } from '../../src/components/motion';
import { Button } from '../../src/components/ui/Button';
import { useDocumentStore } from '../../src/store/documentStore';
import { useFolderStore } from '../../src/store/folderStore';
import { useThemeColors } from '../../src/store/themeStore';
import { toDecodeView } from '../../src/lib/decodeView';
import { folderName } from '../../src/lib/folders';
import { track } from '../../src/lib/analytics';

type ScanState = 'ready' | 'capturing' | 'processing' | 'success' | 'error';

// The camera sits under the paper panel in both themes, so its marks use the paper
// colour directly rather than a theme token.
const PAPER = '#f2ede2';

const STEPS = [
  { key: 'uploading', duration: 2000 },
  { key: 'analyzing', duration: 3000 },
  { key: 'extracting', duration: 2500 },
];

/** Masthead shared by the non-camera states: eyebrow on the left, close on the right. */
function Masthead({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <View className="flex-row items-center justify-between px-6 pt-3">
      <Text className="font-semibold text-label uppercase text-muted">{t('scan.eyebrow')}</Text>
      <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
        <XIcon size={20} color={c['fg-soft']} />
      </TouchableOpacity>
    </View>
  );
}

// Privacy-first "reading" checklist (design 3e): steps tick off in order,
// with a reassurance line. Steps map to PII scrub → translate → extract.
function ScanProgress({ filename }: { filename: string }) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) return;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), STEPS[stepIndex].duration);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  return (
    <View className="w-full px-6">
      <Text className="font-mono text-meta uppercase text-muted" numberOfLines={1}>{filename}</Text>
      <Text className="font-semibold text-label uppercase text-muted mt-6">{t('scan.please_wait')}</Text>
      <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg mt-2 mb-8" accessibilityRole="header">
        {t('scan.reading')}
      </Text>

      <View className="border-t border-rule">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <View key={step.key} className="flex-row items-center gap-3 py-3.5 border-b border-line">
              <Text className={`font-mono text-[13px] w-4 ${done ? 'text-accent' : active ? 'text-warning' : 'text-muted'}`}>
                {done ? '✓' : active ? '◌' : '·'}
              </Text>
              <Text className={`font-mono text-meta uppercase ${active || done ? 'text-fg' : 'text-muted'}`}>
                {t(`scan.step_${step.key}`)}{active ? '…' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text className="font-serif-italic text-[15px] leading-[23px] text-fg-soft mt-6">{t('scan.privacy_note')}</Text>
      <View className="mt-8 self-start"><OrbitLoader size={40} /></View>
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

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const v = pos[0] === 't' ? 'top-0 border-t-2' : 'bottom-0 border-b-2';
  const h = pos[1] === 'l' ? 'left-0 border-l-2' : 'right-0 border-r-2';
  return <View className={`absolute w-8 h-8 ${v} ${h}`} style={{ borderColor: PAPER }} />;
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { uploadAndDecode, error, failedDocumentId, clearError } = useDocumentStore();
  const { folders, fetchFolders } = useFolderStore();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // Bumped on cancel/close so a late upload result doesn't flip the screen back.
  const runRef = useRef(0);
  const [state, setState] = useState<ScanState>('ready');
  const [flashOn, setFlashOn] = useState(false);
  const [filename, setFilename] = useState('');
  const [lastResult, setLastResult] = useState<{ documentId: string; name: string; folderId?: string | null } | null>(null);

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
      setLastResult({
        documentId: result.documentId,
        name: toDecodeView(result)?.title ?? name,
        folderId: doc?.folderId,
      });
      setState('success');
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
    setLastResult(null);
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

  if (state === 'processing') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Masthead onClose={handleCancel} />
        <View className="flex-1 justify-center">
          <ScanProgress filename={filename} />
        </View>
        <View className="px-6 pb-4">
          <Button variant="ghost" onPress={handleCancel}>{t('common.cancel')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    const limit = error === 'DECODE_LIMIT_REACHED';
    const savedId = error === 'DECODE_FAILED' ? failedDocumentId : null;
    const title = limit
      ? t('scan.limit_title')
      : error === 'UPLOAD_FAILED'
        ? t('scan.upload_failed_title')
        : savedId
          ? t('scan.decode_failed_title')
          : t('scan.scan_failed_title');
    const body = limit
      ? t('scan.limit_desc')
      : error === 'UPLOAD_FAILED'
        ? t('scan.upload_failed_desc')
        : savedId
          ? t('scan.decode_failed_desc')
          : t('scan.scan_failed_desc');
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Masthead onClose={handleClose} />
        <View className="flex-1 items-center justify-center px-8">
          <FadeIn>
            <SnagError
              title={title}
              body={body}
              primaryLabel={limit ? t('scan.upgrade') : savedId ? t('scan.open_document') : t('common.retry')}
              secondaryLabel={limit || savedId ? t('common.close') : t('common.cancel')}
              onPrimary={() => {
                if (limit) { reset(); router.push('/subscription'); }
                else if (savedId) openDocument(savedId);
                else reset();
              }}
              onSecondary={limit || savedId ? handleClose : reset}
            />
          </FadeIn>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success' && lastResult) {
    const folder = lastResult.folderId ? folders.find((f) => f.id === lastResult.folderId) : undefined;
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Masthead onClose={handleClose} />
        <View className="flex-1 justify-center px-6">
          <FadeIn>
            <View className="w-12 h-12 rounded-full border border-accent items-center justify-center">
              <Text className="font-display text-[22px] text-accent">✓</Text>
            </View>
            <Text className="font-semibold text-label uppercase text-muted mt-8">{t('scan.document_decoded')}</Text>
            <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg mt-2" accessibilityRole="header">
              {lastResult.name}
            </Text>
            <Text className="font-serif text-prose text-fg-soft mt-4">
              {folder ? t('scan.filed_under', { category: folderName(folder, t) }) : t('scan.not_filed')}
            </Text>
          </FadeIn>
        </View>
        <View className="px-6 pb-4 gap-3">
          <Button variant="primary" block onPress={() => openDocument(lastResult.documentId)}>{t('scan.open_document')}</Button>
          <Button variant="ghost" block onPress={reset}>{t('scan.scan_another')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <OrbitLoader size={40} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // No camera: the gallery still works, so offer it instead of a dead end.
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <Masthead onClose={handleClose} />
        <View className="flex-1 justify-center px-6">
          <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg" accessibilityRole="header">
            {t('common.camera_access_needed')}
          </Text>
          <Text className="font-serif text-prose text-fg-soft mt-3">{t('scan.grant_permission_desc')}</Text>
        </View>
        <View className="px-6 pb-4 gap-3">
          <Button variant="primary" block onPress={requestPermission}>{t('common.grant_permission')}</Button>
          <Button variant="outline" block onPress={handlePickFromGallery}>{t('scan.gallery')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  const capturing = state === 'capturing';
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        facing="back"
        enableTorch={flashOn}
      />
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center justify-between px-6 pt-3">
          <TouchableOpacity onPress={handleClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <XIcon size={20} color={PAPER} />
          </TouchableOpacity>
          <Text className="font-semibold text-label uppercase" style={{ color: PAPER }}>{t('scan.eyebrow')}</Text>
          <TouchableOpacity
            onPress={() => setFlashOn((on) => !on)}
            hitSlop={12}
            accessibilityRole="switch"
            accessibilityState={{ checked: flashOn }}
            accessibilityLabel={t('scan.flash')}
            className="flex-row items-center gap-1.5"
          >
            <FlashIcon size={16} color={PAPER} />
            <Text className="font-mono text-meta uppercase" style={{ color: PAPER, opacity: flashOn ? 1 : 0.7 }}>
              {flashOn ? t('scan.flash_on') : t('scan.flash_off')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-[270px] h-[360px]">
            <Corner pos="tl" />
            <Corner pos="tr" />
            <Corner pos="bl" />
            <Corner pos="br" />
          </View>
          <Text className="font-serif-italic text-[15px] mt-5" style={{ color: PAPER }}>{t('scan.align_in_frame')}</Text>
        </View>
      </SafeAreaView>

      {/* Paper panel: the controls live on the page, not floating over the photo. */}
      <View className="bg-bg rounded-t-[22px] px-6 pt-5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <Text className="font-serif text-[15px] leading-[22px] text-fg-soft text-center">{t('scan.hint')}</Text>
        <View className="flex-row items-center justify-between mt-5">
          <TouchableOpacity
            onPress={handlePickFromGallery}
            disabled={capturing}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('scan.gallery')}
            className="w-20 items-center gap-1.5"
          >
            <GalleryIcon size={22} color={c['fg-soft']} />
            <Text className="font-mono text-meta uppercase text-muted">{t('scan.gallery_short')}</Text>
          </TouchableOpacity>

          <Pressable
            onPress={handleCapture}
            disabled={capturing}
            accessibilityRole="button"
            accessibilityLabel={t('scan.capture')}
            className="w-[76px] h-[76px] rounded-full border-2 border-fg items-center justify-center"
          >
            {({ pressed }) => (
              <View className={`w-[62px] h-[62px] rounded-full bg-accent items-center justify-center ${pressed ? 'opacity-80' : ''}`}>
                {capturing && <ActivityIndicator color={c['on-accent']} />}
              </View>
            )}
          </Pressable>

          <View className="w-20" />
        </View>
      </View>
    </View>
  );
}
