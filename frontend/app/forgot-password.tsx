import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../src/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Simulate API call - replace with actual password reset when email is configured
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.successContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={40} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            If an account exists for {email}, you will receive password reset instructions shortly.
          </Text>
          <Text style={styles.noteText}>
            Don't see the email? Check your spam folder or contact support for assistance.
          </Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.back()}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={60} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you instructions to reset your password.
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.textDisabled}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Send Reset Instructions</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.contactBtn} onPress={() => router.back()}>
          <Text style={styles.contactBtnText}>Remember your password? Log in</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  backBtn: { padding: 8 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.paper, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.error, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  contactBtn: { marginTop: 20, alignItems: 'center', padding: 12 },
  contactBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  successText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  noteText: { fontSize: 13, color: colors.textDisabled, textAlign: 'center', lineHeight: 20, marginBottom: 32 },
  backToLoginBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  backToLoginText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
