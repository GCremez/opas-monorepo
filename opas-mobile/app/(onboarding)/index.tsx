import * as React from 'react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, Pressable, useWindowDimensions, type FlatList as RNFlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LogoMark } from '../../src/components/icons';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { easing, motionDuration, useReducedMotion } from '../../src/lib/motion';
import { track } from '../../src/lib/analytics';

const ONBOARDING_SEEN_KEY = 'has_seen_onboarding';

// ── Reveal ─────────────────────────────────────────────────────────
// Parts of an illustration surface in order once their slide is the one on screen,
// so each slide plays out the thing it describes instead of sitting there static.
function Reveal({ active, delay = 0, children, className }: { active: boolean; delay?: number; children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    v.value = reduced
      ? withTiming(1, { duration: motionDuration.fast })
      : withDelay(delay, withTiming(1, { duration: motionDuration.materialize, easing: easing.settle }));
  }, [active, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: reduced ? 0 : (1 - v.value) * 12 }],
  }));
  return <Animated.View className={className} style={style}>{children}</Animated.View>;
}

// A bar that fills to `to` (0–1) when its slide arrives: time left before a deadline.
function TimeBar({ active, to, delay, tone }: { active: boolean; to: number; delay: number; tone: string }) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    v.value = reduced ? to : withDelay(delay, withTiming(to, { duration: 900, easing: easing.settle }));
  }, [active, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View className="h-1 rounded-pill bg-hairline mt-2 overflow-hidden">
      <Animated.View className={`h-1 rounded-pill ${tone}`} style={style} />
    </View>
  );
}

// ── Illustrations ──────────────────────────────────────────────────

// 1 · A Kela letter in Finnish, then what it means in plain words.
function LetterIllo({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <View className="rounded-lg bg-surface p-5" accessible accessibilityLabel={t('onboarding.illo_plain')}>
      <Text className="font-mono text-meta uppercase text-muted">Kela · Päätös</Text>
      <View className="flex-row items-center gap-2 mt-3">
        <View className="h-2.5 w-24 rounded-sm bg-fg" />
        <View className="h-1.5 w-14 rounded-sm bg-node" />
      </View>
      <Text className="font-serif text-[14px] text-fg-soft mt-2.5">Päätös yleisestä asumistuesta</Text>
      <View className="h-1.5 w-[85%] rounded-sm bg-node mt-2.5" />
      <View className="h-1.5 w-[60%] rounded-sm bg-node mt-1.5" />

      <Reveal active={active} delay={350} className="border-t border-rule mt-4 pt-3">
        <Text className="font-semibold text-label uppercase text-accent">{t('onboarding.illo_meaning')}</Text>
        <Text className="font-serif text-[16px] leading-[22px] text-fg mt-1.5">{t('onboarding.illo_plain')}</Text>
      </Reveal>
      <Reveal active={active} delay={750}>
        <Text className="font-mono text-meta uppercase text-warning mt-2">→ {t('onboarding.illo_action')}</Text>
      </Reveal>
    </View>
  );
}

