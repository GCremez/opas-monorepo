import * as React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { LogoMark } from '../../src/components/icons';
import { useAuthStore } from '../../src/store/authStore';

function BackgroundArc() {
  return (
    <View className="absolute top-0 left-0 right-0 items-center" pointerEvents="none">
      <Svg width="100%" height="280" viewBox="0 0 375 280" preserveAspectRatio="xMidYMin meet">
        <Circle cx="187" cy="80" r="180" stroke="#2c2c2e" strokeWidth={1} opacity={0.3} />
        <Path
          d="M 187 80 m -130 0 a 130 130 0 0 1 260 0"
          stroke="#92d9bb"
          strokeWidth={1}
          strokeLinecap="round"
          opacity={0.12}
          fill="none"
        />
      </Svg>
    </View>
  );
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } catch {
      setError(t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BackgroundArc />
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-12">
          <View className="mb-5">
            <LogoMark size={72} />
          </View>
          <Text className="font-display text-heading-xl text-fg text-center">
            {isReturning ? t('auth.welcome_back') : t('auth.welcome_to')}
          </Text>
          <Text className="text-body-sm text-muted/70 text-center mt-1.5">
            {isReturning ? t('auth.sign_in_to') : t('auth.get_started')}
          </Text>
        </View>

        {error ? (
          <View className="bg-danger/10 border border-danger/30 rounded-md px-4 py-3 mb-5" accessibilityRole="alert">
            <Text className="text-body-sm text-danger">{error}</Text>
          </View>
        ) : null}

        <Input
          label={t('auth.email')}
          placeholder={t('auth.email_placeholder')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Input
          label={t('auth.password')}
          placeholder={t('auth.password_placeholder')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <Button
          variant="primary"
          block
          size="lg"
          loading={loading}
          onPress={handleLogin}
          className="mt-3"
        >
          {t('auth.sign_in')}
        </Button>

        <View className="flex-row justify-center mt-8">
          <Text className="text-body-sm text-muted">{t('auth.no_account')} </Text>
          <Link href="/(auth)/register" asChild>
            <Text className="text-body-sm text-accent font-semibold">{t('auth.sign_up')}</Text>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
