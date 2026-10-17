import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { track } from '../lib/analytics';

// Runs only while the app is open. "Your letter is ready" is for people who left;
// in the app the result is already on screen (or a tap away on Home), so stay quiet.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.type !== 'decode_ready';
    return {
      shouldShowAlert: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
      shouldShowBanner: show,
      shouldShowList: show,
    };
  },
});

/** Register this device's push token with the backend, if notifications are allowed. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  // Never ask here: permission is asked for in context, when the user turns reminders
  // on (Home prompt or Profile). This only registers a device that already allows it.
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  let tokenData: { data: string };
  try {
    tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined,
    });
  } catch {
    return null;
  }
  const token = tokenData.data;

  try {
    await apiClient.post('/push/register', { token, platform: Platform.OS });
    track('push_registered', { platform: Platform.OS });
  } catch {
    // Token will be retried on next app launch
  }

  return token;
}
