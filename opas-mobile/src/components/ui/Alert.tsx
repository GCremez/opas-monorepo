import * as React from 'react';
import { View, Text } from 'react-native';
import { CheckIcon, XIcon, AlertIcon, BellIcon } from '../icons';
import { useThemeColors } from '../../store/themeStore';

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
}

// v2 folds success into accent (pine reads positive). Rendered as a surface
// inset with a semantic accent bar + icon — status is never colour-only.
const alertText: Record<AlertVariant, string> = {
  success: 'text-accent',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

export function Alert({ variant = 'info', children }: AlertProps) {
  const c = useThemeColors();
  const iconColor = variant === 'success' ? c.accent : variant === 'warning' ? c.warning : variant === 'danger' ? c.danger : c.info;
  const icon =
    variant === 'success' ? <CheckIcon size={14} color={iconColor} />
    : variant === 'warning' ? <BellIcon size={14} color={iconColor} />
    : variant === 'danger' ? <XIcon size={14} color={iconColor} />
    : <AlertIcon size={14} color={iconColor} />;

  return (
    <View className="flex-row gap-2.5 items-start px-4 py-3 rounded-md bg-surface mb-2">
      <View className="mt-0.5">{icon}</View>
      <Text className={`flex-1 font-body text-body-sm ${alertText[variant]}`}>{children}</Text>
    </View>
  );
}
