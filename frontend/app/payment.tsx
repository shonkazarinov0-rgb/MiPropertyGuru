import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth-context';
import { api } from '../src/api';
import { colors } from '../src/theme';
import { router } from 'expo-router';
import Logo from '../src/components/Logo';

export default function PaymentScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');
    try {
      const origin = Platform.OS === 'web' 
        ? window.location.origin 
        : process.env.EXPO_PUBLIC_BACKEND_URL || '';
      
      const res = await api.post('/payments/create-subscription', { origin_url: origin });
      
      if (res.url) {
        if (Platform.OS === 'web') {
          window.location.href = res.url;
        } else {
          await Linking.openURL(res.url);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      await refreshUser();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Logo size={80} />
        <Text style={styles.title}>Activate Your Profile</Text>
        <Text style={styles.subtitle}>
          Welcome, {user?.name}! To start receiving clients, please activate your contractor subscription.
        </Text>

        <View style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$25</Text>
            <Text style={styles.perMonth}>/month</Text>
          </View>
          <Text style={styles.planName}>Professional Contractor Plan</Text>
          
          <View style={styles.features}>
            <Feature icon="checkmark-circle" text="Appear on the map for clients" />
            <Feature icon="checkmark-circle" text="Receive messages from clients" />
            <Feature icon="checkmark-circle" text="Showcase your portfolio" />
            <Feature icon="checkmark-circle" text="AI-powered contract generation" />
            <Feature icon="checkmark-circle" text="Build your reputation with reviews" />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity 
          style={styles.subscribeBtn} 
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="card" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleCheckStatus} disabled={loading}>
          <Text style={styles.secondaryBtnText}>I've already paid - Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          You can cancel anytime. Your subscription helps maintain the platform and connect you with quality clients.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as any} size={20} color={colors.success} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 20, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 10 },
  card: { backgroundColor: colors.paper, borderRadius: 16, padding: 24, marginTop: 24, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  price: { fontSize: 48, fontWeight: '700', color: colors.primary },
  perMonth: { fontSize: 18, color: colors.textSecondary, marginBottom: 10, marginLeft: 4 },
  planName: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 4 },
  features: { marginTop: 20, width: '100%' },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  featureText: { fontSize: 14, color: colors.text, marginLeft: 12, flex: 1 },
  error: { color: colors.error, marginTop: 16, textAlign: 'center' },
  subscribeBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginTop: 24, width: '100%' },
  subscribeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondaryBtn: { marginTop: 16, padding: 12 },
  secondaryBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  logoutBtn: { marginTop: 8, padding: 12 },
  logoutBtnText: { color: colors.textSecondary, fontSize: 14 },
  note: { fontSize: 12, color: colors.textDisabled, textAlign: 'center', marginTop: 24, paddingHorizontal: 20, lineHeight: 18 },
});
