import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Circle, Line } from 'react-native-svg';
import { Button } from '../ui/Button';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Empty Record ───────────────────────────────────────────────
// First-run state. A dashed folder breathes with the logo mark inside — an
// invitation, not a void. Source: "Opas Motion — Loaders.dc.html".

interface EmptyRecordProps {
  title?: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
}

export function EmptyRecord({
  title = 'No letters yet',
  body = 'Snap the next envelope Finland sends you — Opas keeps the whole record here.',
  cta = 'Add your first letter',
  onPress,
}: EmptyRecordProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    float.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [reduced]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * float.value }, { rotate: '-3deg' }],
  }));

  return (
    <View className="items-center justify-center gap-5 py-6 w-full">
      <Animated.View style={floatStyle}>
        <Svg width={108} height={128} viewBox="0 0 108 128" fill="none">
          <Rect x={7} y={7} width={94} height={114} rx={10} stroke={c.node} strokeWidth={2} strokeDasharray="7 8" />
          <Circle cx={54} cy={52} r={19} stroke={c.accent} strokeWidth={2} />
          <Circle cx={54} cy={52} r={13} stroke={c.node} strokeWidth={2} strokeDasharray="2.5 7" strokeLinecap="round" />
          <Circle cx={54} cy={38} r={3.5} fill={c.accent} />
          <Circle cx={66} cy={60} r={3.5} fill={c.warning} />
          <Circle cx={42} cy={60} r={3.5} fill={c.danger} />
          <Line x1={34} y1={90} x2={74} y2={90} stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.6} />
          <Line x1={40} y1={102} x2={68} y2={102} stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.4} />
        </Svg>
      </Animated.View>

      <View className="items-center">
        <Text className="font-display text-[15px]" style={{ color: c.fg }}>
          {title}
        </Text>
        <Text className="font-body text-[11.5px] leading-[1.5] text-center mt-1 max-w-[240px]" style={{ color: c.muted }}>
          {body}
        </Text>
      </View>

      {onPress ? (
        <Button
          variant="primary"
          onPress={onPress}
          iconLeft={
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Line x1={12} y1={5} x2={12} y2={19} stroke={c['on-accent']} strokeWidth={2.4} strokeLinecap="round" />
              <Line x1={5} y1={12} x2={19} y2={12} stroke={c['on-accent']} strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          }
        >
          {cta}
        </Button>
      ) : null}
    </View>
  );
}
