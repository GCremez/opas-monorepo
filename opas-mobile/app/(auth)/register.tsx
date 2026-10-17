import * as React from 'react';
import { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { PassageButton, type PassageState } from '../../src/components/motion';
import { ChevronLeftIcon } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeColors } from '../../src/store/themeStore';

function Field({
  label, value, onChangeText, placeholder, ...rest
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
} & React.ComponentProps<typeof TextInput>) {
  const c = useThemeColors();
  return (
    <>
      <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted mb-2">{label}</Text>
      <View className="border-b border-rule pb-2 mb-7">
        <TextInput
          className="font-body text-[17px] text-fg"
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
      </View>
    </>
  );
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const c = useThemeColors();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  // The Passage (motion 05): the waypoint travels while the request runs, then the check lands.
  const [passage, setPassage] = useState<PassageState>('idle');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError(t('auth.fill_all_fields'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.password_min'));
      return;
    }
    setPassage('processing');
    setError('');
    try {
      const { email: registeredEmail } = await register(name, email, password);
      await SecureStore.setItemAsync('has_registered', 'true');
      // Hard verification gate: no session yet — collect the emailed code next.
      setPassage('done');
      await new Promise((r) => setTimeout(r, 450));
      router.replace({ pathname: '/(auth)/verify', params: { email: registeredEmail } });
    } catch (e: any) {
      console.error('[register] failed:', e?.message, e?.code, e?.config?.baseURL, e?.config?.url);
      // Uniform generic message — must not reveal whether the email is already
      // registered (account enumeration) or that the server errored.
      setError(t('auth.registration_failed'));
      setPassage('idle');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-center gap-2 px-6 pt-2">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))} hitSlop={8} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon size={22} color={c['fg-soft']} />
          </Pressable>
          <Text className="font-semibold text-label tracking-[0.20em] uppercase text-muted">{t('auth.create_account')}</Text>
        </View>

        <ScrollView contentContainerClassName="flex-grow px-6 pt-8" keyboardShouldPersistTaps="handled">
          <Text className="font-display text-[32px] leading-[35px] tracking-[-0.01em] text-fg mb-9">{t('auth.start_record')}</Text>

          {error ? (
            <View className="bg-surface rounded-md px-4 py-3 mb-6" accessibilityRole="alert">
              <Text className="font-body text-body-sm text-danger">{error}</Text>
            </View>
          ) : null}

          <Field label={t('auth.full_name')} value={name} onChangeText={setName} placeholder={t('auth.name_placeholder')} autoCapitalize="words" />
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.email_placeholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-semibold text-label tracking-[0.14em] uppercase text-muted">{t('auth.password')}</Text>
            <Pressable onPress={() => setShowPw((s) => !s)} hitSlop={6}>
              <Text className="font-semibold text-label tracking-[0.08em] uppercase text-muted">{showPw ? t('common.hide') : t('common.show')}</Text>
            </Pressable>
          </View>
          <View className="border-b border-rule pb-2">
            <TextInput
              className="font-body text-[17px] text-fg"
              placeholder="••••••••"
              placeholderTextColor={c.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
              autoComplete="new-password"
            />
          </View>

          {/* Spacer pushes the action to the bottom of the screen, per the design. */}
          <View className="flex-1 min-h-[32px]" />

          <PassageButton
            label={t('auth.create_account')}
            processingLabel={t('auth.creating_account')}
            doneLabel={t('auth.account_created')}
            state={passage}
            onPress={handleRegister}
          />

          <View className="flex-row justify-center mt-5 pb-2">
            <Text className="font-serif-italic text-[14px] text-muted">{t('auth.has_account')} </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable><Text className="font-serif-italic text-[14px] text-accent">{t('auth.sign_in')}</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
