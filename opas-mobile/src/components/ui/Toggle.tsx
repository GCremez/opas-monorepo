import * as React from 'react';
import { View } from 'react-native';

interface ToggleProps {
  on: boolean;
}

export function Toggle({ on }: ToggleProps) {
  return (
    <View className={`w-12 h-7 rounded-pill items-start justify-center px-0.5 ${on ? 'bg-accent' : 'bg-surface-2'}`}>
      <View className={`w-[22px] h-[22px] rounded-pill bg-bg ${on ? 'self-end' : 'self-start'}`} />
    </View>
  );
}
