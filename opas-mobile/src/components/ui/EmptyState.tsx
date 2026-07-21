import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center justify-center px-5 py-10 max-w-[360px] mx-auto">
      {icon && (
        <Text className="text-[40px] mb-4 opacity-30">{icon}</Text>
      )}
      <Text className="text-heading-m text-fg text-center mb-2">{title}</Text>
      <Text className="text-body-sm text-muted text-center leading-[1.6] mb-5">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button variant="primary" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

export function ErrorState({
  title = 'Connection lost',
  description = 'Your documents are saved locally. We\'ll sync them automatically when your connection returns.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center justify-center px-5 py-10 max-w-[360px] mx-auto">
      <Text className="text-[40px] mb-4 opacity-50 text-danger">⚠</Text>
      <Text className="text-heading-m text-fg text-center mb-2">{title}</Text>
      <Text className="text-body-sm text-muted text-center leading-[1.6] mb-5">
        {description}
      </Text>
      {onRetry && (
        <Button variant="secondary" onPress={onRetry}>
          Try again
        </Button>
      )}
    </View>
  );
}
