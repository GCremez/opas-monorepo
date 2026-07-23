import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  useReducedMotion,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { easeOutQuart } from './ui/animation';
import { useThemeColors } from '../store/themeStore';

const LOGO_SIZE = 88;
const HALF = LOGO_SIZE / 2;

const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);

interface Particle {
  x: number;
  y: number;
  r: number;
  delay: number;
}

const PARTICLES: Particle[] = [
  { x: 100, y: -10, r: 2.5, delay: 0 },
  { x: 75, y: -80, r: 2, delay: 50 },
  { x: -30, y: -95, r: 2, delay: 90 },
  { x: -95, y: -40, r: 1.5, delay: 30 },
  { x: -90, y: 45, r: 2.5, delay: 70 },
  { x: -35, y: 95, r: 2, delay: 110 },
  { x: 45, y: 85, r: 2, delay: 40 },
  { x: 105, y: 40, r: 1.5, delay: 80 },
  { x: 60, y: -60, r: 1.5, delay: 60 },
  { x: -70, y: -60, r: 1.5, delay: 100 },
  { x: -60, y: 70, r: 1.5, delay: 20 },
  { x: 70, y: 65, r: 1.5, delay: 120 },
];

const SHOCK_RINGS = [
  { r: 30, w: 2, delay: 120 },
  { r: 50, w: 1, delay: 60 },
];

function ParticleView({ p }: { p: Particle }) {
  const fly = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    fly.value = withDelay(p.delay, withTiming(1, { duration: 500, easing: easeOutExpo }));
    fade.value = withDelay(p.delay, withTiming(1, { duration: 400, easing: easeOutQuart }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(fade.value, [0, 0.5, 1], [0.8, 0.4, 0]),
    transform: [
      { translateX: interpolate(fly.value, [0, 1], [0, p.x]) },
      { translateY: interpolate(fly.value, [0, 1], [0, p.y]) },
    ],
  }));

  return (
    <Animated.View
      className="absolute rounded-full bg-accent"
      style={[{ width: p.r * 2, height: p.r * 2, left: HALF - p.r, top: HALF - p.r }, style]}
      pointerEvents="none"
    />
  );
}

function ShockwaveRing({ ring, color }: { ring: { r: number; w: number; delay: number }; color: string }) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(ring.delay, withTiming(1, { duration: 600, easing: easeOutExpo }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(anim.value, [0, 0.4, 1], [0.6, 0.3, 0]),
    transform: [{ scale: interpolate(anim.value, [0, 1], [0.2, 2.0]) }],
  }));

  return (
    <Animated.View
      className="absolute"
      style={[{ width: LOGO_SIZE, height: LOGO_SIZE }, style]}
      pointerEvents="none"
    >
      <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 140 140" fill="none">
        <Circle cx="70" cy="70" r={ring.r} stroke={color} strokeWidth={ring.w} opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}

export function LaunchScreen() {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const c = useThemeColors();

  const ignition = useSharedValue(0);
  const flash = useSharedValue(0);
  const flashFade = useSharedValue(0);
  const logoScale = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const tagline = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      ignition.value = 1;
      flash.value = 1;
      flashFade.value = 0;
      logoScale.value = 1;
      wordmark.value = 1;
      tagline.value = 1;
      return;
    }

    ignition.value = withDelay(80, withTiming(1, { duration: 120, easing: easeOutQuart }));

    flash.value = withDelay(200, withTiming(1, { duration: 200, easing: easeOutExpo }));
    flashFade.value = withDelay(200, withTiming(1, { duration: 200, easing: easeOutQuart }));

    logoScale.value = withDelay(
      380,
      withSpring(1, { damping: 10, stiffness: 95, mass: 0.25 }),
    );

    wordmark.value = withDelay(750, withTiming(1, { duration: 400, easing: easeOutQuart }));
    tagline.value = withDelay(1000, withTiming(1, { duration: 400, easing: easeOutQuart }));
  }, []);

  const ignitionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ignition.value, [0, 1], [0, 0.9]),
    transform: [{ scale: interpolate(ignition.value, [0, 1], [0, 0.5]) }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flashFade.value, [0, 0.3, 1], [1, 0.4, 0]),
    transform: [{ scale: interpolate(flash.value, [0, 1], [0.3, 3.5]) }],
  }));

  const logoAnimated = useAnimatedStyle(() => ({
    opacity: interpolate(logoScale.value, [0, 0.2, 1], [0, 0, 1]),
    transform: [{ scale: logoScale.value }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : wordmark.value,
    transform: [{ translateY: reduced ? 0 : interpolate(wordmark.value, [0, 1], [28, 0]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : tagline.value,
    transform: [{ translateY: reduced ? 0 : interpolate(tagline.value, [0, 1], [20, 0]) }],
  }));

  return (
    <View className="flex-1 bg-bg items-center justify-center">
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="items-center justify-center"
          style={{ width: LOGO_SIZE + 60, height: LOGO_SIZE + 60 }}
        >
          {!reduced && (
            <>
              {PARTICLES.map((p, i) => (
                <ParticleView key={i} p={p} />
              ))}
              {SHOCK_RINGS.map((ring, i) => (
                <ShockwaveRing key={i} ring={ring} color={c.accent} />
              ))}
            </>
          )}

          <Animated.View
            className="absolute rounded-full bg-accent"
            style={[{ width: 8, height: 8 }, ignitionStyle]}
            pointerEvents="none"
          />

          <Animated.View
            className="absolute rounded-full"
            style={[{ width: LOGO_SIZE + 20, height: LOGO_SIZE + 20 }, flashStyle]}
            pointerEvents="none"
          >
            <View className="flex-1 rounded-full bg-accent/40" />
          </Animated.View>

          <Animated.View style={[{ width: LOGO_SIZE, height: LOGO_SIZE }, logoAnimated]}>
            <Svg width={LOGO_SIZE} height={LOGO_SIZE} viewBox="0 0 140 140" fill="none">
              <Circle cx="70" cy="70" r="56" stroke={c.accent} strokeWidth={2} />
              <Circle
                cx="70" cy="70" r="43" stroke={c.node} strokeWidth={2.5}
                strokeDasharray="8.5 9" strokeLinecap="round"
              />
              <Circle
                cx="70" cy="70" r="43" stroke={c.accent} strokeWidth={3}
                strokeDasharray="70 200" strokeDashoffset="-150" strokeLinecap="round"
              />
              <Circle cx="40" cy="52" r="9.5" fill={c.node} />
              <Circle cx="96" cy="44" r="9.5" fill={c.accent} />
              <Circle cx="82" cy="98" r="10.5" fill={c.warning} />
              <Path
                d="M90 104 L82 115 L74 104" stroke={c.warning}
                strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View className="items-center mt-7 mb-3" style={wordmarkStyle}>
          <Text className="font-display text-[46px] text-fg tracking-[-0.02em] text-center">
            Opas
          </Text>
        </Animated.View>

        <Animated.View style={taglineStyle}>
          <Text className="font-serif-italic text-prose text-fg-soft max-w-[280px] text-center">
            Scan any official letter. Understand it in plain words.
          </Text>
        </Animated.View>
      </View>

      <View className="items-center" style={{ paddingBottom: insets.bottom + 40 }}>
        <Text className="font-mono text-[11px] text-muted tracking-[0.08em]">
          v2.0.0
        </Text>
      </View>
    </View>
  );
}
