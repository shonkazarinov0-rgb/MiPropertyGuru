import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || undefined,
    });
    const pushToken = tokenData.data;
    console.log('Push token:', pushToken);

    try {
      await api.post('/push-token', { push_token: pushToken });
      console.log('Push token saved to server');
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
    console.log('Push token removed from server');
  } catch (e) {
    console.error('Failed to remove push token:', e);
  }
}

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF8C00',
  });
}

export type NotificationListener = (notification: Notifications.Notification) => void;
export type NotificationResponseListener = (response: Notifications.NotificationResponse) => void;

// Add notification listeners
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
