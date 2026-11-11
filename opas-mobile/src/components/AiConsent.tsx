import * as React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { LINKS } from '../lib/links';

const POINTS = ['point_read', 'point_sensitive', 'point_redact', 'point_ai', 'point_store'] as const;

/**
 * Shown before the first letter is uploaded: says plainly where the letter goes,
 * names the AI provider, and asks for an explicit yes (App Store guideline 5.1.2(i)).
 * Letters can hold health data, so this is also explicit consent under GDPR
 * Art. 9(2)(a): it names health information, and tapping Allow is the explicit act.
 */
export function AiConsent({ onAllow, onDecline }: { onAllow: () => void; onDecline: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 30, paddingTop: 32, paddingBottom: 16 }}>
        <Text className="font-semibold text-label uppercase text-accent">{t('consent.eyebrow')}</Text>
        <Text className="font-display text-[28px] leading-[31px] tracking-[-0.01em] text-fg mt-2.5 mb-6" accessibilityRole="header">
          {t('consent.title')}
        </Text>
        {POINTS.map((k, i) => (
          <View key={k} className={`flex-row gap-3 py-3.5 ${i < POINTS.length - 1 ? 'border-b border-line' : ''}`}>
            <Text className="font-mono text-[13px] text-accent w-4">{i + 1}</Text>
            <Text className="font-serif text-[16px] leading-[24px] text-fg flex-1">{t(`consent.${k}`)}</Text>
          </View>
        ))}
        <TouchableOpacity
          onPress={() => Linking.openURL(LINKS.privacy)}
          accessibilityRole="link"
          className="mt-4 py-2 min-h-touch justify-center self-start"
        >
          <Text className="font-semibold text-label uppercase text-fg-soft">{t('consent.privacy_link')}</Text>
        </TouchableOpacity>
      </ScrollView>
      <View className="px-[30px] pt-2 pb-2 gap-3">
        <Text className="font-body text-body-sm text-fg-soft">{t('consent.explicit')}</Text>
        <Button variant="primary" size="lg" block onPress={onAllow}>{t('consent.allow')}</Button>
        <Button variant="ghost" block onPress={onDecline}>{t('consent.decline')}</Button>
      </View>
    </SafeAreaView>
  );
}
