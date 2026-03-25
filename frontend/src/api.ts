import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const getBaseUrl = () => {
  // Use environment variable or fallback to production Railway URL
  return process.env.EXPO_PUBLIC_BACKEND_URL || 
         Constants.expoConfig?.extra?.backendUrl || 
         'https://mipropertyguru-production.up.railway.app';
};

const request = async (method: string, path: string, body?: any) => {
  const token = await AsyncStorage.getItem('auth_token');
  const url = `${getBaseUrl()}/api${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `Request failed`);
  }
  return res.json();
};

export const api = {
  get: (path: string) => request('GET', path),
  post: (path: string, body?: any) => request('POST', path, body),
  put: (path: string, body: any) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
};
