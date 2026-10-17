import * as React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { EmptyRecord } from '../motion';
import { useThemeColors } from '../../store/themeStore';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

// The Empty Record — a breathing dashed folder with the logo mark inside,
// an invitation rather than a void. Source: "Opas Motion — Loaders.dc.html".
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-5 py-8 max-w-[360px] mx-auto">
      <EmptyRecord title={title} body={description} cta={actionLabel} onPress={onAction} />
    </View>
  );
}

// Same look as the scan error (design 5c): a small tinted "!" mark, a serif
// title and one way forward. Defaults to the app's own wording, never a raw
// error string like axios' "Network Error".
export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  return (
    <View className="items-center justify-center px-[34px] py-12 max-w-[360px] mx-auto">
      <View
        className="w-[50px] h-[50px] rounded-full items-center justify-center mb-[22px]"
        style={{ backgroundColor: `${c.danger}1a` }}
      >
        <Text className="font-body text-[20px] text-danger">!</Text>
      </View>
      <Text className="font-display text-[24px] leading-[28px] text-fg text-center" accessibilityRole="header">
        {title ?? t('common.connection_lost')}
      </Text>
      <Text className="font-serif text-[16px] leading-[26px] text-fg-soft text-center mt-3 mb-[22px]">
        {description ?? t('record.load_error_desc')}
      </Text>
      {onRetry && (
        <Button variant="primary" onPress={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </View>
  );
}
