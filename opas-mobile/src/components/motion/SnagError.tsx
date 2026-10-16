import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Snag ───────────────────────────────────────────────────────
// Recognition failed. The record gives one apologetic shake, never a red
// wall — with two calm ways forward. Source: "Opas Motion — Loaders.dc.html".

interface SnagErrorProps {
  title?: string;
  body?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function SnagError({
  title = "Couldn't read this one",
  body = "The photo's a little blurry — a clearer shot will do it.",
  primaryLabel = 'Retake photo',
  secondaryLabel = 'Enter by hand',
  onPrimary,
  onSecondary,
}: SnagErrorProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    // One apologetic shake every ~3.4s.
    shake.value = withRepeat(
      withDelay(
        2600,
        withSequence(
          withTiming(-4, { duration: 60 }),
          withTiming(4, { duration: 60 }),
          withTiming(-2, { duration: 60 }),
          withTiming(0, { duration: 60 }),
        ),
      ),
      -1,
      false,
    );
    blink.value = withRepeat(withSequence(withTiming(0.55, { duration: 800 }), withTiming(1, { duration: 800 })), -1, false);
  }, [reduced]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  return (
    <View className="items-center gap-4 py-6">
      <Animated.View
        style={[
          {
            width: 96,
            height: 118,
            borderRadius: 9,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: `${c.danger}66`,
            padding: 14,
          },
          cardStyle,
        ]}
      >
        <View style={{ height: 5, width: '70%', borderRadius: 3, backgroundColor: c.muted, opacity: 0.5 }} />
        <View style={{ height: 5, width: '52%', borderRadius: 3, backgroundColor: c.muted, opacity: 0.35, marginTop: 8 }} />
        <View style={{ height: 5, width: '64%', borderRadius: 3, backgroundColor: c.muted, opacity: 0.35, marginTop: 8 }} />
        <Animated.View
          style={[
            {
              position: 'absolute',
              right: -11,
              bottom: -11,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: c.danger,
              alignItems: 'center',
              justifyContent: 'center',
            },
            badgeStyle,
          ]}
        >
          <Text className="font-display" style={{ fontSize: 20, color: c.bg, lineHeight: 22 }}>
            !
          </Text>
        </Animated.View>
      </Animated.View>

      <View className="items-center">
        <Text className="font-display text-[14px]" style={{ color: c.fg }}>
          {title}
        </Text>
        <Text className="font-body text-[11.5px] leading-[1.5] text-center mt-0.5 max-w-[220px]" style={{ color: c.muted }}>
          {body}
        </Text>
      </View>

      <View className="flex-row gap-2">
        <Pressable onPress={onPrimary} className="rounded-[9px] px-3.5 py-2" style={{ backgroundColor: c.accent }}>
          <Text className="font-body font-semibold text-label tracking-[0.14em] uppercase" style={{ color: c['on-accent'] }}>
            {primaryLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onSecondary}
          className="rounded-[9px] px-3.5 py-2"
          style={{ borderWidth: 1, borderColor: `${c.muted}55` }}
        >
          <Text className="font-body font-semibold text-label tracking-[0.14em] uppercase" style={{ color: c['fg-soft'] }}>
            {secondaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
