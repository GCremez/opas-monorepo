import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Spinner } from '../../src/components/ui/Loading';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAuthenticated) {
      SecureStore.getItemAsync('has_seen_onboarding').then((val) => {
        if (!val) {
          router.replace('/(onboarding)');
        } else {
          setChecking(false);
        }
      });
    } else {
      setChecking(false);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Signed in: we're on our way to the tabs, so don't mount the auth stack at all.
  // Mounting it mid-redirect made it report its routes to a navigator already gone.
  if (checking || isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Spinner size="lg" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
