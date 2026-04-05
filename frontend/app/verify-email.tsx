import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Keyboard,
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
  const { email, phone } = useLocalSearchParams<{ email: string; phone?: string }>();
  
  const { completeRegistration } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentStep, setCurrentStep] = useState('email');
  const [phoneToVerify, setPhoneToVerify] = useState(phone || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (phone && phone.length > 0) {
      setPhoneToVerify(phone);
    }
  }, [phone]);

  const verifyTarget = currentStep === 'email' ? email : (phoneToVerify || '');

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setSuccessMessage('');

    if (code.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    if (!verifyTarget) {
      setErrorMessage('Email/Phone not found. Please register again.');
      setTimeout(() => {
        if (isMounted.current) router.replace('/');
      }, 1500);
      return;
    }

    setLoading(true);

    try {
      if (currentStep === 'email') {
        await api.post('/auth/verify-email-only', { email: verifyTarget, code });

        if (phoneToVerify && phoneToVerify.trim().length > 0) {
          try {
            await api.post('/auth/send-registration-phone-code', {
              phone: phoneToVerify,
              email: email,
            });

            if (!isMounted.current) return;

            setLoading(false);
            setCode('');
            setCountdown(0);
            setSuccessMessage('Email verified! Now verify your phone.');

            setTimeout(() => {
              if (isMounted.current) {
                setCurrentStep('phone');
                setSuccessMessage('');
              }
            }, 500);

            return;
          } catch (smsError) {
            try {
              await completeRegistration(email, code);
              if (isMounted.current) {
                setLoading(false);
                router.replace('/(tabs)/home');
              }
            } catch (regError) {
              if (isMounted.current) {
                setLoading(false);
                setErrorMessage('Registration failed');
              }
            }
            return;
          }
        } else {
          try {
            await completeRegistration(email, code);
            if (isMounted.current) {
              setLoading(false);
              router.replace('/(tabs)/home');
            }
          } catch (regError) {
            if (isMounted.current) {
              setLoading(false);
              setErrorMessage('Registration failed');
            }
          }
        }
      } else {
        try {
          await api.post('/auth/verify-registration-phone', {
            phone: phoneToVerify,
            code,
            email: email,
          });
          await completeRegistration(email, 'phone-verified');
          if (isMounted.current) {
            setLoading(false);
            router.replace('/(tabs)/home');
          }
        } catch (phoneError) {
          if (isMounted.current) {
            setLoading(false);
            setErrorMessage('Phone verification failed');
          }
        }
      }
    } catch (e) {
      if (isMounted.current) {
        setLoading(false);
        setErrorMessage('Invalid or expired code');
      }
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    setErrorMessage('');

    try {
      if (currentStep === 'email') {
        await api.post('/auth/resend-verification', { email: verifyTarget, type: 'email' });
      } else {
        await api.post('/auth/send-registration-phone-code', { phone: phoneToVerify, email: email });
      }
      setCountdown(60);
      setSuccessMessage('Code sent!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      setErrorMessage('Failed to resend code');
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
          <View style={styles.spacer} />
          <Text style={styles.headerTitle}>
            Verify {currentStep === 'phone' ? 'Phone' : 'Email'}
          </Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Ionicons
                name={currentStep === 'phone' ? 'phone-portrait-outline' : 'mail-outline'}
                size={48}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={styles.title}>
            Verify Your {currentStep === 'phone' ? 'Phone' : 'Email'}
          </Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit verification code to{' '}
            <Text style={styles.highlight}>{verifyTarget}</Text>
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.codeContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.border}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, (loading || code.length !== 6) && styles.btnDisabled]}
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
            <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || resending}>
              <Text
                style={[
                  styles.resendLink,
                  (countdown > 0 || resending) && styles.resendDisabled,
                ]}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              {currentStep === 'email'
                ? "Check your spam folder if you don't see the email. Code expires in 10 minutes."
                : 'Enter the SMS code sent to your phone. Code expires in 10 minutes.'}
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
  spacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    marginBottom: 16,
  },
  highlight: {
    fontWeight: '600',
    color: colors.text,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    textAlign: 'center',
  },
  successBox: {
    width: '100%',
    backgroundColor: colors.greenLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: colors.green,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
