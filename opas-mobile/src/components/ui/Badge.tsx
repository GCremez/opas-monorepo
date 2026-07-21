import * as React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const badgeStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  accent: { bg: 'bg-accent-dim', text: 'text-accent' },
  success: { bg: 'bg-[#30d15822]', text: 'text-success' },
  warning: { bg: 'bg-[#ff9f0a22]', text: 'text-warning' },
  danger: { bg: 'bg-[#ff453a22]', text: 'text-danger' },
  info: { bg: 'bg-[#5e5ce622]', text: 'text-info' },
  neutral: { bg: 'bg-surface-2', text: 'text-muted' },
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  const s = badgeStyles[variant];
  return (
    <View className={`self-start px-2 py-0.5 rounded-[3px] ${s.bg}`}>
      <Text className={`text-[10px] font-semibold tracking-wide uppercase ${s.text}`}>
        {children}
      </Text>
    </View>
  );
}

type PillVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface PillProps {
  variant?: PillVariant;
  children: React.ReactNode;
}

const pillStyles: Record<PillVariant, { bg: string; text: string; border: string }> = {
  accent: { bg: 'bg-accent-dim', text: 'text-accent', border: 'border-accent' },
  success: { bg: 'bg-[#30d15822]', text: 'text-success', border: 'border-success' },
  warning: { bg: 'bg-[#ff9f0a22]', text: 'text-warning', border: 'border-warning' },
  danger: { bg: 'bg-[#ff453a22]', text: 'text-danger', border: 'border-danger' },
  info: { bg: 'bg-[#5e5ce622]', text: 'text-info', border: 'border-info' },
  neutral: { bg: 'bg-transparent', text: 'text-muted', border: 'border-border' },
};

export function Pill({ variant = 'neutral', children }: PillProps) {
  const s = pillStyles[variant];
  return (
    <View className={`self-start px-4 py-1.5 rounded-md border min-h-[34px] items-center justify-center ${s.bg} ${s.border}`}>
      <Text className={`text-[10px] font-medium tracking-wide ${s.text}`}>{children}</Text>
    </View>
  );
}
