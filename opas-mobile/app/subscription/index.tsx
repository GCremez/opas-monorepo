import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { XIcon } from '../../src/components/icons';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';
import { getPlans } from '../../src/api/subscription';

type BillingInterval = 'monthly' | 'yearly';

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { plan, setPlan } = useAuthStore();
  const { checkout, fetchSubscription } = useSubscriptionStore();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);
  // Real Stripe price IDs come from the backend (configured per environment), not
  // hardcoded here. Order is [monthly, yearly].
  const [plans, setPlans] = useState<string[]>([]);
  useEffect(() => {
    getPlans().then(setPlans).catch(() => setPlans([]));
  }, []);

  const features = [
    t('subscription.features.f1'),
    t('subscription.features.f2'),
    t('subscription.features.f3'),
    t('subscription.features.f4'),
  ];

  const price = interval === 'monthly'
    ? { amount: '€4.99', period: `/ ${t('subscription.monthly')}` }
    : { amount: '€47.90', period: `/ ${t('subscription.yearly')}` };

  const handleSubscribe = async () => {
    const priceId = interval === 'monthly' ? plans[0] : plans[1];
    if (!priceId) {
      Alert.alert(t('common.error'), t('subscription.checkout_error'));
      return;
    }
    setLoading(true);
    const url = await checkout(priceId);
    setLoading(false);
    if (!url) {
      Alert.alert(t('common.error'), t('subscription.checkout_error'));
      return;
    }
    if (url.includes('mock_session')) {
      setPlan('premium');
      await fetchSubscription();
      Alert.alert('Success', 'Subscription activated (demo mode)');
      return;
    }
    try {
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open checkout URL');
    }
  };

  if (plan === 'premium') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-display text-[40px] text-accent mb-4">✓</Text>
          <Text className="font-display text-title text-fg text-center mb-2">{t('subscription.already_premium_title')}</Text>
          <Text className="font-serif text-prose text-fg-soft text-center mb-8">{t('subscription.already_premium_desc')}</Text>
          <Button variant="outline" onPress={() => router.back()}>{t('common.done')}</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Close */}
        <View className="flex-row justify-end px-6 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel={t('common.close')}>
            <XIcon size={22} color={c['fg-soft']} />
          </Pressable>
        </View>

        {/* Masthead */}
        <View className="px-6 pt-2 pb-6">
          <Text className="font-semibold text-[10.5px] tracking-[0.20em] uppercase text-accent">{t('subscription.premium_eyebrow')}</Text>
          <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mt-2.5">{t('subscription.title')}</Text>
        </View>

        {/* Price + yearly toggle */}
        <View className="px-6">
          <View className="flex-row items-end justify-between">
            <Text className="font-display text-[44px] leading-[44px] text-fg">
              {price.amount}
              <Text className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted"> {price.period}</Text>
            </Text>
          </View>
          <Pressable
            onPress={() => setInterval((iv) => (iv === 'monthly' ? 'yearly' : 'monthly'))}
            className={`self-start mt-3 rounded-pill border px-3 py-1.5 ${interval === 'yearly' ? 'bg-accent border-accent' : 'border-rule'}`}
          >
            <Text className={`font-semibold text-[9.5px] tracking-[0.11em] uppercase ${interval === 'yearly' ? 'text-on-accent' : 'text-accent'}`}>
              {t('subscription.save_yearly')}
            </Text>
          </Pressable>
        </View>

        {/* Features */}
        <View className="px-6 pt-8">
          {features.map((feature, i) => (
            <View key={i} className="flex-row items-baseline gap-3 py-3.5 border-b border-hairline">
              <Text className="font-mono text-[13px] text-accent">✓</Text>
              <Text className="font-serif text-[16px] leading-[24px] text-fg flex-1">{feature}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA — pinned to the bottom, per the design (margin-top:auto). */}
      <View className="px-6 pt-4 pb-2">
        <Button variant="primary" size="lg" block loading={loading} onPress={handleSubscribe}>
          {t('subscription.free_trial')}
        </Button>
        <Text className="font-serif-italic text-[14px] text-muted text-center mt-3">{t('subscription.trial_note')}</Text>
      </View>
    </SafeAreaView>
  );
}
