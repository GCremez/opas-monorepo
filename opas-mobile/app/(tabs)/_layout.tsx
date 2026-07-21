import * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { BottomTabBar } from '../../src/components/BottomTabBar';
import { useAuthStore } from '../../src/store/authStore';

type TabKey = 'index' | 'search' | 'scan' | 'docs' | 'profile';

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const activeTab: TabKey = last === '(tabs)' ? 'index' : (last as TabKey) ?? 'index';

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  const onTabPress = (key: TabKey) => {
    const route = key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
    router.push(route as typeof route);
  };

  const isScanPage = activeTab === 'scan';

  return (
    <View className="flex-1 bg-bg">
      <Slot />
      {!isScanPage && (
        <BottomTabBar activeTab={activeTab} onTabPress={onTabPress} />
      )}
    </View>
  );
}
