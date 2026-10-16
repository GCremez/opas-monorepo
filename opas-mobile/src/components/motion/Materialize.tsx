import { useEffect, type ReactNode } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { motionDuration, easing, reducedFallback } from '../../lib/motion';

// ── Home materialise ───────────────────────────────────────────────
// Cards don't pop — they surface out of the bottom, staggered top to
// first-fold. (Real blur is costly on RN, so we lean on opacity + rise, the
// closest faithful reading.) Source: "Opas Motion — Loaders.dc.html".

interface MaterializeProps {
  children: ReactNode;
  /** Sibling index — multiplies the stagger delay. */
  index?: number;
  /** Extra delay in ms before this element's own stagger. */
  delay?: number;
  className?: string;
}

export function Materialize({ children, index = 0, delay = 0, className }: MaterializeProps) {
  const reduced = useReducedMotion();
  const v = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      v.value = withTiming(1, { duration: reducedFallback.crossFade });
      return;
    }
    v.value = withDelay(
      delay + index * motionDuration.stagger,
      withTiming(1, { duration: motionDuration.materialize, easing: easing.settle }),
    );
  }, [reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 10 }],
  }));

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}
