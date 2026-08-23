import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';
import { easing } from '../../lib/motion';

// ── The Assembly ───────────────────────────────────────────────────
// Save / upload state. Scattered fragments float in and stack into a
// finished record. Source: "Opas Motion — Loaders.dc.html".

const CYCLE = 2800;

interface Shard {
  from: { x: number; y: number; r: number };
  w: number;
  h: number;
  left: number;
  top: number;
  bg: keyof ReturnType<typeof useShardColors>['map'];
  delay: number;
  top_card?: boolean;
}

function useShardColors() {
  const c = useThemeColors();
  return { map: { back: c.surface, mid: c.bg, front: c.bg } as const, c };
}

function ShardView({ shard, children }: { shard: Shard; children?: ReactNode }) {
  const { map, c } = useShardColors();
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    t.value = withDelay(shard.delay, withRepeat(withTiming(1, { duration: CYCLE, easing: easing.settle }), -1, false));
  }, [reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.6, 1], [0, 1, 1]),
    transform: [
      { translateX: interpolate(t.value, [0, 1], [shard.from.x, 0]) },
      { translateY: interpolate(t.value, [0, 1], [shard.from.y, 0]) },
      { rotate: `${interpolate(t.value, [0, 1], [shard.from.r, 0])}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: shard.left,
          top: shard.top,
          width: shard.w,
          height: shard.h,
          borderRadius: 9,
          backgroundColor: map[shard.bg],
          borderWidth: 1,
          borderColor: `${c.muted}33`,
          padding: shard.top_card ? 14 : 0,
          ...(shard.top_card
            ? { shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } }
            : null),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function AssemblyLoader({ size = 150 }: { size?: number }) {
  const c = useThemeColors();
  const scale = size / 150;

  const shards: Shard[] = [
    { from: { x: -46, y: 34, r: -11 }, w: 104, h: 126, left: 8, top: 22, bg: 'back', delay: 0 },
    { from: { x: 52, y: -18, r: 9 }, w: 110, h: 132, left: 4, top: 12, bg: 'mid', delay: 220 },
    { from: { x: -30, y: -40, r: 7 }, w: 118, h: 140, left: 0, top: 0, bg: 'front', delay: 440, top_card: true },
  ];

  return (
    <View style={{ width: 120 * scale, height: size, transform: [{ scale }] }}>
      <View style={{ width: 120, height: 150 }}>
        <ShardView shard={shards[0]} />
        <ShardView shard={shards[1]} />
        <ShardView shard={shards[2]}>
          <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: c.accent }} />
          <View style={{ height: 7, width: '70%', borderRadius: 4, backgroundColor: c.muted, opacity: 0.4, marginTop: 14 }} />
          <View style={{ height: 7, width: '52%', borderRadius: 4, backgroundColor: c.muted, opacity: 0.25, marginTop: 9 }} />
          <View style={{ height: 7, width: '60%', borderRadius: 4, backgroundColor: c.muted, opacity: 0.25, marginTop: 9 }} />
        </ShardView>
      </View>
    </View>
  );
}
