import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/auth-context';
import { colors, spacing, radius } from '../src/theme';

const CONTRACTOR_TYPES = [
  "Electrician", "Plumber", "Handyman", "Carpenter", "Painter",
  "Roofer", "HVAC Technician", "Mason", "Welder", "General Contractor",
  "Tiler", "Landscaper", "Glazier", "Demolition Specialist",
  "Drywall Installer", "Flooring Specialist", "Insulation Installer",
  "Concrete Specialist", "Fence Installer", "Deck Builder",
  "Cabinet Maker", "Window Installer", "Siding Contractor",
  "Solar Panel Installer", "Pool Contractor", "Locksmith",
  "Garage Door Specialist", "Septic System Specialist",
  "Waterproofing Specialist", "Foundation Specialist"
];

export default function AuthScreen() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [role, setRole] = useState<'client' | 'contractor'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [contractorType, setContractorType] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [bio, setBio] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)/home" />;

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setSubmitting(true); setError('');
    try { await login(email, password); }
    catch (e: any) { setError(e.message || 'Login failed'); }
    finally { setSubmitting(false); }
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) { setError('Please fill in all fields'); return; }
    if (role === 'contractor' && !contractorType) { setError('Please select your trade'); return; }
    setSubmitting(true); setError('');
    try {
      await register({
        name, email, phone, password, role,
        contractor_type: role === 'contractor' ? contractorType : undefined,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : 0,
        bio,
      });
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    finally { setSubmitting(false); }
  };

  const filteredTypes = CONTRACTOR_TYPES.filter(t =>
    t.toLowerCase().includes(typeSearch.toLowerCase())
  );

  if (mode === 'welcome') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.welcomeContent}>
          <View style={s.logoContainer}>
            <View style={s.logoIcon}>
              <Ionicons name="construct" size={48} color={colors.paper} />
            </View>
            <Text style={s.appName}>ConstructConnect</Text>
            <Text style={s.tagline}>Find trusted contractors near you</Text>
          </View>
          <View style={s.featureList}>
            {[
              { icon: 'location', text: 'Find contractors on a live map' },
              { icon: 'star', text: 'Read reviews & view portfolios' },
              { icon: 'chatbubbles', text: 'Message contractors directly' },
              { icon: 'document-text', text: 'Generate AI-powered contracts' },
            ].map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Ionicons name={f.icon as any} size={22} color={colors.primary} />
                <Text style={s.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity testID="get-started-btn" style={s.primaryBtn} onPress={() => setMode('register')}>
            <Text style={s.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="go-login-btn" style={s.linkBtn} onPress={() => setMode('login')}>
            <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Log In</Text></Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'login') {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity testID="back-to-welcome" style={s.backBtn} onPress={() => setMode('welcome')}>
              <Ionicons name="arrow-back" size={24} color={colors.secondary} />
            </TouchableOpacity>
            <Text style={s.formTitle}>Welcome Back</Text>
            <Text style={s.formSubtitle}>Log in to your account</Text>
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <View style={s.inputGroup}>
              <Text style={s.label}>Email</Text>
              <TextInput testID="login-email" style={s.input} placeholder="your@email.com"
                placeholderTextColor={colors.placeholder} value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={s.inputGroup}>
              <Text style={s.label}>Password</Text>
              <TextInput testID="login-password" style={s.input} placeholder="Enter password"
                placeholderTextColor={colors.placeholder} value={password} onChangeText={setPassword}
                secureTextEntry />
            </View>
            <TouchableOpacity testID="login-submit-btn" style={s.primaryBtn} onPress={handleLogin} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.secondary} /> : <Text style={s.primaryBtnText}>Log In</Text>}
            </TouchableOpacity>
            <TouchableOpacity testID="go-register-btn" style={s.linkBtn} onPress={() => { setMode('register'); setError(''); }}>
              <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Sign Up</Text></Text>
            </TouchableOpacity>
            <View style={s.demoHint}>
              <Text style={s.demoText}>Demo: client@demo.com / demo123</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="back-to-welcome-reg" style={s.backBtn} onPress={() => setMode('welcome')}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={s.formTitle}>Create Account</Text>
          <Text style={s.formSubtitle}>Join ConstructConnect today</Text>
          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Text style={s.sectionLabel}>I am a...</Text>
          <View style={s.roleRow}>
            <TouchableOpacity testID="role-client-btn" style={[s.roleBtn, role === 'client' && s.roleBtnActive]}
              onPress={() => setRole('client')}>
              <Ionicons name="person" size={24} color={role === 'client' ? colors.paper : colors.secondary} />
              <Text style={[s.roleBtnText, role === 'client' && s.roleBtnTextActive]}>Client</Text>
              <Text style={[s.roleDesc, role === 'client' && s.roleDescActive]}>Looking for work</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="role-contractor-btn" style={[s.roleBtn, role === 'contractor' && s.roleBtnActive]}
              onPress={() => setRole('contractor')}>
              <Ionicons name="construct" size={24} color={role === 'contractor' ? colors.paper : colors.secondary} />
              <Text style={[s.roleBtnText, role === 'contractor' && s.roleBtnTextActive]}>Contractor</Text>
              <Text style={[s.roleDesc, role === 'contractor' && s.roleDescActive]}>Offering services</Text>
            </TouchableOpacity>
          </View>

          {role === 'contractor' && (
            <View style={s.feeNotice}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={s.feeText}>Contractor accounts require a $25/month subscription fee. Payment integration coming soon.</Text>
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <TextInput testID="register-name" style={s.input} placeholder="John Smith"
              placeholderTextColor={colors.placeholder} value={name} onChangeText={setName} />
          </View>
          <View style={s.inputGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput testID="register-email" style={s.input} placeholder="your@email.com"
              placeholderTextColor={colors.placeholder} value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={s.inputGroup}>
            <Text style={s.label}>Phone Number</Text>
            <TextInput testID="register-phone" style={s.input} placeholder="+1 555 123 4567"
              placeholderTextColor={colors.placeholder} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" />
          </View>
          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput testID="register-password" style={s.input} placeholder="Create a password"
              placeholderTextColor={colors.placeholder} value={password} onChangeText={setPassword}
              secureTextEntry />
          </View>

          {role === 'contractor' && (
            <>
              <View style={s.inputGroup}>
                <Text style={s.label}>Your Trade *</Text>
                <TouchableOpacity testID="contractor-type-picker" style={s.pickerBtn} onPress={() => setShowTypePicker(true)}>
                  <Text style={contractorType ? s.pickerText : s.pickerPlaceholder}>
                    {contractorType || 'Select your trade'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={s.inputGroup}>
                <Text style={s.label}>Hourly Rate ($)</Text>
                <TextInput testID="register-rate" style={s.input} placeholder="e.g. 75"
                  placeholderTextColor={colors.placeholder} value={hourlyRate} onChangeText={setHourlyRate}
                  keyboardType="numeric" />
              </View>
              <View style={s.inputGroup}>
                <Text style={s.label}>Short Bio</Text>
                <TextInput testID="register-bio" style={[s.input, s.bioInput]} placeholder="Describe your experience..."
                  placeholderTextColor={colors.placeholder} value={bio} onChangeText={setBio}
                  multiline numberOfLines={3} textAlignVertical="top" />
              </View>
            </>
          )}

          <TouchableOpacity testID="register-submit-btn" style={s.primaryBtn} onPress={handleRegister} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.secondary} /> :
              <Text style={s.primaryBtnText}>{role === 'contractor' ? 'Register ($25/mo)' : 'Create Account'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity testID="go-login-from-register" style={s.linkBtn} onPress={() => { setMode('login'); setError(''); }}>
            <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Log In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showTypePicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Your Trade</Text>
              <TouchableOpacity testID="close-type-picker" onPress={() => setShowTypePicker(false)}>
                <Ionicons name="close" size={28} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput testID="type-search-input" style={s.searchInput} placeholder="Search trades..."
              placeholderTextColor={colors.placeholder} value={typeSearch} onChangeText={setTypeSearch} />
            <FlatList
              data={filteredTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity testID={`type-${item.toLowerCase().replace(/\s/g, '-')}`}
                  style={[s.typeItem, contractorType === item && s.typeItemActive]}
                  onPress={() => { setContractorType(item); setShowTypePicker(false); setTypeSearch(''); }}>
                  <Text style={[s.typeText, contractorType === item && s.typeTextActive]}>{item}</Text>
                  {contractorType === item && <Ionicons name="checkmark" size={22} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.paper },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.paper },
  welcomeContent: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.l },
  logoContainer: { alignItems: 'center', marginBottom: spacing.xl },
  logoIcon: {
    width: 88, height: 88, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.m,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  appName: { fontSize: 34, fontWeight: '700', color: colors.secondary, letterSpacing: 0.37 },
  tagline: { fontSize: 17, color: colors.textSecondary, marginTop: spacing.xs },
  featureList: { marginBottom: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.s + 2 },
  featureText: { fontSize: 16, color: colors.secondary, marginLeft: spacing.m },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.l, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.m,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '600', color: colors.secondary },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.m },
  linkText: { fontSize: 15, color: colors.textSecondary },
  linkBold: { fontWeight: '600', color: colors.primary },
  backBtn: { marginBottom: spacing.m, width: 44, height: 44, justifyContent: 'center' },
  formScroll: { paddingHorizontal: spacing.l, paddingTop: spacing.m, paddingBottom: spacing.xxl },
  formTitle: { fontSize: 34, fontWeight: '700', color: colors.secondary, marginBottom: spacing.xs },
  formSubtitle: { fontSize: 17, color: colors.textSecondary, marginBottom: spacing.l },
  errorText: {
    fontSize: 14, color: colors.error, backgroundColor: '#FFF0F0',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: radius.s, marginBottom: spacing.m,
  },
  inputGroup: { marginBottom: spacing.m },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background, borderRadius: radius.s, paddingHorizontal: spacing.m,
    paddingVertical: 14, fontSize: 17, color: colors.textPrimary, borderWidth: 1, borderColor: 'transparent',
  },
  bioInput: { height: 80, paddingTop: 14 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.secondary, marginBottom: spacing.s, marginTop: spacing.s },
  roleRow: { flexDirection: 'row', gap: spacing.m, marginBottom: spacing.m },
  roleBtn: {
    flex: 1, padding: spacing.m, borderRadius: radius.m, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleBtnText: { fontSize: 16, fontWeight: '600', color: colors.secondary, marginTop: spacing.xs },
  roleBtnTextActive: { color: colors.paper },
  roleDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roleDescActive: { color: 'rgba(255,255,255,0.8)' },
  feeNotice: {
    flexDirection: 'row', backgroundColor: '#FFF8EC', borderRadius: radius.s,
    padding: spacing.m, marginBottom: spacing.m, gap: spacing.s, alignItems: 'flex-start',
  },
  feeText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: radius.s, paddingHorizontal: spacing.m,
    paddingVertical: 14, borderWidth: 1, borderColor: 'transparent',
  },
  pickerText: { fontSize: 17, color: colors.textPrimary },
  pickerPlaceholder: { fontSize: 17, color: colors.placeholder },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '70%', paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  searchInput: {
    margin: spacing.m, backgroundColor: colors.background, borderRadius: radius.s,
    paddingHorizontal: spacing.m, paddingVertical: 12, fontSize: 16, color: colors.textPrimary,
  },
  typeItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  typeItemActive: { backgroundColor: '#FFF8EC' },
  typeText: { fontSize: 16, color: colors.secondary },
  typeTextActive: { fontWeight: '600', color: colors.primary },
  demoHint: { alignItems: 'center', marginTop: spacing.s },
  demoText: { fontSize: 12, color: colors.textDisabled },
});
