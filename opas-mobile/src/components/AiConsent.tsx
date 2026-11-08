import * as React from 'react';
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { useAuthStore } from '../store/authStore';
import { LINKS } from '../lib/links';

const POINTS = ['what', 'sensitive', 'who', 'scrub', 'withdraw'] as const;

/**
 * Asked once, before the first letter is read: names the AI provider, says what is sent
 * and why, and records the answer on the account (App Store 5.1.2(i)). Letters can hold
 * health data, so this is explicit consent under GDPR Art. 9(2)(a): it names health
 * information and the agree button is the explicit act.
 * The backend refuses to decode until it's given, so this isn't only a screen.
 */
export function AiConsent({ onDecline }: { onDecline: () => void }) {
  const { t } = useTranslation();
  const setAiConsent = useAuthStore((s) => s.setAiConsent);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const agree = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await setAiConsent(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 30, paddingTop: 24, paddingBottom: 16 }}>
        <Text className="font-semibold text-label tracking-[0.18em] uppercase text-accent mb-3.5">{t('consent.eyebrow')}</Text>
        <Text className="font-display text-[30px] leading-[33px] tracking-[-0.01em] text-fg" accessibilityRole="header">
          {t('consent.title')}
        </Text>
        <Text className="font-serif text-prose text-fg-soft mt-4">{t('consent.lead')}</Text>

        <View className="mt-6">
          {POINTS.map((k, i) => (
            <View key={k} className={`py-3.5 ${i === POINTS.length - 1 ? '' : 'border-b border-rule'}`}>
              <Text className="font-semibold text-label uppercase text-muted">{t(`consent.${k}_label`)}</Text>
              <Text className="font-body text-body text-fg mt-1">{t(`consent.${k}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => Linking.openURL(LINKS.privacy)} accessibilityRole="link" className="mt-4 py-2 min-h-touch justify-center">
          <Text className="font-serif-italic text-body-sm text-accent">{t('consent.read_policy')}</Text>
        </Pressable>
        {failed && <Text className="font-body text-body-sm text-danger mt-2">{t('consent.save_failed')}</Text>}
      </ScrollView>

      <View className="px-6 pt-2 pb-2">
        <Text className="font-body text-body-sm text-fg-soft mb-3">{t('consent.explicit')}</Text>
        <Button variant="primary" block size="lg" loading={saving} onPress={agree}>{t('consent.agree')}</Button>
        <Button variant="ghost" block className="mt-1" onPress={onDecline}>{t('consent.not_now')}</Button>
      </View>
    </SafeAreaView>
  );
}
