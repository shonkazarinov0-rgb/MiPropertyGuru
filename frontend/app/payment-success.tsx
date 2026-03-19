import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth-context';
import { api } from '../src/api';
import { colors } from '../src/theme';
import { router, useLocalSearchParams } from 'expo-router';
import Logo from '../src/components/Logo';

export default function PaymentSuccessScreen() {
  const { refreshUser } = useAuth();
  const { session_id } = useLocalSearchParams<{ session_id?: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'checking' | 'success' | 'pending'>('checking');

  useEffect(() => {
    checkPayment();
  }, []);

  const checkPayment = async () => {
    try {
      if (session_id) {
        const res = await api.get(`/payments/status/${session_id}`);
        if (res.payment_status === 'paid') {
          setStatus('success');
          await refreshUser();
        } else {
          setStatus('pending');
        }
      } else {
        await refreshUser();
        setStatus('success');
      }
    } catch {
      setStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/(tabs)/home');
  };

  const handleRetry = () => {
    router.replace('/payment');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Verifying your payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={60} color="#fff" />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Your contractor profile is now active. Clients can find you on the map and reach out for jobs.
          </Text>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Start Finding Clients</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo size={60} />
        <Ionicons name="time-outline" size={60} color={colors.warning} style={{ marginTop: 20 }} />
        <Text style={styles.title}>Payment Pending</Text>
        <Text style={styles.subtitle}>
          We're still processing your payment. This usually takes just a moment.
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={checkPayment}>
          <Text style={styles.retryBtnText}>Check Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={handleRetry}>
          <Text style={styles.backBtnText}>Go Back to Payment</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 16, color: colors.textSecondary },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 24, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 24, paddingHorizontal: 20 },
  continueBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginTop: 32 },
  continueBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  retryBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginTop: 24 },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { color: colors.textSecondary, fontSize: 14 },
});
