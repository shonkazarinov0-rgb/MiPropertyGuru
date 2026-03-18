import { Stack } from 'expo-router';
import { AuthProvider } from '../src/auth-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="contractor/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="contract/generate" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
