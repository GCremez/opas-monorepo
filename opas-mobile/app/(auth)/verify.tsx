import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { email } = useLocalSearchParams<{ email: string }>();
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleVerify = async (submitted?: string) => {
    const value = (submitted ?? code).trim();
    if (value.length !== 6) {
      setError(t('auth.verify_enter_code'));
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await verifyEmail(String(email), value);
      router.replace('/(tabs)');
    } catch {
      setError(t('auth.verify_invalid'));
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setNotice('');
    try {
      await resendVerification(String(email));
    } catch {
      // Ignore — the endpoint is intentionally uniform; still start the cooldown.
    }
    setNotice(t('auth.verify_resent'));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center gap-2 px-6 pt-2">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))} hitSlop={8} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </Pressable>
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">{t('auth.verify_eyebrow')}</Text>
        </View>

        <ScrollView contentContainerClassName="flex-grow px-6 pt-8" keyboardShouldPersistTaps="handled">
          <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-4">{t('auth.verify_title')}</Text>
          <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mb-9">
            {t('auth.verify_body', { email: String(email) })}
          </Text>

          {error ? (
            <View className="bg-surface rounded-md px-4 py-3 mb-6" accessibilityRole="alert">
              <Text className="font-body text-body-sm text-danger">{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View className="bg-surface rounded-md px-4 py-3 mb-6">
              <Text className="font-body text-body-sm text-muted">{notice}</Text>
            </View>
          ) : null}

          <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">{t('auth.verify_code_label')}</Text>
          <View className="border-b border-rule pb-2 mb-8">
            <TextInput
              ref={inputRef}
              className="font-display text-[28px] tracking-[0.36em] text-fg"
              placeholder="••••••"
              placeholderTextColor={c.muted}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/[^0-9]/g, '').slice(0, 6);
                setCode(digits);
                if (digits.length === 6) handleVerify(digits);
              }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={() => handleVerify()}
            />
          </View>

          <View className="flex-row items-center">
            <Text className="font-serif-italic text-[14px] text-muted">{t('auth.verify_no_code')} </Text>
            <Pressable onPress={handleResend} disabled={cooldown > 0} hitSlop={6}>
              <Text className={`font-serif-italic text-[14px] ${cooldown > 0 ? 'text-muted' : 'text-accent'}`}>
                {cooldown > 0 ? t('auth.verify_resend_in', { seconds: cooldown }) : t('auth.verify_resend')}
              </Text>
            </Pressable>
          </View>

          {/* Spacer pushes the action to the bottom of the screen, per the design. */}
          <View className="flex-1 min-h-[32px]" />

          <Button variant="primary" block size="lg" loading={loading} onPress={() => handleVerify()}>
            {t('auth.verify_cta')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
