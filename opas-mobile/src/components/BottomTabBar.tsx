import * as React from 'react';
import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { HomeIcon, SearchIcon, ScanIcon, DocsIcon, ProfileIcon } from './icons';

type TabKey = 'index' | 'search' | 'scan' | 'docs' | 'profile';

interface TabConfig {
  key: TabKey;
  labelKey: string;
  icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  scan?: boolean;
}

interface BottomTabBarProps {
  activeTab: TabKey;
  onTabPress: (key: TabKey) => void;
}

const tabs: TabConfig[] = [
  { key: 'index', labelKey: 'tabs.home', icon: HomeIcon },
  { key: 'search', labelKey: 'tabs.search', icon: SearchIcon },
  { key: 'scan', labelKey: 'tabs.scan', icon: ScanIcon, scan: true },
  { key: 'docs', labelKey: 'tabs.docs', icon: DocsIcon },
  { key: 'profile', labelKey: 'tabs.profile', icon: ProfileIcon },
];

const ACTIVE = '#92d9bb';
const INACTIVE = '#86868b';

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
  const activeProgress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive]);

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
  }));

  const Icon = tab.icon;

  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center"
      style={{ width: 64, height: 60 }}
    >
      {tab.scan ? (
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{
            backgroundColor: '#2c2c2e',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <ScanIcon size={24} color={INACTIVE} strokeWidth={2} />
        </View>
      ) : (
        <View className="w-6 h-6 items-center justify-center">
          <Animated.View style={[inactiveIconStyle, { position: 'absolute' }]}>
            <Icon size={22} color={INACTIVE} strokeWidth={2} />
          </Animated.View>
          <Animated.View style={[activeIconStyle, { position: 'absolute' }]}>
            <Icon size={22} color={ACTIVE} strokeWidth={2.5} />
          </Animated.View>
        </View>
      )}
      <Text
        className={`text-[10px] font-medium tracking-wide mt-1 text-center ${isActive ? 'text-accent' : 'text-muted'}`}
      >
        {t(tab.labelKey)}
      </Text>
    </Pressable>
  );
}

export function BottomTabBar({ activeTab, onTabPress }: BottomTabBarProps) {
  return (
    <View
      className="absolute bottom-6 self-center z-50 flex-row items-center px-4 py-2 rounded-[34px] border"
      style={{
        backgroundColor: 'rgba(28, 28, 30, 0.78)',
        borderColor: 'rgba(255, 255, 255, 0.07)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.55,
        shadowRadius: 24,
        elevation: 10,
      }}
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
