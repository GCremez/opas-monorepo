import * as React from 'react';
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { CheckIcon, ChevronLeftIcon } from '../../src/components/icons';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';
import { useAuthStore } from '../../src/store/authStore';

type BillingInterval = 'monthly' | 'yearly';

const MONTHLY_PRICE_ID = 'price_monthly';
const YEARLY_PRICE_ID = 'price_yearly';

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { plan, setPlan } = useAuthStore();
  const { checkout, fetchSubscription } = useSubscriptionStore();
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState(false);

  const features = [
    t('subscription.features.unlimited_decodes'),
    t('subscription.features.draft_letters'),
    t('subscription.features.export_pdf'),
    t('subscription.features.calendar_sync'),
    t('subscription.features.priority_support'),
  ];

  const prices = {
    monthly: { label: '€9.99', period: `/${t('subscription.monthly').toLowerCase()}` },
    yearly: { label: '€99.99', period: `/${t('subscription.yearly').toLowerCase()}`, badge: 'Save 17%' },
  };

  const handleSubscribe = async () => {
    setLoading(true);
    const priceId = interval === 'monthly' ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;
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
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Could not open checkout URL');
    }
  };

  if (plan === 'premium') {
    return (
      <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
        <View className="flex-1 items-center justify-center px-5">
          <View className="w-20 h-20 rounded-full bg-accent items-center justify-center mb-6">
            <CheckIcon size={32} color="#000" />
          </View>
          <Text className="font-display text-heading-l text-fg text-center mb-2">
            {t('subscription.already_premium_title')}
          </Text>
          <Text className="text-body-sm text-muted text-center mb-6">
            {t('subscription.already_premium_desc')}
          </Text>
          <Button variant="ghost" onPress={() => router.back()}>
            {t('common.done')}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="min-h-touch flex-row items-center gap-1.5 mb-4"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeftIcon size={18} color="#92d9bb" />
          <Text className="text-accent text-body">{t('common.back')}</Text>
        </TouchableOpacity>

        <Text className="font-display text-heading-xl text-fg mb-2">
          {t('subscription.title')}
        </Text>
        <Text className="text-body-sm text-muted mb-8">
          {t('profile.upgrade_desc')}
        </Text>

        <View className="flex-row bg-surface-2 rounded-md p-1 mb-8">
          <TouchableOpacity
            onPress={() => setInterval('monthly')}
            className={`flex-1 py-3 rounded-md items-center ${
              interval === 'monthly' ? 'bg-surface' : ''
            }`}
          >
            <Text className={`text-body font-medium ${interval === 'monthly' ? 'text-fg' : 'text-muted'}`}>
              {t('subscription.monthly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setInterval('yearly')}
            className={`flex-1 py-3 rounded-md items-center flex-row justify-center gap-2 ${
              interval === 'yearly' ? 'bg-surface' : ''
            }`}
          >
            <Text className={`text-body font-medium ${interval === 'yearly' ? 'text-fg' : 'text-muted'}`}>
              {t('subscription.yearly')}
            </Text>
            {interval === 'yearly' && (
              <Badge variant="accent">{prices.yearly.badge}</Badge>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-surface border border-accent/30 rounded-lg p-6 mb-8">
          <Text className="font-display text-display text-accent">
            {prices[interval].label}
            <Text className="text-body text-muted font-body">{prices[interval].period}</Text>
          </Text>

          <View className="border-t border-border my-5" />

          {features.map((feature, i) => (
            <View key={i} className="flex-row items-center gap-3 mb-4">
              <CheckIcon size={16} color="#92d9bb" />
              <Text className="text-body text-fg flex-1">{feature}</Text>
            </View>
          ))}

          <Button
            variant="primary"
            size="lg"
            block
            loading={loading}
            onPress={handleSubscribe}
            className="mt-4"
          >
            {`${t('subscription.subscribe')} — ${prices[interval].label}`}
          </Button>

          <Text className="text-caption text-muted text-center mt-4">
            {t('subscription.cancel_anytime')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
