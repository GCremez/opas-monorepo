import { useEffect, useState, type ReactNode } from 'react';
import { View, Platform, RefreshControl, type ScrollViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  useReducedMotion,
  Easing,
  useAnimatedScrollHandler,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';
import { spring as springTokens } from '../../lib/motion';

// ── The Gather ─────────────────────────────────────────────────────
// Pull-to-refresh gesture. Drag down — three fragments converge into the ring,
// then release to spin. Source: "Opas Motion — Loaders.dc.html".

const HEADER = 56;
const THRESHOLD = 62;
const MAX = 96;

// scatter → dest offsets for the three converging fragments
const SCATTER = [
  [-26, 20],
  [30, -22],
  [-4, 30],
];
const DEST = [
  [0, -14],
  [12, 8],
  [-12, 8],
];

interface PullToGatherProps {
  children: ReactNode;
  /** Async work to run once released past threshold. Resolve to finish. */
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
}

function Fragment({ index, pull, color }: { index: number; pull: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, pull.value / THRESHOLD);
    const [sx, sy] = SCATTER[index];
    const [dx, dy] = DEST[index];
    return {
      opacity: 0.35 + 0.65 * p,
      transform: [
        { translateX: sx + (dx - sx) * p },
        { translateY: sy + (dy - sy) * p },
        { scale: 0.6 + 0.4 * p },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full"
      style={[{ width: 9, height: 9, left: '50%', top: '50%', marginLeft: -4.5, marginTop: -4.5, backgroundColor: color }, style]}
    />
  );
}

export function PullToGather({ children, onRefresh, refreshing: controlled }: PullToGatherProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const pull = useSharedValue(0);
  const spin = useSharedValue(0);
  const [phase, setPhase] = useState<'idle' | 'refreshing'>('idle');

  const finish = () => {
    setPhase('idle');
    spin.value = 0;
    pull.value = withSpring(0, springTokens.gather);
  };

  const startRefresh = () => {
    setPhase('refreshing');
    spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    Promise.resolve(onRefresh?.()).then(() => {
      // small settle so the spin is legible even on instant refreshes
      setTimeout(finish, reduced ? 0 : 500);
    });
  };

  const pan = Gesture.Pan()
    .enabled(phase !== 'refreshing' && !controlled)
    .onUpdate((e) => {
      if (e.translationY <= 0) return;
      pull.value = Math.min(MAX, e.translationY * 0.9);
    })
    .onEnd(() => {
      if (pull.value > THRESHOLD) {
        pull.value = withSpring(74, springTokens.gather);
        runOnJS(startRefresh)();
      } else {
        pull.value = withSpring(0, springTokens.gather);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: HEADER + pull.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * Math.min(1, pull.value / THRESHOLD),
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: interpolate(pull.value, [4, 24], [0, 1]) }));

  const isRefreshing = phase === 'refreshing' || controlled;

  return (
    <GestureDetector gesture={pan}>
      <View className="overflow-hidden relative" style={{ minHeight: HEADER + 140 }}>
        {/* Gather indicator */}
        <View className="absolute top-0 left-0 right-0 items-center justify-center" style={{ height: HEADER }}>
          <View style={{ width: 38, height: 38 }}>
            <Animated.View style={[{ position: 'absolute', inset: 0 } as object, ringStyle]}>
              <Svg width={38} height={38} viewBox="0 0 38 38">
                <Circle cx={19} cy={19} r={15} fill="none" stroke={c.node} strokeWidth={2} strokeDasharray="3 8" strokeLinecap="round" />
              </Svg>
            </Animated.View>
            {!reduced && (
              <>
                <Fragment index={0} pull={pull} color={c.accent} />
                <Fragment index={1} pull={pull} color={c.warning} />
                <Fragment index={2} pull={pull} color={c.danger} />
              </>
            )}
          </View>
          <Animated.Text
            className="font-body font-semibold text-[8.5px] tracking-[0.2em] uppercase mt-1"
            style={[{ color: c.muted }, labelStyle]}
          >
            {isRefreshing ? 'Gathering…' : 'Pull to refresh'}
          </Animated.Text>
        </View>

        {/* Sheet */}
        <Animated.View style={sheetStyle}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

// ── The Gather on a real list ──────────────────────────────────────
// Drop-in for a tab's ScrollView. The platform RefreshControl still owns the
// gesture, threshold and bounce (so scrolling never fights a second pan); only
// its spinner is hidden, and the Gather mark is drawn behind the content,
// driven by the overscroll. Invisible at rest, so it never shows through the
// page header.

const LIST_HEADER = 64;

interface GatherScrollViewProps extends Omit<ScrollViewProps, 'refreshControl' | 'onScroll'> {
  refreshing: boolean;
  onRefresh: () => void;
  children: ReactNode;
}

export function GatherScrollView({ refreshing, onRefresh, children, ...rest }: GatherScrollViewProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pull = useSharedValue(0);
  const busy = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    busy.value = refreshing ? 1 : 0;
    if (refreshing && !reduced) {
      spin.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(spin);
      spin.value = 0;
    }
  }, [refreshing, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = useAnimatedScrollHandler((e) => {
    pull.value = Math.max(0, -e.contentOffset.y);
  });

  // Android has no overscroll to follow, so there the mark only appears,
  // gathered, while refreshing.
  const progress = (): number => {
    'worklet';
    return Math.max(busy.value, Math.min(1, pull.value / THRESHOLD));
  };

  const markStyle = useAnimatedStyle(() => ({
    opacity: busy.value ? 1 : interpolate(pull.value, [6, 30], [0, 1], 'clamp'),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + 0.7 * progress(),
    transform: [{ rotate: `${spin.value}deg` }],
  }));
  return (
    <View className="flex-1">
      <Animated.View
        pointerEvents="none"
        className="absolute top-0 left-0 right-0 items-center justify-center"
        style={[{ height: LIST_HEADER }, markStyle]}
      >
        <View style={{ width: 38, height: 38 }}>
          <Animated.View style={[{ position: 'absolute', inset: 0 } as object, ringStyle]}>
            <Svg width={38} height={38} viewBox="0 0 38 38">
              <Circle cx={19} cy={19} r={15} fill="none" stroke={c.node} strokeWidth={2} strokeDasharray="3 8" strokeLinecap="round" />
            </Svg>
          </Animated.View>
          {!reduced && (
            <>
              <ListFragment index={0} pull={pull} busy={busy} color={c.accent} />
              <ListFragment index={1} pull={pull} busy={busy} color={c.warning} />
              <ListFragment index={2} pull={pull} busy={busy} color={c.danger} />
            </>
          )}
        </View>
        <Animated.Text className="font-body font-semibold text-[8.5px] tracking-[0.2em] uppercase mt-1" style={{ color: c.muted }}>
          {refreshing ? t('common.gathering') : t('common.pull_to_refresh')}
        </Animated.Text>
      </Animated.View>
      <Animated.ScrollView
        {...rest}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
          />
        }
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

function ListFragment({ index, pull, busy, color }: { index: number; pull: SharedValue<number>; busy: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = Math.max(busy.value, Math.min(1, pull.value / THRESHOLD));
    const [sx, sy] = SCATTER[index];
    const [dx, dy] = DEST[index];
    return {
      opacity: 0.35 + 0.65 * p,
      transform: [
        { translateX: sx + (dx - sx) * p },
        { translateY: sy + (dy - sy) * p },
        { scale: 0.6 + 0.4 * p },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full"
      style={[{ width: 9, height: 9, left: '50%', top: '50%', marginLeft: -4.5, marginTop: -4.5, backgroundColor: color }, style]}
    />
  );
}
