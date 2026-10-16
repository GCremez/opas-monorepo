import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withTiming,
  interpolate,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Redaction ──────────────────────────────────────────────────
// Skeleton for a decoding record. A dark bar sweeps each line left-to-right,
// leaving the fact behind. Source: "Opas Motion — Loaders.dc.html".

const CYCLE = 2400;

/** A line of text whose fact is revealed as a dark bar sweeps across it. */
function RedactLine({ children, delay }: { children: string; delay: number }) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      t.value = 1;
      return;
    }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.inOut(Easing.ease) }), -1, false),
    );
  }, [reduced]);

  // Bar: enters from left (-108%), holds at 0, exits right (108%).
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${interpolate(t.value, [0, 0.46, 0.54, 1], [-108, 0, 0, 108])}%` }],
  }));
  // Text: transparent until the bar has passed (~0.5), then solid.
  const textStyle = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.5, 0.7], [0, 0, 1]) }));

  return (
    <View className="relative overflow-hidden rounded-[5px]">
      <Animated.Text className="font-body text-[12.5px] leading-[1.7]" style={[{ color: c['fg-soft'] }, textStyle]}>
        {children}
      </Animated.Text>
      {!reduced && (
        <Animated.View style={[{ position: 'absolute', top: -2, bottom: -2, left: 0, right: 0, backgroundColor: c.fg }, barStyle]} />
      )}
    </View>
  );
}

interface RedactionSkeletonProps {
  title?: string;
  status?: string;
  lines?: string[];
}

export function RedactionSkeleton({
  title = 'Verotoimisto · Tax office',
  status = 'DECODING…',
  lines = ['Deadline for response · 14 days', 'Amount due · €248,00', 'Reference · 1839 5520 0041'],
}: RedactionSkeletonProps) {
  const c = useThemeColors();

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: c.surface }} />
        <View className="flex-1">
          <Text className="font-display text-[13px]" style={{ color: c.fg }}>
            {title}
          </Text>
          <Text className="font-mono text-meta mt-0.5" style={{ color: c.muted }}>
            {status}
          </Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: c.muted, opacity: 0.2 }} />
      {lines.map((line, i) => (
        <RedactLine key={i} delay={280 + i * 160}>
          {line}
        </RedactLine>
      ))}
    </View>
  );
}
