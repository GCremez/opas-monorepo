import '../global.css';
import '../src/i18n';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { vars } from 'nativewind';
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
import { LaunchScreen } from '../src/components/LaunchScreen';
import { ToastProvider } from '../src/components/ui/ToastProvider';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { themeVars } from '../src/lib/tokens';
import { registerForPushNotifications } from '../src/utils/notifications';
import * as Notifications from 'expo-notifications';
import { useDocumentStore } from '../src/store/documentStore';
import { useReminderStore } from '../src/store/reminderStore';
import { syncReminders } from '../src/lib/reminders';
import { initAnalytics } from '../src/lib/analytics';
import { initSentry } from '../src/lib/sentry';

// Boot crash reporting + analytics once, before the app tree renders. Both no-op
// when their EXPO_PUBLIC_* keys are unset (local dev), so this is safe everywhere.
initSentry();
initAnalytics();

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const { i18n } = useTranslation();
  const hydrateTheme = useThemeStore((s) => s.hydrate);
  const active = useThemeStore((s) => s.active);
  const isDark = useThemeStore((s) => s.isDark);
  const [hydrated, setHydrated] = useState(false);

  // Load the exact weights the design tokens reference (src/lib/tokens.ts). Until
  // these resolve, NativeWind's font-display/body/mono classes fall back to the
  // system font — so gate the app behind them.
  const [fontsReady] = useFonts({
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

  // Restore the saved appearance and the logged-in session so both survive a restart.
  useEffect(() => {
    Promise.all([hydrateTheme(), hydrateAuth()]).finally(() => setHydrated(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Register this device for push once after a real sign-in (only if already allowed).
  const registered = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !registered.current) {
      registered.current = true;
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  // Deadline reminders (design 6f): keep the device's schedule in step with the documents,
  // the user's choice and the language the reminders are written in.
  const documents = useDocumentStore((s) => s.documents);
  const remindersOn = useReminderStore((s) => s.enabled);
  const permission = useReminderStore((s) => s.permission);
  useEffect(() => {
    useReminderStore.getState().hydrate();
  }, []);
  useEffect(() => {
    if (!isAuthenticated) return;
    syncReminders(documents, remindersOn, i18n.t, i18n.language).catch(() => {});
  }, [isAuthenticated, documents, remindersOn, permission, i18n.t, i18n.language]);

  // Tapping a reminder opens its document, whether the app was running or not.
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.documentId;
      if (typeof id === 'string') router.push(`/document/${id}`);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  // Theme tokens are applied as CSS variables on the root wrapper (via vars) so every
  // token utility resolves from them and switching Paper <-> Ink reverts both ways.
  const themeStyle = vars(themeVars(active));

  if (!fontsReady || !hydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={themeStyle} className="flex-1 bg-bg">
          <StatusBar style={isDark ? 'light' : 'dark'} />
          {fontsReady ? <LaunchScreen /> : null}
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={themeStyle} className="flex-1 bg-bg">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="document/[id]" />
            <Stack.Screen name="folder/[id]" />
            <Stack.Screen name="authority/[key]" />
            <Stack.Screen name="draft/[id]" />
            <Stack.Screen name="subscription/index" />
            <Stack.Screen name="ask" />
            <Stack.Screen name="journey" />
            <Stack.Screen name="guide/[id]" />
            <Stack.Screen name="application/[id]" />
            <Stack.Screen name="motion-gallery" />
          </Stack>
        </ToastProvider>
      </View>
    </GestureHandlerRootView>
  );
}
