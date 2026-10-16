import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Countdown ──────────────────────────────────────────────────
// Deadline widget. The brick arc drains toward the due date — urgency
// without alarm. Source: "Opas Motion — Loaders.dc.html".

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VB = 132;
const R = 42;
const CIRC = 2 * Math.PI * R; // ≈ 264

interface CountdownRingProps {
  /** Days remaining until the deadline. */
  days: number;
  /** Total window the arc represents full (default 30). */
  total?: number;
  size?: number;
  label?: string;
}

export function CountdownRing({ days, total = 30, size = 132, label = 'days to reply' }: CountdownRingProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const progress = useSharedValue(1); // 1 = full, 0 = depleted

  const target = Math.max(0, Math.min(1, days / total));
  useEffect(() => {
    progress.value = reduced
      ? target
      : withTiming(target, { duration: 900, easing: Easing.bezier(0.5, 0, 0.6, 1) });
  }, [target, reduced]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.value),
  }));

  // Urgency color: pine when plenty of time, ochre closing in, brick when tight.
  const stroke = days <= 3 ? c.danger : days <= 7 ? c.warning : c.accent;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={VB / 2} cy={VB / 2} r={R} fill="none" stroke={c.muted} strokeWidth={8} strokeOpacity={0.25} />
        <AnimatedCircle
          cx={VB / 2}
          cy={VB / 2}
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animatedProps={animatedProps}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="font-display text-[34px] leading-none" style={{ color: c.fg }}>
          {days}
        </Text>
        <Text
          className="font-body font-semibold text-label tracking-[0.2em] uppercase mt-1"
          style={{ color: stroke }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
