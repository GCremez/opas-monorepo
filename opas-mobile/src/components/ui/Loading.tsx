import * as React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <View
      className={`bg-surface-2 rounded-md overflow-hidden relative ${className}`}
    />
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-20 rounded-md ${className}`} />;
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-3 rounded-sm ${className}`} />;
}

export function SkeletonCard() {
  return (
    <View className="bg-surface border border-border rounded-md p-4 gap-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/2" />
      <SkeletonBlock />
    </View>
  );
}

export function Spinner({ size = 'sm', label }: { size?: 'sm' | 'lg'; label?: string }) {
  const dim = size === 'lg' ? 32 : 20;
  return (
    <View className="flex-row items-center gap-3 py-4">
      <ActivityIndicator size={dim} color="#92d9bb" />
      {label && <Text className="text-body-sm text-muted">{label}</Text>}
    </View>
  );
}
