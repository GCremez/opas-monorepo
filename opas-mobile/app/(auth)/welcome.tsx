import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LogoMark } from '../../src/components/icons';
import { Button } from '../../src/components/ui/Button';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-10">
        <LogoMark size={72} />
        <Text className="font-display text-[46px] leading-[46px] text-fg tracking-[-0.02em] mt-6">Opas</Text>
        <Text className="font-semibold text-label tracking-[0.22em] uppercase text-muted text-center mt-4">
          {t('welcome.tagline')}
        </Text>
        <Text className="font-serif-italic text-[17px] leading-[27px] text-fg-soft text-center mt-6 max-w-[300px]">
          {t('welcome.subtitle')}
        </Text>
      </View>

      <View className="px-8 pb-9">
        <Button variant="primary" size="lg" block onPress={() => router.push('/(auth)/register')}>
          {t('welcome.get_started')}
        </Button>
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          className="items-center py-3.5 mt-4 min-h-touch justify-center"
        >
          <Text className="font-semibold text-label tracking-[0.06em] uppercase text-fg-soft">
            {t('welcome.have_account')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
