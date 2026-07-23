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
    <View className="items-center justify-center px-5 py-12 max-w-[360px] mx-auto">
      {icon && (
        <Text className="font-display text-[40px] mb-4 text-muted">{icon}</Text>
      )}
      <Text className="font-display text-title text-fg text-center mb-2">{title}</Text>
      <Text className="font-serif text-prose text-fg-soft text-center mb-6">
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
  description = "Your documents are saved locally. We'll sync them automatically when your connection returns.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center justify-center px-5 py-12 max-w-[360px] mx-auto">
      <Text className="font-display text-[36px] mb-3 text-danger">⚠</Text>
      <Text className="font-display text-title text-fg text-center mb-2">{title}</Text>
      <Text className="font-serif text-prose text-fg-soft text-center mb-6">
        {description}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          Try again
        </Button>
      )}
    </View>
  );
}
