import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  interpolate,
  interpolateColor,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Scan ───────────────────────────────────────────────────────
// Camera capture. A reading line sweeps the photographed letter; each line
// lights as it's recognised. Source: "Opas Motion — Loaders.dc.html".

const CYCLE = 2600;
const CARD_W = 132;
const CARD_H = 168;

function ScanRow({ width, delay }: { width: string; delay: number }) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [reduced]);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [`${c.muted}33`, c.accent]),
  }));
  return <Animated.View style={[{ height: 6, width: width as `${number}%`, borderRadius: 3, marginTop: 8 }, style]} />;
}

function Corner({ pos, delay }: { pos: 'tl' | 'tr' | 'bl' | 'br'; delay: number }) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const t = useSharedValue(0.4);
  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: CYCLE / 2 }), -1, true));
  }, [reduced]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + t.value * 0.6 }));
  const base: Record<string, number | undefined> = {
    top: pos[0] === 't' ? 8 : undefined,
    bottom: pos[0] === 'b' ? 8 : undefined,
    left: pos[1] === 'l' ? 8 : undefined,
    right: pos[1] === 'r' ? 8 : undefined,
  };
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 14,
          height: 14,
          borderColor: c.warning,
          borderTopWidth: pos[0] === 't' ? 2 : 0,
          borderBottomWidth: pos[0] === 'b' ? 2 : 0,
          borderLeftWidth: pos[1] === 'l' ? 2 : 0,
          borderRightWidth: pos[1] === 'r' ? 2 : 0,
          ...base,
        },
        style,
      ]}
    />
  );
}

export function ScanLoader() {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    sweep.value = withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [reduced]);

  const lineStyle = useAnimatedStyle(() => ({
    top: interpolate(sweep.value, [0, 1], [CARD_H * 0.14, CARD_H * 0.86]),
    opacity: interpolate(sweep.value, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
  }));

  return (
    <View
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 9,
        backgroundColor: c.surface,
        overflow: 'hidden',
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 14 },
      }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: c.accent }} />
      <ScanRow width="74%" delay={100} />
      <ScanRow width="88%" delay={350} />
      <ScanRow width="56%" delay={600} />
      <ScanRow width="80%" delay={850} />
      <ScanRow width="48%" delay={1100} />

      {!reduced && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: c.warning,
              shadowColor: c.warning,
              shadowOpacity: 0.7,
              shadowRadius: 8,
            },
            lineStyle,
          ]}
        />
      )}

      <Corner pos="tl" delay={0} />
      <Corner pos="tr" delay={150} />
      <Corner pos="bl" delay={300} />
      <Corner pos="br" delay={450} />
    </View>
  );
}
