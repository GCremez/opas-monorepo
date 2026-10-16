import { useEffect } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import Svg, { Line, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';
import { motionDuration, easing } from '../../lib/motion';

// ── The Passage ────────────────────────────────────────────────────
// Button submit. A waypoint travels the dashed track; on success the arrival
// check draws in. Source: "Opas Motion — Loaders.dc.html".

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type PassageState = 'idle' | 'processing' | 'done';

interface PassageButtonProps {
  label: string;
  processingLabel?: string;
  doneLabel?: string;
  state: PassageState;
  onPress?: () => void;
}

export function PassageButton({ label, processingLabel, doneLabel, state, onPress }: PassageButtonProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);

  const dot = useSharedValue(0); // 0→1 travel across track
  const check = useSharedValue(0); // 0→1 arrival check draw

  useEffect(() => {
    if (state === 'processing' && !reduced) {
      dot.value = 0;
      dot.value = withRepeat(withTiming(1, { duration: motionDuration.passage, easing: easing.track }), -1, false);
    }
    if (state === 'done') {
      check.value = reduced ? 1 : withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    } else {
      check.value = 0;
    }
  }, [state, reduced]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: state === 'processing' ? (dot.value < 0.06 || dot.value > 0.94 ? 0 : 1) : 0,
    transform: [{ translateX: (0.06 + dot.value * 0.88) * w - w / 2 }],
  }));

  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: 44 * (1 - check.value) }));

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const bg = state === 'done' ? c.accent : c.fg;
  const text =
    state === 'done' ? doneLabel ?? 'Filed · Arrived' : state === 'processing' ? processingLabel ?? label : label;

  return (
    <Pressable
      onPress={state === 'idle' ? onPress : undefined}
      onLayout={onLayout}
      className="h-[50px] rounded-[12px] overflow-hidden items-center justify-center flex-row gap-2"
      style={{ backgroundColor: bg }}
    >
      {/* Dashed track — only while processing */}
      {state === 'processing' && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <Svg width={w} height={50} viewBox={`0 0 ${w} 50`} fill="none">
            <Line
              x1={16}
              y1={25}
              x2={w - 16}
              y2={25}
              stroke={c.node}
              strokeWidth={2}
              strokeDasharray="3 9"
              strokeLinecap="round"
              strokeOpacity={0.55}
            />
          </Svg>
          <Animated.View
            pointerEvents="none"
            className="absolute rounded-full"
            style={[{ width: 10, height: 10, backgroundColor: c.warning }, dotStyle]}
          />
        </View>
      )}

      {/* Arrival check — on success */}
      {state === 'done' && (
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
          <AnimatedPath
            d="M4 12.5 L10 18 L20 6"
            stroke={c['on-accent']}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={44}
            animatedProps={checkProps}
          />
        </Svg>
      )}

      <Text
        className="font-body font-semibold text-label tracking-[0.16em] uppercase"
        style={{ color: state === 'done' ? c['on-accent'] : c.bg }}
      >
        {text}
      </Text>
    </Pressable>
  );
}
