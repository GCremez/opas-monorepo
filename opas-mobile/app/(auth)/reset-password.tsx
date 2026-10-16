import * as React from 'react';
import { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { ChevronLeftIcon, MailIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';

// Three-step flow on one screen:
//   'request' — collect email, request a reset code (enumeration-safe: always advances)
//   'confirm' — enter the 6-digit code + a new password
//   'done'    — success; the user returns to sign in with the new password
type Step = 'request' | 'confirm' | 'done';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { requestPasswordReset, confirmPasswordReset } = useAuthStore();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goBackToSignIn = () =>
    router.canGoBack() ? router.back() : router.replace('/(auth)/login');

  const handleSend = async () => {
    if (!email.trim()) {
      setError(t('auth.enter_email'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
    } catch {
      // The endpoint returns success regardless of whether the email exists (no
      // account enumeration), so only a transport failure lands here — advance anyway.
    } finally {
      setLoading(false);
      // Always advance to the confirm step — never reveal whether the account exists.
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t('auth.reset_enter_code'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.reset_password_min'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(email.trim(), code.trim(), password);
      setStep('done');
    } catch {
      // Any bad/expired code is a generic 400 — don't distinguish causes.
      setError(t('auth.reset_invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Nav */}
        <View className="flex-row items-center gap-2 px-6 pt-2">
          <Pressable onPress={goBackToSignIn} hitSlop={8} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </Pressable>
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">
            {t('auth.reset_eyebrow')}
          </Text>
        </View>

        {step === 'done' ? (
          <View className="flex-1 px-6 pt-8">
            <View className="w-14 h-14 rounded-full bg-surface items-center justify-center mb-7">
              <MailIcon size={24} color={c.accent} />
            </View>
            <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-3">
              {t('auth.reset_done_title')}
            </Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mb-9">
              {t('auth.reset_done_body')}
            </Text>
            <Button variant="primary" block size="lg" onPress={goBackToSignIn}>
              {t('auth.back_to_sign_in')}
            </Button>
          </View>
        ) : step === 'confirm' ? (
          <ScrollView contentContainerClassName="flex-grow px-6 pt-8" keyboardShouldPersistTaps="handled">
            <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-3">
              {t('auth.reset_sent_title')}
            </Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mb-9">
              {t('auth.reset_sent_body', { email: email.trim() })}
            </Text>

            {error ? (
              <View className="bg-surface rounded-md px-4 py-3 mb-6" accessibilityRole="alert">
                <Text className="font-body text-body-sm text-danger">{error}</Text>
              </View>
            ) : null}

            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">
              {t('auth.reset_code_label')}
            </Text>
            <View className="border-b border-rule pb-2 mb-8">
              <TextInput
                className="font-body text-[17px] text-fg tracking-[6px]"
                placeholder="000000"
                placeholderTextColor={c.muted}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="next"
              />
            </View>

            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">
              {t('auth.reset_new_password_label')}
            </Text>
            <View className="border-b border-rule pb-2 mb-9">
              <TextInput
                className="font-body text-[17px] text-fg"
                placeholder={t('auth.reset_new_password_placeholder')}
                placeholderTextColor={c.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                onSubmitEditing={handleConfirm}
                returnKeyType="done"
              />
            </View>

            <View className="flex-1" />

            <Button variant="primary" block size="lg" loading={loading} onPress={handleConfirm}>
              {t('auth.reset_cta')}
            </Button>
            <Pressable className="self-center mt-5" hitSlop={8} onPress={goBackToSignIn}>
              <Text className="font-serif-italic text-[14px] text-accent">{t('auth.back_to_sign_in')}</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView contentContainerClassName="flex-grow px-6 pt-8" keyboardShouldPersistTaps="handled">
            <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-3">
              {t('auth.reset_title')}
            </Text>
            <Text className="font-serif text-[16px] leading-[26px] text-fg-soft mb-9">
              {t('auth.reset_body')}
            </Text>

            {error ? (
              <View className="bg-surface rounded-md px-4 py-3 mb-6" accessibilityRole="alert">
                <Text className="font-body text-body-sm text-danger">{error}</Text>
              </View>
            ) : null}

            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">
              {t('auth.email')}
            </Text>
            <View className="border-b border-rule pb-2 mb-9">
              <TextInput
                className="font-body text-[17px] text-fg"
                placeholder={t('auth.email_placeholder')}
                placeholderTextColor={c.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
            </View>

            <View className="flex-1" />

            <Button variant="primary" block size="lg" loading={loading} onPress={handleSend}>
              {t('auth.reset_send')}
            </Button>
            <Pressable className="self-center mt-5" hitSlop={8} onPress={goBackToSignIn}>
              <Text className="font-serif-italic text-[14px] text-accent">{t('auth.back_to_sign_in')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
