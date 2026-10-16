import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { track } from '../lib/analytics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    track('push_denied', { platform: Platform.OS });
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
