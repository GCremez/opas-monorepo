import * as React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogoMark } from '../../src/components/icons';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';

const FEATURES = [
  { key: 'scan', tKey: 'welcome.feature_scan' },
  { key: 'ai', tKey: 'welcome.feature_ai' },
  { key: 'organize', tKey: 'welcome.feature_organize' },
] as const;

function BackgroundArcs() {
  return (
    <View className="absolute top-0 left-0 right-0 items-center" pointerEvents="none">
      <Svg width="100%" height="340" viewBox="0 0 375 340" preserveAspectRatio="xMidYMin meet">
        <Circle cx="187" cy="120" r="200" stroke="#2c2c2e" strokeWidth={1} opacity={0.4} />
        <Circle cx="187" cy="120" r="240" stroke="#2c2c2e" strokeWidth={0.5} opacity={0.25} />
        <Path
          d="M 187 120 m -160 0 a 160 160 0 0 1 320 0"
          stroke="#92d9bb"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.15}
          fill="none"
        />
      </Svg>
    </View>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { demoLogin } = useAuthStore();

  const handleDemo = () => {
    demoLogin();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <BackgroundArcs />
      <ScrollView
        contentContainerClassName="flex-grow px-8 pt-24 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-12">
          <View className="mb-5">
            <LogoMark size={80} />
          </View>
          <Text className="font-display text-[34px] font-bold text-fg text-center tracking-[-0.03em]">
            Opas
          </Text>
          <Text className="text-body text-muted/70 text-center mt-2 max-w-[260px]">
            {t('welcome.tagline')}
          </Text>
        </View>

        <View className="mb-10">
          <View className="gap-4 mb-8">
            {FEATURES.map((f) => (
              <View key={f.key} className="flex-row items-center gap-3">
                <View className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                <Text className="text-body text-fg flex-1">{t(f.tKey)}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Button
                variant="primary"
                size="lg"
                block
                onPress={() => router.push('/(auth)/register')}
              >
                {t('auth.create_account')}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="outline"
                size="lg"
                block
                onPress={() => router.push('/subscription')}
              >
                Premium
              </Button>
            </View>
          </View>

          <View className="gap-3">
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              className="items-center py-3 min-h-touch justify-center"
            >
              <Text className="text-body-sm text-accent font-medium">
                {t('auth.sign_in')} {'→'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDemo}
              className="items-center py-2 min-h-touch justify-center"
            >
              <Text className="text-caption text-muted">{t('welcome.demo')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
