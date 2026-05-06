import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth-context';
import { colors } from '../../src/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
    name: string;
    title: string;
    icon: IoniconsName;
    show: boolean;
}

export default function TabLayout() {
    const { user, loading, isClientMode, isContractorMode, isGuest } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Must be guest or authenticated
    if (!user && !isGuest) return <Redirect href="/" />;

    // Contractors without active subscription go to paywall
    if (user?.role === 'contractor' && user?.subscription_status !== 'active') {
        return <Redirect href="/payment" />;
    }

    const isContractor = user?.role === 'contractor';
    const isClient = user?.role === 'client';

    const tabs: TabConfig[] = [
        {
            name: 'home',
            title: 'Explore',
            icon: 'search',
            show: true,
        },
        {
            name: 'posted-jobs',
            title: 'My Jobs',
            icon: 'briefcase',
            // Clients always see it; contractors only in client mode
            show: isClient || (isContractor && isClientMode),
        },
        {
            name: 'dashboard',
            title: 'Dashboard',
            icon: 'grid',
            // Only contractors in contractor mode
            show: isContractor && isContractorMode,
        },
        {
            name: 'messages',
            title: 'Messages',
            icon: 'chatbubbles',
            show: !isGuest,
        },
        {
            name: 'profile',
            title: 'Profile',
            icon: 'person',
            show: !isGuest,
        },
    ];

    return (
        <Tabs
            screenOptions={{
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
            }}
        >
            {tabs.map(({ name, title, icon, show }) => (
                <Tabs.Screen
                    key={name}
                    name={name}
                    options={{
                        title,
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name={icon} size={size} color={color} />
                        ),
                        href: show ? undefined : null,
                    }}
                />
            ))}
        </Tabs>
    );
}
