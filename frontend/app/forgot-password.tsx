import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || '';

const colors = {
  primary: '#D35400',
  primaryLight: '#FFF5F0',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  paper: '#FFFFFF',
  border: '#E5E7EB',
  green: '#10B981',
  red: '#EF4444',
};

type Step = 'email' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('code');
        Alert.alert('Code Sent', 'A 6-digit verification code has been sent to your email.');
      } else {
        setError(data.detail || 'Failed to send code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), code }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setStep('newPassword');
      } else {
        setError(data.detail || 'Invalid or expired code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          code,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
      } else {
        setError(data.detail || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we will send you a verification code to reset your password.
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text style={styles.buttonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="keypad" size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>Enter Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to {email}. Enter it below to continue.
      </Text>

      <View style={styles.codeInputContainer}>
        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor={colors.textSecondary}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendButton} onPress={handleSendCode}>
        <Text style={styles.resendText}>Didn't receive code? </Text>
        <Text style={styles.resendLink}>Resend</Text>
      </TouchableOpacity>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be at least 6 characters long.
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor={colors.textSecondary}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.paper} />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
        <Ionicons name="checkmark-circle" size={48} color={colors.green} />
      </View>
      <Text style={styles.title}>Password Reset!</Text>
      <Text style={styles.subtitle}>
        Your password has been successfully reset. You can now log in with your new password.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          // Navigate back to login - works on both web and mobile
          if (Platform.OS === 'web') {
            window.location.href = '/';
          } else {
            router.dismissAll();
            router.replace('/');
          }
        }}
      >
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          {step !== 'success' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step === 'email') {
                  router.back();
                } else if (step === 'code') {
                  setStep('email');
                } else if (step === 'newPassword') {
                  setStep('code');
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}

          <View style={styles.content}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'email' && renderEmailStep()}
            {step === 'code' && renderCodeStep()}
            {step === 'newPassword' && renderNewPasswordStep()}
            {step === 'success' && renderSuccessStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    flexDirection: 'row',
    marginTop: 24,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
