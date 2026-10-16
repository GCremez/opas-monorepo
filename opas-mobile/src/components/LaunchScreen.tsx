import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  useReducedMotion,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../store/themeStore';
import { easing, ring as ringToken, spring as springTokens } from '../lib/motion';

// ── The Arrival ────────────────────────────────────────────────────
// App-launch splash. The dashed track sweeps in, then the three waypoints fly
// to their seats and settle with an overshoot — the Ring Path assembling
// itself before the wordmark rises. Source: "Opas Motion — Loaders.dc.html".

const VB = 140;
const LOGO_SIZE = 132;
const SCALE = LOGO_SIZE / VB;
const TRACK_R = ringToken.trackRadius; // 43
const TRACK_CIRC = 2 * Math.PI * TRACK_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Waypoint seats (viewBox coords) + fly-in offsets, straight from the token.
const SEATS = ringToken.waypoints.map((w) => ({
  ox: (w.cx - VB / 2) * SCALE, // seated offset from center, px
  oy: (w.cy - VB / 2) * SCALE,
  from: w.from,
  token: w.token as 'accent' | 'warning' | 'danger',
}));

function Waypoint({
  seat,
  color,
  seatV,
}: {
  seat: (typeof SEATS)[number];
  color: string;
  seatV: SharedValue<number>;
}) {
  const size = 14 * SCALE;
  const style = useAnimatedStyle(() => {
    const p = seatV.value; // 0 = scattered, 1 = seated
    return {
      opacity: interpolate(p, [0, 0.4, 1], [0, 1, 1]),
      transform: [
        { translateX: seat.ox + interpolate(p, [0, 1], [seat.from.x, 0]) },
        { translateY: seat.oy + interpolate(p, [0, 1], [seat.from.y, 0]) },
        { scale: interpolate(p, [0, 1], [0.35, 1]) },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full"
      style={[{ width: size, height: size, left: '50%', top: '50%', marginLeft: -size / 2, marginTop: -size / 2, backgroundColor: color }, style]}
    />
  );
}

export function LaunchScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const c = useThemeColors();

  const track = useSharedValue(0); // dashed track sweep-in
  const seats = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      track.value = 1;
      seats.forEach((s) => (s.value = 1));
      wordmark.value = 1;
      tagline.value = 1;
      return;
    }
    // 1 · track sweeps in
    track.value = withTiming(1, { duration: 620, easing: easing.settle });
    // 2 · waypoints fly to their seats with overshoot, staggered
    seats.forEach((s, i) => {
      s.value = withDelay(300 + i * 200, withSpring(1, springTokens.overshoot));
    });
    // 3 · wordmark + tagline rise
    wordmark.value = withDelay(1050, withTiming(1, { duration: 420, easing: easing.settle }));
    tagline.value = withDelay(1300, withTiming(1, { duration: 420, easing: easing.settle }));
  }, []);

  const trackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(track.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ rotate: `${interpolate(track.value, [0, 1], [-40, 0])}deg` }],
  }));
  const trackDashProps = useAnimatedProps(() => ({
    strokeDashoffset: TRACK_CIRC * (1 - track.value),
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [16, 0]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [12, 0]) }],
  }));

  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <View className="flex-1 items-center justify-center px-8">
        <View className="items-center justify-center" style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
          {/* Dashed track assembling */}
          <Animated.View style={[{ position: 'absolute', inset: 0 } as object, trackStyle]}>
            <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox={`0 0 ${VB} ${VB}`} fill="none">
              <Circle cx={70} cy={70} r={56} stroke={c.accent} strokeWidth={2} opacity={0.6} />
              <AnimatedCircle
                cx={70}
                cy={70}
                r={TRACK_R}
                stroke={c.node}
                strokeWidth={2.5}
                strokeDasharray="3 9"
                strokeLinecap="round"
                animatedProps={trackDashProps}
              />
            </Svg>
          </Animated.View>

          {/* Waypoints flying to their seats */}
          <Waypoint seat={SEATS[0]} color={c.accent} seatV={seats[0]} />
          <Waypoint seat={SEATS[1]} color={c.warning} seatV={seats[1]} />
          <Waypoint seat={SEATS[2]} color={c.danger} seatV={seats[2]} />
        </View>

        <Animated.View className="items-center mt-8 mb-3" style={wordmarkStyle}>
          <Text className="font-display text-[46px] text-fg tracking-[-0.02em] text-center">Opas</Text>
        </Animated.View>

        <Animated.View style={taglineStyle}>
          <Text className="font-serif-italic text-prose text-fg-soft max-w-[280px] text-center">
            Scan any official letter. Understand it in plain words.
          </Text>
        </Animated.View>
      </View>

      <View className="items-center" style={{ paddingBottom: insets.bottom + 40 }}>
        <Text className="font-mono text-meta text-muted tracking-[0.08em]">v1.0.0</Text>
      </View>
    </View>
  );
}
