import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth-context';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  border: '#E5E7EB',
  red: '#EF4444',
};

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email, type } = useLocalSearchParams<{ email: string; type: string }>(); // type: 'email' or 'phone'
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const verifyType = type || 'email';
  const verifyTarget = email || user?.email;

  // Prevent back navigation - user MUST verify to proceed
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          'Email Verification Required',
          'You must verify your email to complete registration. Your account will not be created if you leave now.',
          [
            { text: 'Stay and Verify', style: 'cancel' },
            { 
              text: 'Cancel Registration', 
              style: 'destructive',
              onPress: async () => {
                // Delete unverified account and logout
                try {
                  if (verifyTarget) {
                    await api.post('/auth/cancel-registration', { email: verifyTarget });
                  }
                } catch (e) {
                  console.log('Error canceling registration:', e);
                }
                router.replace('/');
              }
            },
          ]
        );
        return true; // Prevent default back behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [verifyTarget])
  );

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-code', {
        email: verifyTarget,
        code: code,
        type: verifyType,
      });
      
      await refreshUser();
      
      // Auto-redirect to home after successful verification
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    try {
      await api.post('/auth/resend-verification', {
        email: verifyTarget,
        type: verifyType,
      });
      setCountdown(60); // 60 second cooldown
      Alert.alert('Code Sent', `A new verification code has been sent to your ${verifyType}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Verify {verifyType === 'phone' ? 'Phone' : 'Email'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Ionicons 
                name={verifyType === 'phone' ? 'phone-portrait-outline' : 'mail-outline'} 
                size={48} 
                color={colors.primary} 
              />
            </View>
          </View>

          <Text style={styles.title}>Verify Your {verifyType === 'phone' ? 'Phone' : 'Email'}</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to{' '}
            <Text style={styles.highlight}>{verifyTarget}</Text>
          </Text>

          <View style={styles.codeContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.border}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity 
              onPress={handleResend} 
              disabled={countdown > 0 || resending}
            >
              <Text style={[
                styles.resendLink,
                (countdown > 0 || resending) && styles.resendDisabled
              ]}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Make sure to check your spam folder if you don't see the email. The code expires in 10 minutes.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  skipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  iconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  highlight: {
    fontWeight: '600',
    color: colors.text,
  },
  codeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 20,
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  verifyBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.paper,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
