import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { easeOutQuart } from './animation';
import { Badge } from './Badge';

interface CardProps {
  badge?: string;
  title: string;
  description?: string;
  meta?: string;
  interactive?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

function AnimatedPressable({ onPress, children, className }: { onPress?: () => void; children: React.ReactNode; className?: string }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.98, { duration: 150, easing: easeOutQuart }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: easeOutQuart }); }}
        className={className}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function Card({ badge, title, description, meta, interactive, onPress, children }: CardProps) {
  const content = (
    <>
      {badge && <Badge variant="accent">{badge}</Badge>}
      <Text className="font-display text-heading text-fg mt-1 mb-1">{title}</Text>
      {description && (
        <Text className="font-serif text-prose text-fg-soft mb-2">{description}</Text>
      )}
      {meta && <Text className="font-mono text-[11px] text-muted">{meta}</Text>}
      {children}
    </>
  );

  if (interactive && onPress) {
    return (
      <AnimatedPressable onPress={onPress} className="bg-surface rounded-lg p-4">
        {content}
      </AnimatedPressable>
    );
  }

  return <View className="bg-surface rounded-lg p-4">{content}</View>;
}

interface DocCardProps {
  icon?: string;
  title: string;
  subtitle: string;
  deadline?: string;
  deadlineUrgent?: boolean;
  badge?: { label: string; variant?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
  onPress?: () => void;
}

// v2 document row — hairline-ruled, name + mono meta, no boxed card.
export function DocCard({ title, subtitle, deadline, deadlineUrgent, badge: badgeProp, onPress }: DocCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.99, { duration: 150, easing: easeOutQuart }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: easeOutQuart }); }}
        className="flex-row items-center gap-3 py-3.5 border-b border-hairline"
      >
        <View className="flex-1 min-w-0">
          <Text className="font-medium text-body text-fg" numberOfLines={1}>{title}</Text>
          <Text className="font-mono text-[10px] tracking-[0.04em] uppercase text-muted mt-1" numberOfLines={1}>{subtitle}</Text>
        </View>
        {deadline && (
          <Text className={`font-mono-medium text-data ${deadlineUrgent ? 'text-danger' : 'text-warning'}`}>
            {deadline}
          </Text>
        )}
        {badgeProp && <Badge variant={badgeProp.variant ?? 'neutral'}>{badgeProp.label}</Badge>}
      </Pressable>
    </Animated.View>
  );
}
