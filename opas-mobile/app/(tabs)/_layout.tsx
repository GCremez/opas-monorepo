import * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { BottomTabBar, type TabKey } from '../../src/components/BottomTabBar';
import { useAuthStore } from '../../src/store/authStore';
import { track } from '../../src/lib/analytics';

const TAB_KEYS: TabKey[] = ['index', 'docs', 'scan', 'alerts', 'profile'];

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const activeTab: TabKey = last === '(tabs)' ? 'index' : (last as TabKey);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  const onTabPress = (key: TabKey) => {
    track('tab_selected', { tab_key: key });
    const route = key === 'index' ? '/(tabs)' : `/(tabs)/${key}`;
    router.push(route as typeof route);
  };

  // Scan is a full-bleed camera surface; hide the bar there.
  const isScanPage = activeTab === 'scan';

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1">
        <Slot />
      </View>
      {!isScanPage && (
        <BottomTabBar
          activeTab={TAB_KEYS.includes(activeTab) ? activeTab : ('' as TabKey)}
          onTabPress={onTabPress}
        />
      )}
    </View>
  );
}
