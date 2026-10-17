import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../store/themeStore';

// ── The Plain Words ────────────────────────────────────────────────
// Explanation state. The plain-language summary types itself in behind a
// blinking caret. Source: "Opas Motion — Loaders.dc.html".

interface StreamingTextProps {
  /** Full text to reveal. */
  text: string;
  /** When false the caret stops and the whole text is shown (stream done). */
  streaming?: boolean;
  className?: string;
}

function Caret({ color }: { color: string }) {
  const reduced = useReducedMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    blink.value = withRepeat(withTiming(0, { duration: 500, easing: Easing.steps(1) }), -1, true);
  }, [reduced]);
  const style = useAnimatedStyle(() => ({ opacity: reduced ? 1 : blink.value }));
  return (
    <Animated.View style={[{ width: 2, height: 16, backgroundColor: color, marginLeft: 1 }, style]} />
  );
}

export function StreamingText({ text, streaming = true, className = '' }: StreamingTextProps) {
  const c = useThemeColors();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced || !streaming ? text : '');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (reduced || !streaming) {
      setShown(text);
      return;
    }
    let i = 0;
    const type = () => {
      i++;
      setShown(text.slice(0, i));
      if (i < text.length) timer.current = setTimeout(type, 24 + Math.random() * 34);
    };
    setShown('');
    type();
    return () => clearTimeout(timer.current);
  }, [text, streaming, reduced]);

  const done = shown.length >= text.length;

  return (
    <View className="flex-row flex-wrap items-baseline">
      <Text className={`font-serif flex-shrink ${className}`}>{shown}</Text>
      {streaming && !done && <Caret color={c.warning} />}
    </View>
  );
}
