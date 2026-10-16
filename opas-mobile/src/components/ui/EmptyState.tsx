import * as React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { EmptyRecord } from '../motion';

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

export function ErrorState({
  title = 'Connection lost',
  description = "Your documents are saved locally. We'll sync them automatically when your connection returns.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="items-center justify-center px-5 py-12 max-w-[360px] mx-auto">
      <Text className="font-display text-[36px] mb-3 text-danger">⚠</Text>
      <Text className="font-display text-title text-fg text-center mb-2">{title}</Text>
      <Text className="font-serif text-prose text-fg-soft text-center mb-6">
        {description}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </View>
  );
}
