import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';
import { motionDuration, easing, ring, reducedFallback } from '../../lib/motion';

// ── The Orbit ──────────────────────────────────────────────────────
// Full-page loader. Three waypoints circle a dashed track around a pulsing
// core — the brand mark, animated. Source: "Opas Motion — Loaders.dc.html".

const VB = 132; // viewBox the geometry is authored in
const CENTER = VB / 2;
const RING_R = 52; // outer hairline ring
const TRACK_R = 40; // dashed waypoint track
const CORE = 14;
const DOT = 13;

interface OrbitLoaderProps {
  /** Rendered diameter in px. */
  size?: number;
  label?: string;
}

/** One waypoint orbiting the track, seated `angleOffset` degrees apart. */
function Waypoint({
  angleOffset,
  color,
  scale,
  spin,
}: {
  angleOffset: number;
  color: string;
  scale: number;
  spin: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const rad = ((spin.value + angleOffset) * Math.PI) / 180;
    const r = TRACK_R * scale;
    return {
      transform: [
        { translateX: Math.cos(rad) * r },
        { translateY: Math.sin(rad) * r },
      ],
    };
  });
  const d = DOT * scale;
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-full"
      style={[
        { width: d, height: d, backgroundColor: color, left: '50%', top: '50%', marginLeft: -d / 2, marginTop: -d / 2 },
        style,
      ]}
    />
  );
}

export function OrbitLoader({ size = 88, label }: OrbitLoaderProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const scale = size / VB;

  const spin = useSharedValue(0); // waypoint orbit angle, deg
  const ringSpin = useSharedValue(0); // slow dashed-ring rotation, deg
  const core = useSharedValue(1); // core pulse scale
  const fade = useSharedValue<number>(reduced ? reducedFallback.pulseOpacity[1] : 1);

  useEffect(() => {
    if (reduced) {
      // No travel / overshoot — just a quiet "working" opacity pulse.
      fade.value = withRepeat(
        withSequence(
          withTiming(reducedFallback.pulseOpacity[0], { duration: reducedFallback.pulseDuration / 2 }),
          withTiming(reducedFallback.pulseOpacity[1], { duration: reducedFallback.pulseDuration / 2 }),
        ),
        -1,
        true,
      );
      return;
    }
    spin.value = withRepeat(
      withTiming(360, { duration: motionDuration.orbit, easing: easing.track }),
      -1,
      false,
    );
    ringSpin.value = withRepeat(
      withTiming(360, { duration: motionDuration.orbit * 3.4, easing: easing.linear }),
      -1,
      false,
    );
    core.value = withRepeat(
      withSequence(
        withTiming(ring.pulseScale, { duration: motionDuration.orbit / 2, easing: easing.standard }),
        withTiming(1, { duration: motionDuration.orbit / 2, easing: easing.standard }),
      ),
      -1,
      false,
    );
  }, [reduced]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringSpin.value}deg` }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: core.value }],
    opacity: 0.9 - (core.value - 1) * 1.6, // brightest small, fades as it expands
  }));
  const wrapStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const coreSize = CORE * scale;

  return (
    <View className="items-center gap-4">
      <Animated.View style={[{ width: size, height: size }, wrapStyle]}>
        {/* Dashed track ring, slowly rotating */}
        <Animated.View style={[{ position: 'absolute', inset: 0 } as object, ringStyle]}>
          <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
            <Circle cx={CENTER} cy={CENTER} r={RING_R} fill="none" stroke={c.muted} strokeWidth={1.5} strokeOpacity={0.35} />
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={TRACK_R}
              fill="none"
              stroke={c.node}
              strokeWidth={2.5}
              strokeDasharray="3 9"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Three orbiting waypoints */}
        {!reduced && (
          <>
            <Waypoint angleOffset={-90} color={c.accent} scale={scale} spin={spin} />
            <Waypoint angleOffset={30} color={c.warning} scale={scale} spin={spin} />
            <Waypoint angleOffset={150} color={c.danger} scale={scale} spin={spin} />
          </>
        )}

        {/* Pulsing core */}
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full"
          style={[
            {
              width: coreSize,
              height: coreSize,
              backgroundColor: c.fg,
              left: '50%',
              top: '50%',
              marginLeft: -coreSize / 2,
              marginTop: -coreSize / 2,
            },
            coreStyle,
          ]}
        />
      </Animated.View>

      {label ? <Text className="font-body text-body-sm text-muted">{label}</Text> : null}
    </View>
  );
}
