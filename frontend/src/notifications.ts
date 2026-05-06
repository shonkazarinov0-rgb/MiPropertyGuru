import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

export type NotificationListener = (notification: Notifications.Notification) => void;
export type NotificationResponseListener = (response: Notifications.NotificationResponse) => void;

// Called once from your root _layout.tsx, NOT at module level
export function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF8C00',
    });
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    // Use projectId from app.json extra — reliable in both dev and production
    const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.error('Missing projectId — push tokens will not work in production');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;
    console.log('Push token:', pushToken);

    try {
      await api.post('/push-token', { push_token: pushToken });
    } catch (e) {
      console.error('Failed to save push token:', e);
    }

    return pushToken;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

export async function removePushToken(): Promise<void> {
  try {
    await api.delete('/push-token');
  } catch (e) {
    console.error('Failed to remove push token:', e);
  }
}

export function addNotificationListeners(
    onNotification: NotificationListener,
    onResponse: NotificationResponseListener
) {
  const notificationListener = Notifications.addNotificationReceivedListener(onNotification);
  const responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    notificationListener.remove();
    responseListener.remove();
  };
}
