import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isReturning, setIsReturning] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('has_registered').then((val) => {
      if (val) setIsReturning(true);
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.enter_email_password'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      // Correct credentials but an unverified email → route to verification.
      // The backend returns 403 with code "email_not_verified" only after a
      // correct password, so this is safe to distinguish from a bad login.
      if (e?.response?.status === 403 && e?.response?.data?.code === 'email_not_verified') {
        router.push({ pathname: '/(auth)/verify', params: { email } });
        return;
      }
      // Uniform generic message — never reveal whether it was the email, the
      // password, connectivity, or the server (prevents account enumeration
      // and backend-state disclosure).
      setError(t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Nav */}
        <View className="flex-row items-center gap-2 px-6 pt-2">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))} hitSlop={8} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </Pressable>
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">{t('auth.sign_in')}</Text>
        </View>

        <ScrollView contentContainerClassName="flex-grow px-6 pt-8" keyboardShouldPersistTaps="handled">
          <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-9">
            {isReturning ? t('auth.welcome_back') : t('auth.welcome_to')}
          </Text>

          {error ? (
            <View className="bg-surface rounded-md px-4 py-3 mb-6" accessibilityRole="alert">
              <Text className="font-body text-body-sm text-danger">{error}</Text>
            </View>
          ) : null}

          {/* Email — underlined field */}
          <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">{t('auth.email')}</Text>
          <View className="border-b border-rule pb-2 mb-7">
            <TextInput
              className="font-body text-[17px] text-fg"
              placeholder={t('auth.email_placeholder')}
              placeholderTextColor={c.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password — underlined field with Show toggle */}
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted">{t('auth.password')}</Text>
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={6}>
              <Text className="font-semibold text-label tracking-[0.08em] uppercase text-muted">
                {showPw ? t('common.hide') : t('common.show')}
              </Text>
            </Pressable>
          </View>
          <View className="border-b border-rule pb-2 mb-4">
            <TextInput
              className="font-body text-[17px] text-fg"
              placeholder="••••••••"
              placeholderTextColor={c.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="password"
            />
          </View>

          {/* Right-aligned, muted — per the design. */}
          <Pressable className="self-end" hitSlop={6} onPress={() => router.push('/(auth)/reset-password')}>
            <Text className="font-semibold text-label tracking-[0.08em] uppercase text-muted">{t('auth.forgot')}</Text>
          </Pressable>

          {/* Spacer pushes the action to the bottom of the screen, per the design. */}
          <View className="flex-1 min-h-[32px]" />

          <Button variant="primary" block size="lg" loading={loading} onPress={handleLogin}>
            {t('auth.sign_in')}
          </Button>

          <View className="flex-row justify-center mt-5 pb-2">
            <Text className="font-serif-italic text-[14px] text-muted">{t('auth.no_account')} </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable><Text className="font-serif-italic text-[14px] text-accent">{t('auth.sign_up')}</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
