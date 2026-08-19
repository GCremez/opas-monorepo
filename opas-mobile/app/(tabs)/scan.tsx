import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Svg, { Path, Line } from 'react-native-svg';
import { XIcon, FlashIcon, GalleryIcon } from '../../src/components/icons';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Button } from '../../src/components/ui/Button';
import { useDocumentStore } from '../../src/store/documentStore';
import { useToast } from '../../src/components/ui/ToastProvider';
import { useThemeColors } from '../../src/store/themeStore';

type ScanState = 'ready' | 'scanning' | 'processing' | 'success' | 'error';

const STEPS = [
  { key: 'uploading', duration: 2000 },
  { key: 'analyzing', duration: 3000 },
  { key: 'extracting', duration: 2500 },
];

// Privacy-first "reading" checklist (design 3e): steps tick off in order,
// with a reassurance line. Steps map to PII scrub → translate → extract.
function ScanProgress({ filename }: { filename?: string }) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) return;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), STEPS[stepIndex].duration);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  return (
    <View className="w-full px-8">
      <Text className="font-mono text-[10px] tracking-[0.05em] uppercase text-muted">
        {(filename ?? 'document').toUpperCase()}
      </Text>
      <Text className="font-semibold text-[10px] tracking-[0.18em] uppercase text-muted mt-6">{t('scan.please_wait')}</Text>
      <Text className="font-display text-[27px] leading-[30px] tracking-[-0.01em] text-fg mt-2 mb-8">{t('scan.reading')}</Text>

      {STEPS.map((step, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <View key={step.key} className="flex-row items-center gap-3 py-3 border-b border-hairline">
            <Text className={`font-mono text-[13px] ${done ? 'text-accent' : active ? 'text-warning' : 'text-muted'}`}>
              {done ? '✓' : active ? '◌' : '·'}
            </Text>
            <Text className={`font-mono text-[12px] tracking-[0.04em] uppercase ${active || done ? 'text-fg' : 'text-muted'}`}>
              {t(`scan.step_${step.key}`)}{active ? '…' : ''}
            </Text>
          </View>
        );
      })}

      <Text className="font-serif-italic text-[14px] leading-[22px] text-muted mt-6">{t('scan.privacy_note')}</Text>
      <ActivityIndicator size="small" color={c.accent} className="mt-6 self-start" />
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
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { uploadAndDecode, error, clearError } = useDocumentStore();
  const { showToast } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const cancelledRef = useRef(false);
  const [state, setState] = useState<ScanState>('ready');
  const [flashOn, setFlashOn] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{ name: string; meta: string } | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    cancelledRef.current = false;
    setState('scanning');

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo || cancelledRef.current) return;

      setState('processing');
      const result = await uploadAndDecode(
        `document_${Date.now()}.jpg`,
        'image/jpeg',
        photo.uri
      );
      if (cancelledRef.current) return;

      if (result) {
        setLastResult({
          name: `Document #${result.documentId.slice(0, 8)}`,
          meta: t('scan.document_decoded'),
        });
        showToast(t('scan.document_decoded'));
        setState('success');
      } else {
        showToast(t('scan.scan_failed_desc'));
        setState('error');
      }
    } catch {
      if (!cancelledRef.current) {
        showToast(t('scan.scan_failed_desc'));
        setState('error');
      }
    }
  };

  const handlePickFromGallery = async () => {
    setGalleryOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    cancelledRef.current = true;
    const asset = result.assets[0];

    setState('processing');
    const uploadResult = await uploadAndDecode(
      asset.fileName ?? `document_${Date.now()}.jpg`,
      asset.mimeType ?? 'image/jpeg',
      asset.uri
    );
    if (uploadResult) {
      setLastResult({
        name: `Document #${uploadResult.documentId.slice(0, 8)}`,
        meta: t('scan.document_decoded'),
      });
      setState('success');
    } else {
      setState('error');
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setState('ready');
  };

  const handleClose = () => {
    clearError();
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-body text-muted">{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-display text-title text-fg text-center mb-2">Camera access needed</Text>
          <Text className="font-serif text-prose text-fg-soft text-center mb-6">Grant camera access in Settings to scan documents.</Text>
          <Button variant="primary" onPress={requestPermission}>Grant permission</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'scanning') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-72 h-80 border-2 border-accent rounded-lg items-center justify-center mb-8">
            <Text className="font-serif text-prose text-fg-soft text-center">{t('scan.align_in_frame')}</Text>
          </View>
          <Text className="font-body text-body-sm text-muted text-center mb-8">
            {t('scan.auto_capturing')}
          </Text>
          <Button variant="ghost" onPress={handleClose}>{t('common.cancel')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'processing') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center">
          <ScanProgress filename="KELA_päätös.pdf · 2 pages" />
          <View className="px-8 mt-8">
            <Button variant="ghost" onPress={handleCancel}>{t('common.cancel')}</Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <FadeIn>
            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-surface items-center justify-center mb-6">
                <Svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <Path d="M3 7V5a2 2 0 0 1 2-2h2" stroke={c.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M17 3h2a2 2 0 0 1 2 2v2" stroke={c.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M21 17v2a2 2 0 0 1-2 2h-2" stroke={c.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M7 21H5a2 2 0 0 1-2-2v-2" stroke={c.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <Line x1="6" y1="6" x2="18" y2="18" stroke={c.danger} strokeWidth="2" strokeLinecap="round" />
                </Svg>
              </View>
              <Text className="font-display text-title text-fg text-center mb-2">
                {t('scan.scan_failed_title')}
              </Text>
              <Text className="font-serif text-prose text-fg-soft text-center mb-8 max-w-[300px]">
                {error || t('scan.scan_failed_desc')}
              </Text>
              <View className="gap-3 w-full max-w-[280px]">
                <Button
                  variant="primary"
                  block
                  onPress={() => { clearError(); setState('ready'); }}
                >
                  {t('common.retry')}
                </Button>
                <Button variant="ghost" block onPress={handleClose}>
                  {t('common.close')}
                </Button>
              </View>
            </View>
          </FadeIn>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mb-6">
            <Text className="font-display text-[34px] text-on-accent">✓</Text>
          </View>
          <Text className="font-display text-title text-fg text-center mb-2">
            {t('scan.document_decoded')}
          </Text>
          {lastResult && (
            <Text className="font-mono text-[11px] text-muted text-center mb-6">
              {lastResult.name}
            </Text>
          )}
          <Button variant="primary" onPress={handleClose} className="mb-3">
            {t('common.done')}
          </Button>
          <Button variant="ghost" onPress={() => setState('ready')}>
            {t('scan.scan_another')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        facing="back"
        enableTorch={flashOn}
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-5 pt-safe pb-6">
          <Pressable
            onPress={handleClose}
            className="w-10 h-10 rounded-full bg-[rgba(28,28,30,.6)] border border-[rgba(255,255,255,.08)] items-center justify-center"
          >
            <XIcon size={20} color="rgba(255,255,255,.7)" />
          </Pressable>
          <Text className="text-[16px] font-semibold text-[rgba(255,255,255,.8)]">
            {t('scan.title')}
          </Text>
          <Pressable
            onPress={() => setGalleryOpen(true)}
            className="w-10 h-10 rounded-full bg-[rgba(28,28,30,.6)] border border-[rgba(255,255,255,.08)] items-center justify-center"
          >
            <GalleryIcon size={20} color="rgba(255,255,255,.7)" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-[280px] h-[380px] relative">
            <View className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-accent rounded-tl-[4px]" />
            <View className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-accent rounded-tr-[4px]" />
            <View className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-accent rounded-bl-[4px]" />
            <View className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-accent rounded-br-[4px]" />
            <Text className="absolute -bottom-8 left-0 right-0 text-center text-[13px] text-[rgba(255,255,255,.4)]">
              {t('scan.align_in_frame')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-12 px-6 pb-safe pt-8">
          <Pressable
            onPress={() => setFlashOn(!flashOn)}
            className="w-[52px] h-[52px] rounded-full bg-[rgba(28,28,30,.6)] border border-[rgba(255,255,255,.1)] items-center justify-center"
          >
            <FlashIcon size={20} color={flashOn ? '#8fbb9f' : 'rgba(255,255,255,.7)'} />
          </Pressable>
          <Pressable
            onPress={handleCapture}
            className="w-[76px] h-[76px] rounded-full bg-[rgba(255,255,255,.12)] border-[3px] border-[rgba(255,255,255,.5)] items-center justify-center"
          >
            <View className="w-[60px] h-[60px] rounded-full bg-white" />
          </Pressable>
          <View className="w-[52px] h-[52px]" />
        </View>
      </SafeAreaView>

      <BottomSheet
        visible={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        actions={[
          {
            icon: <GalleryIcon size={22} color="rgba(255,255,255,.7)" />,
            label: t('scan.gallery'),
            onPress: handlePickFromGallery,
          },
        ]}
      />
    </View>
  );
}
