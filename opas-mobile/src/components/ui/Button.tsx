import * as React from 'react';
import { Text, Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { easeOutQuart } from './animation';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-accent', text: 'text-black', border: 'border-accent' },
  secondary: { bg: 'bg-surface-2', text: 'text-fg', border: 'border-border' },
  outline: { bg: 'bg-transparent', text: 'text-fg', border: 'border-border' },
  ghost: { bg: 'bg-transparent', text: 'text-muted', border: 'border-transparent' },
  danger: { bg: 'bg-danger', text: 'text-white', border: 'border-danger' },
};

const sizeStyles: Record<ButtonSize, { padding: string; text: string; iconSize: number }> = {
  sm: { padding: 'px-3 py-1', text: 'text-[13px]', iconSize: 16 },
  md: { padding: 'px-5 py-3', text: 'text-body', iconSize: 18 },
  lg: { padding: 'px-6 py-4', text: 'text-[16px]', iconSize: 20 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  iconLeft,
  iconRight,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const scale = useSharedValue(1);
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => { scale.value = withTiming(0.96, { duration: 150, easing: easeOutQuart }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: easeOutQuart }); }}
        className={`
          rounded-md flex-row items-center justify-center gap-2
          min-h-touch ${s.padding} ${v.bg} ${v.border} border
          ${block ? 'w-full' : ''}
          ${disabled || loading ? 'opacity-40' : ''}
          ${className}
        `}
        style={style}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? '#000' : '#f5f5f7'}
          />
        ) : (
          <>
            {iconLeft}
            {typeof children === 'string' ? (
              <Text className={`font-body font-medium leading-none ${s.text} ${v.text}`}>
                {children}
              </Text>
            ) : (
              children
            )}
            {iconRight}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}