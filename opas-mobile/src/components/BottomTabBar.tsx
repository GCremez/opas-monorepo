import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// v2 "Personal Record" bottom nav — typographic, not icon-based.
// Record · Files · Scan (pill) · Alerts · You
export type TabKey = 'index' | 'docs' | 'scan' | 'alerts' | 'profile';

interface TabConfig {
  key: TabKey;
  labelKey: string;
  scan?: boolean;
}

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabPress: (key: TabKey) => void;
}

const tabs: TabConfig[] = [
  { key: 'index', labelKey: 'tabs.record' },
  { key: 'docs', labelKey: 'tabs.files' },
  { key: 'scan', labelKey: 'tabs.scan', scan: true },
  { key: 'alerts', labelKey: 'tabs.alerts' },
  { key: 'profile', labelKey: 'tabs.you' },
];

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: TabConfig;
  isActive: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  if (tab.scan) {
    return (
      <Pressable
        onPress={onPress}
        className="bg-accent rounded-pill px-5 py-3 min-h-touch items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={t(tab.labelKey)}
      >
        <Text className="font-semibold text-on-accent text-[9.5px] uppercase tracking-[0.15em]">
          {t(tab.labelKey)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="min-h-touch px-2 items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={t(tab.labelKey)}
    >
      <Text
        className={`font-semibold text-[9.5px] uppercase tracking-[0.13em] ${
          isActive ? 'text-fg' : 'text-muted'
        }`}
      >
        {t(tab.labelKey)}
      </Text>
    </Pressable>
  );
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between bg-bg px-6 pt-4"
      style={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => onTabPress(tab.key)}
        />
      ))}
    </View>
  );
}
