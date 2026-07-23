import '../global.css';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
} from '@expo-google-fonts/newsreader';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { ToastProvider } from '../src/components/ui/ToastProvider';
import { LaunchScreen } from '../src/components/LaunchScreen';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { registerForPushNotifications } from '../src/utils/notifications';
import '../src/i18n';

const MIN_SPLASH_MS = 2000;

export default function RootLayout() {
  const { isLoading, hydrate, isAuthenticated, isDemo } = useAuthStore();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const isDark = useThemeStore((s) => s.isDark);
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    const start = Date.now();
    Promise.all([hydrateTheme(), hydrate()]).then(() => {
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

  if (isLoading || !ready || !fontsLoaded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className={isDark ? 'dark flex-1' : 'flex-1'}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {fontsLoaded ? <LaunchScreen /> : <View className="flex-1 bg-bg" />}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className={isDark ? 'dark flex-1' : 'flex-1'}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="document/[id]" />
            <Stack.Screen name="draft/[id]" />
            <Stack.Screen name="subscription/index" />
            <Stack.Screen name="ask" />
            <Stack.Screen name="journey" />
            <Stack.Screen name="guide/[id]" />
            <Stack.Screen name="application/[id]" />
          </Stack>
        </ToastProvider>
      </View>
    </GestureHandlerRootView>
  );
}
