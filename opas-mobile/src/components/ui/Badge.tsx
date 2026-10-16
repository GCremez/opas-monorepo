import * as React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

// v2 status is tracked-caps text in a semantic colour (pine reads positive,
// ochre = deadline, brick = urgent). "success" folds into accent per the
// v1→v2 mapping. Never colour-only in isolation — pair with a label.
const badgeText: Record<BadgeVariant, string> = {
  accent: 'text-accent',
  success: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-muted',
};

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <View className="self-start rounded-sm bg-surface px-2 py-1">
      <Text className={`font-semibold text-label tracking-[0.11em] uppercase ${badgeText[variant]}`}>
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

// Bordered status pill, e.g. the document "Approved" chip.
const pillStyles: Record<PillVariant, { text: string; border: string }> = {
  accent: { text: 'text-accent', border: 'border-accent' },
  success: { text: 'text-accent', border: 'border-accent' },
  warning: { text: 'text-warning', border: 'border-warning' },
  danger: { text: 'text-danger', border: 'border-danger' },
  info: { text: 'text-info', border: 'border-info' },
  neutral: { text: 'text-muted', border: 'border-rule' },
};

export function Pill({ variant = 'neutral', children }: PillProps) {
  const s = pillStyles[variant];
  return (
    <View className={`self-start rounded-pill border px-3 py-1.5 items-center justify-center ${s.border}`}>
      <Text className={`font-semibold text-label tracking-[0.12em] uppercase ${s.text}`}>
        {children}
      </Text>
    </View>
  );
}
