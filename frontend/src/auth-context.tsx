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
  currentMode?: 'client' | 'contractor'; // For contractors who can switch modes
  contractor_type?: string;
  trades?: string[];
  bio?: string;
  hourly_rate?: number;
  experience_years?: number;
  live_location_enabled?: boolean;
  current_location?: { lat: number; lng: number } | null;
  work_locations?: Array<{ name: string; lat: number; lng: number }>;
  work_photos?: string[];
  rating?: number;
  review_count?: number;
  subscription_status?: string;
  subscription_fee?: number;
  service_radius?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchMode: (mode: 'client' | 'contractor') => Promise<void>;
  isClientMode: boolean;
  isContractorMode: boolean;
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
        // Set default mode based on role
        if (userData.role === 'contractor' && !userData.currentMode) {
          userData.currentMode = 'contractor';
        }
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
    // Set default mode
    if (res.user.role === 'contractor' && !res.user.currentMode) {
      res.user.currentMode = 'contractor';
    }
    setUser(res.user);
    // Register for push notifications after login
    if (Platform.OS !== 'web') {
      registerForPushNotifications();
    }
  };

  const register = async (data: any) => {
    const res = await api.post('/auth/register', data);
    await AsyncStorage.setItem('auth_token', res.token);
    // Set default mode
    if (res.user.role === 'contractor') {
      res.user.currentMode = 'contractor';
    }
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
      // Preserve current mode when refreshing
      if (user?.currentMode) {
        userData.currentMode = user.currentMode;
      } else if (userData.role === 'contractor' && !userData.currentMode) {
        userData.currentMode = 'contractor';
      }
      setUser(userData);
    } catch {}
  };

  const switchMode = async (mode: 'client' | 'contractor') => {
    if (!user) return;
    
    // Only contractors can switch modes
    if (user.role !== 'contractor') return;
    
    try {
      // Update on server (optional - could just be local)
      await api.post('/switch-mode', { mode });
    } catch (e) {
      console.log('Mode switch API not available, switching locally');
    }
    
    // Update local state
    setUser({ ...user, currentMode: mode });
    
    // Store mode preference
    await AsyncStorage.setItem('user_mode', mode);
  };

  // Computed properties for easy mode checking
  const isClientMode = user?.role === 'client' || (user?.role === 'contractor' && user?.currentMode === 'client');
  const isContractorMode = user?.role === 'contractor' && user?.currentMode !== 'client';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      refreshUser, 
      switchMode,
      isClientMode,
      isContractorMode 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
