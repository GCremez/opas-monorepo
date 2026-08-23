import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withDelay,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

// Three dots that wave — the "working" tail used by The Decode and inline
// processing states. Source: om-dotwave.

function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 560 }),
          withTiming(0, { duration: 840 }),
        ),
        -1,
        false,
      ),
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + v.value * 0.6,
    transform: [{ translateY: -6 * v.value }],
  }));
  return <Animated.View className="rounded-full" style={[{ width: 6, height: 6, backgroundColor: color }, style]} />;
}

export function DotWave({ color }: { color: string }) {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <View className="flex-row gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <View key={i} className="rounded-full" style={{ width: 6, height: 6, backgroundColor: color, opacity: 0.6 }} />
        ))}
      </View>
    );
  }
  return (
    <View className="flex-row gap-1.5 mt-1">
      <Dot delay={0} color={color} />
      <Dot delay={200} color={color} />
      <Dot delay={400} color={color} />
    </View>
  );
}
