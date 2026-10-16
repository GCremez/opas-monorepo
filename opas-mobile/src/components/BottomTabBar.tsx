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
        <Text className="font-semibold text-on-accent text-label uppercase tracking-[0.15em]">
          {t(tab.labelKey)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 min-h-touch px-1 items-center justify-center"
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={t(tab.labelKey)}
    >
      {/* Long translations (fi "Muistutukset") shrink to fit their slot instead of
          pushing the bar off-screen. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        className={`font-semibold text-label uppercase tracking-[0.1em] ${
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
      className="flex-row items-center gap-1 bg-bg px-4 pt-4"
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
