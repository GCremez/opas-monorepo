import * as React from 'react';
import { Text, Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { easeOutQuart } from './animation';
import { useThemeColors } from '../../store/themeStore';

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

// v2 "Personal Record": primary is a pine pill; secondary/outline are
// hairline-ruled pills; ghost is bare. Labels are Instrument semibold.
const variantStyles: Record<ButtonVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-accent', text: 'text-on-accent', border: 'border-accent' },
  secondary: { bg: 'bg-surface', text: 'text-fg', border: 'border-hairline' },
  outline: { bg: 'bg-transparent', text: 'text-fg', border: 'border-rule' },
  ghost: { bg: 'bg-transparent', text: 'text-muted', border: 'border-transparent' },
  danger: { bg: 'bg-danger', text: 'text-on-accent', border: 'border-danger' },
};

const sizeStyles: Record<ButtonSize, { padding: string; text: string }> = {
  sm: { padding: 'px-4 py-2', text: 'text-[12px]' },
  md: { padding: 'px-6 py-3.5', text: 'text-[13px]' },
  lg: { padding: 'px-6 py-4', text: 'text-[14px]' },
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
  const c = useThemeColors();
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const spinnerColor = variant === 'primary' || variant === 'danger' ? c['on-accent'] : c.fg;

  return (
    <Animated.View style={[animatedStyle, block ? { width: '100%' } : undefined]}>
      <Pressable
        disabled={disabled || loading}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 150, easing: easeOutQuart }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150, easing: easeOutQuart }); }}
        className={`
          rounded-pill flex-row items-center justify-center gap-2
          min-h-touch ${s.padding} ${v.bg} ${v.border} border
          ${block ? 'w-full' : ''}
          ${disabled || loading ? 'opacity-40' : ''}
          ${className}
        `}
        style={style}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <>
            {iconLeft}
            {typeof children === 'string' ? (
              <Text className={`font-semibold tracking-[0.04em] leading-none ${s.text} ${v.text}`}>
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