// 2 · Deadlines pulled out of letters, with the time left on each.
function DeadlineIllo({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const rows = [
    { label: t('onboarding.mini_1_row_1_label'), value: t('onboarding.mini_1_row_1_value'), text: 'text-danger', bar: 'bg-danger', left: 0.3 },
    { label: t('onboarding.mini_1_row_2_label'), value: t('onboarding.mini_1_row_2_value'), text: 'text-warning', bar: 'bg-warning', left: 0.7 },
  ];
  return (
    <View className="rounded-lg bg-surface p-5">
      {rows.map((r, i) => (
        <Reveal key={r.label} active={active} delay={150 + i * motionDuration.stagger * 2} className={i > 0 ? 'mt-4 pt-4 border-t border-line' : ''}>
          <View className="flex-row items-center justify-between">
            <Text className="font-serif text-[15px] text-fg flex-1 mr-3" numberOfLines={1}>{r.label}</Text>
            <Text className={`font-mono text-label tracking-[0.05em] uppercase ${r.text}`}>{r.value}</Text>
          </View>
          <TimeBar active={active} to={r.left} delay={350 + i * 200} tone={r.bar} />
        </Reveal>
      ))}
    </View>
  );
}

// 3 · Documents filed by authority.
function LedgerIllo({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const rows = [
    { label: t('onboarding.mini_2_row_1_label'), value: t('onboarding.mini_2_row_1_value'), tone: 'text-muted' },
    { label: t('onboarding.mini_2_row_2_label'), value: t('onboarding.mini_2_row_2_value'), tone: 'text-muted' },
    { label: t('onboarding.mini_2_row_3_label'), value: t('onboarding.mini_2_row_3_value'), tone: 'text-warning' },
  ];
  return (
    <View className="rounded-lg bg-surface px-5 py-2">
      {rows.map((r, i) => (
        <Reveal key={r.label} active={active} delay={150 + i * motionDuration.stagger}>
          <View className={`flex-row items-center justify-between py-3${i < rows.length - 1 ? ' border-b border-line' : ''}`}>
            <Text className="font-serif text-[15px] text-fg">{r.label}</Text>
            <Text className={`font-mono text-label tracking-[0.05em] uppercase ${r.tone}`}>{r.value}</Text>
          </View>
        </Reveal>
      ))}
    </View>
  );
}

// ── Progress ───────────────────────────────────────────────────────
// One segment per slide; each fills as you scroll into its slide, so the bar
// follows your finger rather than jumping when the page settles.
function ProgressSegment({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => ({
    width: `${interpolate(x.value / width, [i - 1, i], [0, 100], Extrapolation.CLAMP)}%`,
  }));
  return (
    <View className="flex-1 h-[3px] rounded-pill bg-hairline overflow-hidden">
      <Animated.View className="h-[3px] rounded-pill bg-accent" style={style} />
    </View>
  );
}

// ── Slide ──────────────────────────────────────────────────────────
type Slide = { key: string; eyebrow: string; title: string; desc: string; Illo: (p: { active: boolean }) => React.JSX.Element };

function SlideView({ slide, i, x, width, stageHeight, active, footnote }: {
  slide: Slide; i: number; x: SharedValue<number>; width: number; stageHeight: number; active: boolean; footnote?: string;
}) {
  const reduced = useReducedMotion();
  const range = [(i - 1) * width, i * width, (i + 1) * width];
  // The illustration trails the page and the copy trails a little less, so the slide
  // separates into layers as it moves instead of sliding by as one flat card.
  const stageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: reduced ? [] : [
      { translateX: interpolate(x.value, range, [width * 0.4, 0, -width * 0.4], Extrapolation.CLAMP) },
      { scale: interpolate(x.value, range, [0.94, 1, 0.94], Extrapolation.CLAMP) },
    ],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: reduced ? [] : [{ translateX: interpolate(x.value, range, [width * 0.15, 0, -width * 0.15], Extrapolation.CLAMP) }],
  }));
  const { Illo } = slide;
  return (
    <View style={{ width }} className="px-[30px]">
      {/* Fixed-height stage: the heading sits at the same height on every slide. */}
      <Animated.View style={[{ height: stageHeight }, stageStyle]} className="justify-center">
        <Illo active={active} />
      </Animated.View>
      <Animated.View style={copyStyle} className="mt-8">
        <Text className="font-semibold text-label tracking-[0.18em] uppercase text-accent mb-3">{slide.eyebrow}</Text>
        <Text className="font-display text-[32px] leading-[36px] tracking-[-0.01em] text-fg" accessibilityRole="header">{slide.title}</Text>
        <Text className="font-serif text-[16px] leading-[25px] text-fg-soft mt-3.5">{slide.desc}</Text>
        {footnote ? <Text className="font-serif-italic text-body-sm text-muted mt-4">{footnote}</Text> : null}
      </Animated.View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────
// The front door for anyone signed out: the story in three slides, with both ways in
// (create an account / sign in) always in reach. People who have been here before
// land on the last slide. Opened with ?replay=1 it's a read-only tour for people who
// are already signed in (Home → "See how Opas works").
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === '1';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const slides: Slide[] = [
    { key: 'read', eyebrow: t('onboarding.eyebrow_1'), title: t('onboarding.slide_1_title'), desc: t('onboarding.slide_1_desc'), Illo: LetterIllo },
    { key: 'dates', eyebrow: t('onboarding.eyebrow_2'), title: t('onboarding.slide_2_title'), desc: t('onboarding.slide_2_desc'), Illo: DeadlineIllo },
    { key: 'organize', eyebrow: t('onboarding.eyebrow_3'), title: t('onboarding.slide_3_title'), desc: t('onboarding.slide_3_desc'), Illo: LedgerIllo },
  ];
  const last = slides.length - 1;

  const [startIndex, setStartIndex] = useState<number | null>(isReplay ? 0 : null);
  const [index, setIndex] = useState(0);
  const listRef = useRef<RNFlatList<Slide>>(null);
  const x = useSharedValue(0);

  // Decide where this person belongs before showing anything.
  useEffect(() => {
    if (isReplay) return;
    if (isAuthenticated) {
      router.replace('/(tabs)');
      return;
    }
    SecureStore.getItemAsync(ONBOARDING_SEEN_KEY)
      .then((seen) => {
        const start = seen === 'true' ? last : 0;
        x.value = start * width;
        setIndex(start);
        setStartIndex(start);
      })
      .catch(() => setStartIndex(0));
  }, [isAuthenticated, isReplay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (startIndex === 0 && !isReplay) track('onboarding_started');
  }, [startIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });

  const goTo = (i: number) => {
    listRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const leave = async (to: 'register' | 'login') => {
    if (isReplay) return close();
    track('onboarding_finished', { action: to, slide: index + 1 });
    await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, 'true').catch(() => {});
    router.replace(to === 'register' ? '/(auth)/register' : '/(auth)/login');
  };

  if (startIndex === null) return <View className="flex-1 bg-bg" />;

  const isLast = index === last;
  const stageHeight = Math.max(200, Math.min(270, Math.round(height * 0.3)));
  const primaryLabel = isReplay
    ? (isLast ? t('common.done') : t('onboarding.continue'))
    : (isLast ? t('onboarding.create_account') : t('onboarding.continue'));

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header: brand on the left, the way out on the right. */}
      <View className="flex-row items-center justify-between px-6 pt-2 h-12">
        <View className="flex-row items-center gap-2">
          <LogoMark size={26} />
          <Text className="font-display text-[20px] leading-[24px] text-fg">Opas</Text>
        </View>
        {isReplay ? (
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" className="min-h-touch justify-center">
            <Text className="font-semibold text-label tracking-[0.13em] uppercase text-muted">{t('common.close')}</Text>
          </Pressable>
        ) : !isLast ? (
          <Pressable onPress={() => goTo(last)} hitSlop={10} accessibilityRole="button" className="min-h-touch justify-center">
            <Text className="font-semibold text-label tracking-[0.13em] uppercase text-muted">{t('onboarding.skip')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row gap-1.5 px-6 mt-3" accessible accessibilityRole="progressbar" accessibilityLabel={t('onboarding.step', { n: index + 1 })}>
        {slides.map((s, i) => (
          <ProgressSegment key={s.key} i={i} x={x} width={width} />
        ))}
      </View>

      <Animated.FlatList
        ref={listRef as never}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        contentContainerStyle={{ paddingTop: 20 }}
        renderItem={({ item, index: i }) => (
          <SlideView
            slide={item}
            i={i}
            x={x}
            width={width}
            stageHeight={stageHeight}
            active={i === index}
            footnote={i === last && !isReplay ? t('legal.not_affiliated') : undefined}
          />
        )}
      />

      {/* Footer never changes shape, only its label — nothing jumps on the last slide. */}
      <View className="px-[30px] pt-3 pb-4">
        <Button variant="primary" size="lg" block onPress={() => (isLast ? leave('register') : goTo(index + 1))}>
          {primaryLabel}
        </Button>
        {isReplay ? (
          <View className="min-h-touch mt-2" />
        ) : (
          <Pressable onPress={() => leave('login')} className="items-center justify-center min-h-touch mt-2" accessibilityRole="button">
            <Text className="font-semibold text-label tracking-[0.06em] uppercase text-fg-soft">{t('welcome.have_account')}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
