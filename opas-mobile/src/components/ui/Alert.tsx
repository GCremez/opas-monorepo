import * as React from 'react';
import { View, Text } from 'react-native';
import { CheckIcon, XIcon, AlertIcon, BellIcon } from '../icons';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
}

const alertStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: 'bg-[#30d15810]', border: 'border-success', text: 'text-success', icon: 'text-success' },
  warning: { bg: 'bg-[#ff9f0a10]', border: 'border-warning', text: 'text-warning', icon: 'text-warning' },
  danger: { bg: 'bg-[#ff453a10]', border: 'border-danger', text: 'text-danger', icon: 'text-danger' },
  info: { bg: 'bg-[#5e5ce610]', border: 'border-info', text: 'text-info', icon: 'text-info' },
};

const alertIcons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckIcon size={14} color="#30d158" />,
  warning: <BellIcon size={14} color="#ff9f0a" />,
  danger: <XIcon size={14} color="#ff453a" />,
  info: <AlertIcon size={14} color="#5e5ce6" />,
};

export function Alert({ variant = 'info', children }: AlertProps) {
  const s = alertStyles[variant];
  return (
    <View className={`flex-row gap-2 items-start px-3 py-3 rounded-md border ${s.bg} ${s.border} mb-2`}>
      <View className="mt-0.5">{alertIcons[variant]}</View>
      <Text className={`flex-1 text-[13px] leading-[1.6] ${s.text}`}>{children}</Text>
    </View>
  );
}
