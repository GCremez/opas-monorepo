import * as React from 'react';
import { View } from 'react-native';
import { OrbitLoader, Materialize } from '../motion';

export function Skeleton({ className = '' }: { className?: string }) {
  return <View className={`bg-surface-2 rounded-md overflow-hidden relative ${className}`} />;
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-20 rounded-md ${className}`} />;
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <Skeleton className={`h-3 rounded-sm ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Materialize className="bg-surface rounded-md p-4 gap-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/2" />
      <SkeletonBlock />
    </Materialize>
  );
}

// The Orbit — telekinetic full-page loader replacing the platform spinner.
export function Spinner({ size = 'sm', label }: { size?: 'sm' | 'lg'; label?: string }) {
  const dim = size === 'lg' ? 72 : 40;
  return (
    <View className="items-center py-4">
      <OrbitLoader size={dim} label={label} />
    </View>
  );
}
