import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from './api';
import { registerForPushNotifications, removePushToken, addNotificationListeners } from './notifications';
import { router } from 'expo-router';

// ── User Type ──────────────────────────────────────────────────────────────────
export interface User {
  // Core
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'contractor';
  currentMode?: 'client' | 'contractor';
  bio?: string;

  // Contractor profile
  contractor_type?: string;
  trades?: string[];
  languages?: string[];
  hourly_rate?: number;
  experience_years?: number;
  rating?: number;
  review_count?: number;
  service_radius?: number;
  subscription_status?: string;
  subscription_fee?: number;
  work_photos?: string[];

  // Location
  isonline?: boolean;
  live_location_enabled?: boolean;
  current_lat?: number;
  current_lng?: number;
  current_location?: { lat: number; lng: number } | null;
  work_locations?: Array<{ name: string; lat: number; lng: number }>;

  // Phone
  phone_visible?: boolean;
  phone_verified?: boolean;

  // License
  has_license?: boolean;
  license_number?: string;
  license_type?: string;
  license_expiry?: string;
  license_image?: string;
}

// ── Auth Context Type ──────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, keepLoggedIn?: boolean) => Promise<void>;
  register: ( any) => Promise<any>;
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function applyContractorMode(userData: User, savedMode: string | null): User {
  if (userData.role !== 'contractor') return userData;
  if (savedMode === 'client' || savedMode === 'contractor') {
    return { ...userData, currentMode: savedMode };
  }
  return { ...userData, currentMode: userData.currentMode ?? 'contractor' };
}

async function getSavedMode(): Promise<string | null> {
  return AsyncStorage.getItem('user_mode');
}

// ── Context ────────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    void checkAuth();
  }, []);

  // ── Notification Listeners ─────────────────────────────────────────────────
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
              router.push(`/chat/${data.conversation_id}` as any);
            }
          } catch (e: any) {
            console.error('Notification navigation error:', e?.message);
          }
        }
    );

    return cleanup;
  }, [user]);

  // ── Register Push (fire-and-forget) ───────────────────────────────────────
  const tryRegisterPush = () => {
    if (Platform.OS === 'web') return;
    void registerForPushNotifications().catch((e: any) => {
      console.error('Push registration error:', e?.message);
    });
  };

  // ── Check Auth on Launch ───────────────────────────────────────────────────
  const checkAuth = async () => {
    try {
      const guestMode = await AsyncStorage.getItem('guest_mode');
      if (guestMode === 'true') {
        setIsGuest(true);
        return;
      }

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) return;

      const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');
      if (keepLoggedIn !== 'true') {
        const lastSessionTime = await AsyncStorage.getItem('last_session_time');
        if (lastSessionTime && Date.now() - parseInt(lastSessionTime, 10) > SESSION_EXPIRY_MS) {
          await AsyncStorage.removeItem('auth_token');
          return;
        }
      }

      const userData: User = await api.get('/auth/me');

      if ((userData as any).session_invalid) {
        setSessionExpired(true);
        await AsyncStorage.removeItem('auth_token');
        return;
      }

      const savedMode = await getSavedMode();
      const resolvedUser = applyContractorMode(userData, savedMode);
      setUser(resolvedUser);
      await AsyncStorage.setItem('last_session_time', Date.now().toString());
      tryRegisterPush();
    } catch (e: any) {
      console.error('checkAuth error:', e?.message);
      if (e?.message?.includes('session') || e?.status === 401) {
        setSessionExpired(true);
      }
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string, keepLoggedIn = true) => {
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');

    let locationData: { lat?: number; lng?: number } = {};
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        locationData = { lat: loc.coords.latitude, lng: loc.coords.longitude };
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

    await Promise.all([
      AsyncStorage.setItem('auth_token', res.token),
      AsyncStorage.setItem('keep_logged_in', keepLoggedIn ? 'true' : 'false'),
      AsyncStorage.setItem('last_session_time', Date.now().toString()),
      res.session_id ? AsyncStorage.setItem('session_id', res.session_id) : Promise.resolve(),
    ]);

    const resolvedUser = applyContractorMode(res.user, await getSavedMode());
    setUser(resolvedUser);
    setSessionExpired(false);
    tryRegisterPush();
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async ( any) => {
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');
    return api.post('/auth/register', data);
  };

  // ── Complete Registration ──────────────────────────────────────────────────
  const completeRegistration = async (email: string, code: string) => {
    const res = await api.post('/auth/complete-registration', { email, code });

    await Promise.all([
      AsyncStorage.setItem('auth_token', res.token),
      AsyncStorage.setItem('keep_logged_in', 'true'),
      AsyncStorage.removeItem('guest_mode'),
    ]);

    setIsGuest(false);
    const resolvedUser = applyContractorMode(res.user, await getSavedMode());
    setUser(resolvedUser);
    tryRegisterPush();

    return res;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      if (Platform.OS !== 'web') {
        await removePushToken().catch((e: any) => {
          console.error('removePushToken error:', e?.message);
        });
      }

      await AsyncStorage.multiRemove([
        'auth_token',
        'keep_logged_in',
        'last_session_time',
        'session_id',
        'user_mode',
      ]);
    } catch (e: any) {
      console.error('logout error:', e?.message);
    } finally {
      setUser(null);
      setSessionExpired(false);
    }
  };

  // ── Refresh User ───────────────────────────────────────────────────────────
  const refreshUser = async () => {
    try {
      const userData: User = await api.get('/auth/me');
      const savedMode = user?.currentMode ?? (await getSavedMode());
      const resolvedUser = applyContractorMode(userData, savedMode);
      setUser(resolvedUser);
    } catch (e: any) {
      console.error('refreshUser error:', e?.message);
    }
  };

  // ── Switch Mode ────────────────────────────────────────────────────────────
  const switchMode = async (mode: 'client' | 'contractor') => {
    if (!user || user.role !== 'contractor' || user.currentMode === mode) return;

    try {
      await api.post('/switch-mode', { mode });
    } catch (e: any) {
      console.warn('switchMode API unavailable, switching locally:', e?.message);
    }

    try {
      await AsyncStorage.setItem('user_mode', mode);
    } catch (e: any) {
      console.error('switchMode storage error:', e?.message);
    }

    setUser((prev) => prev ? { ...prev, currentMode: mode } : prev);
  };

  // ── Guest Mode ─────────────────────────────────────────────────────────────
  const setGuestMode = async () => {
    await AsyncStorage.setItem('guest_mode', 'true');
    setIsGuest(true);
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const isClientMode =
      user?.role === 'client' ||
      (user?.role === 'contractor' && user?.currentMode === 'client');

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
