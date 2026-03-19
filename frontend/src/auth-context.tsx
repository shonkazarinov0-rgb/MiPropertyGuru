import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from './api';
import { registerForPushNotifications, removePushToken, addNotificationListeners } from './notifications';
import { router } from 'expo-router';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  contractor_type?: string;
  bio?: string;
  hourly_rate?: number;
  live_location_enabled?: boolean;
  current_location?: { lat: number; lng: number } | null;
  work_locations?: Array<{ name: string; lat: number; lng: number }>;
  rating?: number;
  review_count?: number;
  subscription_status?: string;
  subscription_fee?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  // Set up push notification listeners when user is logged in
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    
    const cleanup = addNotificationListeners(
      // When notification received while app is open
      (notification) => {
        console.log('Notification received:', notification);
      },
      // When user taps on notification
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'message' && data?.conversation_id) {
          router.push(`/chat/${data.conversation_id}`);
        }
      }
    );
    
    return cleanup;
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const userData = await api.get('/auth/me');
        setUser(userData);
        // Register for push notifications after auth check
        if (Platform.OS !== 'web') {
          registerForPushNotifications();
        }
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('auth_token', res.token);
    setUser(res.user);
    // Register for push notifications after login
    if (Platform.OS !== 'web') {
      registerForPushNotifications();
    }
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    await AsyncStorage.setItem('auth_token', res.token);
    setUser(res.user);
    // Register for push notifications after registration
    if (Platform.OS !== 'web') {
      registerForPushNotifications();
    }
  };

  const logout = async () => {
    // Remove push token before logging out
    if (Platform.OS !== 'web') {
      await removePushToken();
    }
    await AsyncStorage.removeItem('auth_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.get('/auth/me');
      setUser(userData);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
