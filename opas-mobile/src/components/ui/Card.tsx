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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 150, easing: easeOutQuart }); }}
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
      <Text className="text-heading-m text-fg mt-1 mb-1">{title}</Text>
      {description && (
        <Text className="text-body-sm text-muted leading-[1.6] mb-2">{description}</Text>
      )}
      {meta && (
        <Text className="text-caption text-muted">{meta}</Text>
      )}
      {children}
    </>
  );

  if (interactive && onPress) {
    return (
      <AnimatedPressable onPress={onPress} className="bg-surface border border-border rounded-md p-4">
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View className="bg-surface border border-border rounded-md p-4">
      {content}
    </View>
  );
}

interface DocCardProps {
  icon: string;
  title: string;
  subtitle: string;
  deadline?: string;
  deadlineUrgent?: boolean;
  badge?: { label: string; variant?: 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
  onPress?: () => void;
}

export function DocCard({ icon, title, subtitle, deadline, deadlineUrgent, badge: badgeProp, onPress }: DocCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 150, easing: easeOutQuart }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: easeOutQuart }); }}
        className="flex-row items-center gap-3 bg-surface border border-border rounded-md p-3"
      >
        <View className="w-9 h-9 rounded-sm bg-accent-dim items-center justify-center flex-shrink-0">
          <Text className="text-base">{icon}</Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-[13px] font-semibold text-fg mb-0.5" numberOfLines={1}>{title}</Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>{subtitle}</Text>
        </View>
        {deadline && (
          <Text className={`text-[11px] font-medium flex-shrink-0 ${deadlineUrgent ? 'text-danger' : 'text-warning'}`}>
            {deadline}
          </Text>
        )}
        {badgeProp && (
          <Badge variant={badgeProp.variant ?? 'neutral'}>{badgeProp.label}</Badge>
        )}
      </Pressable>
    </Animated.View>
  );
}