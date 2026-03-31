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
      // Check for guest mode first
      const guestMode = await AsyncStorage.getItem('guest_mode');
      if (guestMode === 'true') {
        setIsGuest(true);
        setLoading(false);
        return;
      }
      
      const token = await AsyncStorage.getItem('auth_token');
      const keepLoggedIn = await AsyncStorage.getItem('keep_logged_in');
      
      // If user didn't select "keep logged in" and it's a new app session, clear token
      if (token && keepLoggedIn !== 'true') {
        // Check if this is a fresh app launch vs just resuming
        const lastSessionTime = await AsyncStorage.getItem('last_session_time');
        const now = Date.now();
        // If more than 24 hours since last session, clear the token
        if (lastSessionTime && (now - parseInt(lastSessionTime)) > 24 * 60 * 60 * 1000) {
          await AsyncStorage.removeItem('auth_token');
          setLoading(false);
          return;
        }
      }
      
      if (token) {
        try {
          const userData = await api.get('/auth/me');
          // Check if session is still valid (not kicked by another login)
          if (userData.session_invalid) {
            setSessionExpired(true);
            await AsyncStorage.removeItem('auth_token');
            setLoading(false);
            return;
          }
          // Set default mode based on role
          if (userData.role === 'contractor') {
            // Restore saved mode preference
            const savedMode = await AsyncStorage.getItem('user_mode');
            if (savedMode === 'client' || savedMode === 'contractor') {
              userData.currentMode = savedMode;
            } else if (!userData.currentMode) {
              userData.currentMode = 'contractor';
            }
          }
          setUser(userData);
          // Update session time
          await AsyncStorage.setItem('last_session_time', Date.now().toString());
          // Register for push notifications after auth check
          if (Platform.OS !== 'web') {
            registerForPushNotifications();
          }
        } catch (e: any) {
          // Check if it's a session invalid error
          if (e.message?.includes('session') || e.status === 401) {
            setSessionExpired(true);
          }
          await AsyncStorage.removeItem('auth_token');
        }
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, keepLoggedIn: boolean = true) => {
    // Clear guest mode when logging in
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');
    
    // Try to get device location for security tracking
    let locationData: { lat?: number; lng?: number } = {};
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        locationData = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch (e) {
      // Location not available - that's okay
    }
    
    const res = await api.post('/auth/login', { 
      email, 
      password, 
      keep_logged_in: keepLoggedIn,
      ...locationData,
      device_info: Platform.OS
    });
    
    // Check for suspicious activity warning
    if (res.suspicious_activity) {
      // Don't block login but alert user
      console.warn('Suspicious activity detected:', res.suspicious_reasons);
    }
    
    await AsyncStorage.setItem('auth_token', res.token);
    // Save keep_logged_in preference
    await AsyncStorage.setItem('keep_logged_in', keepLoggedIn ? 'true' : 'false');
    await AsyncStorage.setItem('last_session_time', Date.now().toString());
    // Store session ID for validation
    if (res.session_id) {
      await AsyncStorage.setItem('session_id', res.session_id);
    }
    // Set default mode
    if (res.user.role === 'contractor' && !res.user.currentMode) {
      res.user.currentMode = 'contractor';
    }
    setUser(res.user);
    setSessionExpired(false);
    // Register for push notifications after login
    if (Platform.OS !== 'web') {
      registerForPushNotifications();
    }
  };

  const register = async (data: any) => {
    // Clear guest mode when registering
    setIsGuest(false);
    await AsyncStorage.removeItem('guest_mode');
    
    // Step 1: Submit registration (sends verification code, doesn't create account yet)
    const res = await api.post('/auth/register', data);
    
    // Don't set user or token yet - they need to verify first
    // Return the response so frontend can redirect to verification
    return res;
  };
  
  const completeRegistration = async (email: string, code: string) => {
    // Step 2: Complete registration after code verification
    const res = await api.post('/auth/complete-registration', { email, code });
    
    // NOW set token and user
    await AsyncStorage.setItem('auth_token', res.token);
    await AsyncStorage.setItem('keep_logged_in', 'true');
    await AsyncStorage.removeItem('guest_mode'); // Clear guest mode after registration
    setIsGuest(false); // Ensure guest flag is cleared
    
    // Set default mode
    if (res.user.role === 'contractor') {
      res.user.currentMode = 'contractor';
    }
    setUser(res.user);
    
    // Register for push notifications
    if (Platform.OS !== 'web') {
      registerForPushNotifications();
    }
    
    return res;
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
      } else if (userData.role === 'contractor') {
        // Restore saved mode preference
        const savedMode = await AsyncStorage.getItem('user_mode');
        if (savedMode === 'client' || savedMode === 'contractor') {
          userData.currentMode = savedMode;
        } else if (!userData.currentMode) {
          userData.currentMode = 'contractor';
        }
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

  const setGuestMode = async () => {
    await AsyncStorage.setItem('guest_mode', 'true');
    setIsGuest(true);
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
      completeRegistration,
      logout, 
      refreshUser, 
      switchMode,
      setGuestMode,
      isClientMode,
      isContractorMode,
      sessionExpired,
      isGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
