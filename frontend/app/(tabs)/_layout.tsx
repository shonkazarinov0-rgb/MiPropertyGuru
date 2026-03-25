import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth-context';
import { colors } from '../../src/theme';
import { ActivityIndicator, View } from 'react-native';

export default function TabLayout() {
  const { user, loading, isClientMode, isContractorMode, isGuest } = useAuth();

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  
  // Allow guest users OR logged in users
  if (!user && !isGuest) return <Redirect href="/" />;
  
  // Paywall: Contractors must have active subscription to access the app
  if (user?.role === 'contractor' && user?.subscription_status !== 'active') {
    return <Redirect href="/payment" />;
  }

  // Hide Dashboard tab when user is in client mode or is a guest
  const showDashboard = user?.role === 'contractor' && isContractorMode;
  
  // Hide Messages and Profile for guests
  const showMessagesAndProfile = !isGuest;

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textDisabled,
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.paper,
        borderTopColor: colors.border,
        paddingBottom: 4,
        height: 56,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="home" options={{
        title: 'Explore',
        tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
      }} />
      <Tabs.Screen 
        name="dashboard" 
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          href: showDashboard ? undefined : null, // Hide when not in contractor mode
        }} 
      />
      <Tabs.Screen 
        name="messages" 
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
          href: showMessagesAndProfile ? undefined : null, // Hide for guests
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          href: showMessagesAndProfile ? undefined : null, // Hide for guests
        }} 
      />
    </Tabs>
  );
}
