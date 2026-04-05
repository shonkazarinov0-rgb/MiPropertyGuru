import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from './api';
import { registerForPushNotifications, removePushToken, addNotificationListeners } from './notifications';
import { router } from 'expo-router';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  currentMode?: 'client' | 'contractor';
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
  login: (email: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  register: (data: any) => Promise<any>;
  completeRegistration: (email: string, code: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchMode: (mode: 'client' | 'contractor') => Promise<void>;
  setGuestMode: () => Promise<void>;
  isClientMode: boolean;
  isContractorMode: boolean;
  sessionExpired: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    const cleanup = addNotificationListeners(
      (notification) => {
        console.log('Notification received:', notification);
      },
      (response) => {
        try {
          const data = response.notification.request.content.data;
          if (data?.type === 'message' && data?.conversation_id) {
            router.push(`/chat/${data.conversation_id}`);
          }
        } catch (e: any) {
          console.error('Notification navigation crash:', e);
          console.error('Notification navigation message:', e?.message);
        }
      }
    );

    return cleanup;
  }, [user]);

  const checkAuth = async () => {
    try {
      const guestMode = await AsyncStorage.getItem('guest_mode');
      if (guestMode === 'true') {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('auth_token');
      const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');

      if (token && keepLoggedIn !== 'true') {
        const lastSessionTime = await AsyncStorage.getItem('last_session_time');
        const now = Date.now();

        if (lastSessionTime && now - parseInt(lastSessionTime, 10) > 24 * 60 * 60 * 1000) {
          await AsyncStorage.removeItem('auth_token');
          setLoading(false);
          return;
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get('/auth/me');

        if (userData.session_invalid) {
          setSessionExpired(true);
          await AsyncStorage.removeItem('auth_token');
          setLoading(false);
          return;
        }

        if (userData.role === 'contractor') {
          const savedMode = await AsyncStorage.getItem('user_mode');
          if (savedMode === 'client' || savedMode === 'contractor') {
            userData.currentMode = savedMode;
          } else if (!userData.currentMode) {
            userData.currentMode = 'contractor';
          }
        }

        setUser(userData);
        await AsyncStorage.setItem('last_session_time', Date.now().toString());

        if (Platform.OS !== 'web') {
          try {
            registerForPushNotifications();
          } catch (e: any) {
            console.error('Push registration crash during checkAuth:', e);
            console.error('Push registration message:', e?.message);
          }
        }
      } catch (e: any) {
        console.error('checkAuth crash:', e);
        console.error('checkAuth message:', e?.message);

        if (e?.message?.includes('session') || e?.status === 401) {
          setSessionExpired(true);
        }

        await AsyncStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (e: any) {
      console.error('Outer checkAuth crash:', e);
      console.error('Outer checkAuth message:', e?.message);
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, keepLoggedIn: boolean = true) => {
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');

    let locationData: { lat?: number; lng?: number } = {};

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        locationData = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };
      }
    } catch (e: any) {
      console.log('Location unavailable during login:', e?.message);
    }

    const res = await api.post('/auth/login', {
      email,
      password,
      keep_logged_in: keepLoggedIn,
      ...locationData,
      device_info: Platform.OS,
    });

    if (res.suspicious_activity) {
      console.warn('Suspicious activity detected:', res.suspicious_reasons);
    }

    await AsyncStorage.setItem('auth_token', res.token);
    await AsyncStorage.setItem('keep_logged_in', keepLoggedIn ? 'true' : 'false');
    await AsyncStorage.setItem('last_session_time', Date.now().toString());

    if (res.session_id) {
      await AsyncStorage.setItem('session_id', res.session_id);
    }

    if (res.user.role === 'contractor' && !res.user.currentMode) {
      res.user.currentMode = 'contractor';
    }

    setUser(res.user);
    setSessionExpired(false);

    if (Platform.OS !== 'web') {
      try {
        registerForPushNotifications();
      } catch (e: any) {
        console.error('Push registration crash after login:', e);
        console.error('Push registration message:', e?.message);
      }
    }
  };

  const register = async (data: any) => {
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');
    return await api.post('/auth/register', data);
  };

  const completeRegistration = async (email: string, code: string) => {
    const res = await api.post('/auth/complete-registration', { email, code });

    await AsyncStorage.setItem('auth_token', res.token);
    await AsyncStorage.setItem('keep_logged_in', 'true');
    await AsyncStorage.removeItem('guest_mode');
    setIsGuest(false);

    if (res.user.role === 'contractor' && !res.user.currentMode) {
      res.user.currentMode = 'contractor';
    }

    setUser(res.user);

    if (Platform.OS !== 'web') {
      try {
        registerForPushNotifications();
      } catch (e: any) {
        console.log('Push notification registration failed:', e);
      }
    }

    return res;
  };

  const logout = async () => {
    try {
      if (Platform.OS !== 'web') {
        try {
          await removePushToken();
        } catch (e: any) {
          console.error('removePushToken crash:', e);
          console.error('removePushToken message:', e?.message);
        }
      }

      await AsyncStorage.multiRemove([
        'auth_token',
        'keep_logged_in',
        'last_session_time',
        'session_id',
        'user_mode',
      ]);

      setUser(null);
      setSessionExpired(false);
    } catch (e: any) {
      console.error('logout crash:', e);
      console.error('logout message:', e?.message);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.get('/auth/me');

      if (user?.currentMode) {
        userData.currentMode = user.currentMode;
      } else if (userData.role === 'contractor') {
        const savedMode = await AsyncStorage.getItem('user_mode');
        if (savedMode === 'client' || savedMode === 'contractor') {
          userData.currentMode = savedMode;
        } else if (!userData.currentMode) {
          userData.currentMode = 'contractor';
        }
      }

      setUser(userData);
    } catch (e: any) {
      console.error('refreshUser crash:', e);
      console.error('refreshUser message:', e?.message);
    }
  };

  const switchMode = async (mode: 'client' | 'contractor') => {
    console.log('switchMode called with:', mode);

    if (!user) {
      console.log('switchMode aborted: no user');
      return;
    }

    if (user.role !== 'contractor') {
      console.log('switchMode aborted: user is not contractor');
      return;
    }

    if (user.currentMode === mode) {
      console.log('switchMode aborted: already in mode', mode);
      return;
    }

    try {
      console.log('switchMode about to call API');
      await api.post('/switch-mode', { mode });
      console.log('switchMode API success');
    } catch (e: any) {
      console.error('switchMode API crash:', e);
      console.error('switchMode API message:', e?.message);
      console.log('Mode switch API not available, switching locally anyway');
    }

    try {
      await AsyncStorage.setItem('user_mode', mode);
      console.log('switchMode saved mode to storage:', mode);
    } catch (e: any) {
      console.error('switchMode storage crash:', e);
      console.error('switchMode storage message:', e?.message);
    }

    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const updatedUser = { ...prevUser, currentMode: mode };
      console.log('switchMode updating local user state:', updatedUser.currentMode);
      return updatedUser;
    });
  };

  const setGuestMode = async () => {
    await AsyncStorage.setItem('guest_mode', 'true');
    setIsGuest(true);
  };

  const isClientMode =
    user?.role === 'client' || (user?.role === 'contractor' && user?.currentMode === 'client');

  const isContractorMode =
    user?.role === 'contractor' && user?.currentMode !== 'client';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        completeRegistration,
        logout,
        refreshUser,
        switchMode,
        setGuestMode,
        isClientMode,
        isContractorMode,
        sessionExpired,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
