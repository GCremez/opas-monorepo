import '../global.css';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastProvider } from '../src/components/ui/ToastProvider';
import { LaunchScreen } from '../src/components/LaunchScreen';
import { useAuthStore } from '../src/store/authStore';
import { registerForPushNotifications } from '../src/utils/notifications';
import '../src/i18n';

const MIN_SPLASH_MS = 2000;

export default function RootLayout() {
  const { isLoading, hydrate, isAuthenticated, isDemo } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();
    hydrate().then(() => {
      const elapsed = Date.now() - start;
      const remaining = MIN_SPLASH_MS - elapsed;
      if (remaining > 0) {
        setTimeout(() => setReady(true), remaining);
      } else {
        setReady(true);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const registered = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isDemo && !registered.current) {
      registered.current = true;
      registerForPushNotifications();
    }
  }, [isAuthenticated, isDemo]);


  if (isLoading || !ready) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <LaunchScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="document/[id]" />
          <Stack.Screen name="draft/[id]" />
          <Stack.Screen name="subscription/index" />
        </Stack>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
