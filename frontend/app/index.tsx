import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

function Logo({ size = 'large' }: { size?: 'large' | 'small' }) {
  const isLarge = size === 'large';
  const textColor = isLarge ? colors.paper : colors.secondary;
  const borderColor = isLarge ? colors.paper : colors.primary;
  const iconColor = isLarge ? colors.paper : colors.primary;
  const miColor = isLarge ? colors.logoYellow : colors.primary;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[s.logoHouse, isLarge ? s.logoHouseLg : s.logoHouseSm, { borderColor }]}>
        <Ionicons name="home" size={isLarge ? 32 : 20} color={iconColor} />
        <View style={[s.logoLeaf, isLarge ? s.logoLeafLg : s.logoLeafSm]}>
          <Ionicons name="leaf" size={isLarge ? 14 : 10} color={colors.logoGreen} />
        </View>
      </View>
      <View style={s.logoTextRow}>
        <Text style={[s.logoMi, isLarge && s.logoMiLg, { color: miColor }]}>mi</Text>
        <Text style={[s.logoProperty, isLarge && s.logoPropertyLg, { color: textColor }]}>Property</Text>
      </View>
      <Text style={[s.logoGuru, isLarge && s.logoGuruLg, { color: textColor }]}>GURU.</Text>
    </View>
  );
}

export default function AuthScreen() {
  const { user, loading, login, register, setGuestMode } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register' | 'choose'>('welcome');
  const [role, setRole] = useState<'client' | 'contractor'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [contractorType, setContractorType] = useState('');
  const [bio, setBio] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true); // Keep me logged in option
  
  // Email/Phone availability tracking
  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Phone number formatter: (000) 000 0000
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX XXXX
    if (digits.length <= 3) {
      return digits.length > 0 ? `(${digits}` : '';
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
  };
  
  // Check if phone is valid (10 digits)
  const isValidPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneNumber(value));
    setPhoneExists(false);
  };
  
  // Check if email exists when user finishes typing
  useEffect(() => {
    if (!email.trim() || !email.includes('@') || mode !== 'register') return;
    
    const timeoutId = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await api.get(`/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        setEmailExists(res.exists);
      } catch (e) {
        console.error('Email check failed:', e);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [email, mode]);

  // Check if phone exists when user finishes typing
  useEffect(() => {
    if (!phone.trim() || !isValidPhone(phone) || mode !== 'register') return;
    
    const timeoutId = setTimeout(async () => {
      setCheckingPhone(true);
      try {
        const res = await api.get(`/auth/check-phone?phone=${encodeURIComponent(phone.trim())}`);
        setPhoneExists(res.exists);
      } catch (e) {
        console.error('Phone check failed:', e);
      } finally {
        setCheckingPhone(false);
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [phone, mode]);

  // Handle direct navigation to login or register
  useEffect(() => {
    if (params.mode === 'login') {
      setMode('login');
    } else if (params.mode === 'register') {
      setMode('register');
      setRole('client');
    }
  }, [params.mode]);

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
    try { await login(email, password, keepLoggedIn); }
    catch (e: any) { setError(e.message || 'Login failed'); }
    finally { setSubmitting(false); }
  };

  const handleGuestBrowse = async () => {
    // Set guest mode via context and navigate to home
    await setGuestMode();
    router.replace('/(tabs)/home');
  };

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill in all required fields'); return; }
    if (role === 'contractor' && !contractorType) { setError('Please select your trade'); return; }
    if (role === 'contractor' && !acceptedTerms) { setError('You must accept the Terms of Service and Privacy Policy'); return; }
    if (emailExists) { setError('This email is already registered. Please login instead.'); return; }
    if (phoneExists) { setError('This phone number is already registered. Please login instead.'); return; }
    setSubmitting(true); setError('');
    try {
      await register({
        name, email, phone: phone || '', password, role,
        contractor_type: role === 'contractor' ? contractorType : undefined,
        bio,
        accepted_terms: acceptedTerms,
      });
      // After registration, redirect to email verification (phone will be verified after email if provided)
      router.push({ pathname: '/verify-email', params: { email, type: 'email', phone: phone || '' } });
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    finally { setSubmitting(false); }
  };

  const filteredTypes = CONTRACTOR_TYPES.filter(t =>
    t.toLowerCase().includes(typeSearch.toLowerCase())
  );

  // ─── WELCOME SCREEN (Van-inspired design) ───
  if (mode === 'welcome') {
    return (
      <View style={s.welcomeContainer}>
        <View style={s.welcomeOrange}>
          <SafeAreaView style={s.welcomeOrangeInner}>
            <Text style={s.registerNow}>REGISTER NOW!</Text>
            <Logo size="large" />
            <View style={s.taglineBox}>
              <Ionicons name="map" size={20} color={colors.paper} />
              <Text style={s.taglineText}>
                Let Clients Find You{'\n'}On The Map In Real Time!
              </Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={s.welcomeDark}>
          <Text style={s.servicesText}>
            PLUMBING, HEATING & COOLING,{'\n'}ELECTRICAL, HANDY MAN and more...
          </Text>

          <TouchableOpacity testID="get-started-btn" style={s.welcomeBtn} onPress={() => setMode('choose')}>
            <Text style={s.welcomeBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.secondary} />
          </TouchableOpacity>

          <TouchableOpacity testID="go-login-btn" style={s.welcomeLoginBtn} onPress={() => setMode('login')}>
            <Text style={s.welcomeLoginText}>
              Already registered? <Text style={s.welcomeLoginBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── LOGIN SCREEN ───
  if (mode === 'login') {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity testID="back-to-welcome" style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.secondary} />
            </TouchableOpacity>

            <View style={s.formLogoRow}>
              <Logo size="small" />
            </View>

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

            <TouchableOpacity 
              style={s.keepLoggedInRow} 
              onPress={() => setKeepLoggedIn(!keepLoggedIn)}
              activeOpacity={0.7}
            >
              <View style={[s.keepLoggedInCheckbox, keepLoggedIn && s.keepLoggedInCheckboxActive]}>
                {keepLoggedIn && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={s.keepLoggedInText}>Keep me logged in</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="login-submit-btn" style={s.primaryBtn} onPress={handleLogin} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.paper} /> : <Text style={s.primaryBtnText}>Log In</Text>}
            </TouchableOpacity>

            <TouchableOpacity testID="go-register-btn" style={s.linkBtn} onPress={() => { setMode('register'); setError(''); }}>
              <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Sign Up</Text></Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.forgotBtn} onPress={() => router.push('/forgot-password')}>
              <Text style={s.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>

            <View style={s.demoHint}>
              <Text style={s.demoText}>Demo: client@demo.com / demo123</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── CHOOSE ROLE SCREEN (Client or Contractor) ───
  if (mode === 'choose') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.chooseContainer}>
          <TouchableOpacity style={s.backBtn} onPress={() => setMode('welcome')}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>

          <View style={s.chooseLogoRow}>
            <Logo size="small" />
          </View>

          <Text style={s.chooseTitle}>I am a...</Text>
          <Text style={s.chooseSubtitle}>Choose how you want to use the app</Text>

          <View style={s.chooseButtonsContainer}>
            <TouchableOpacity 
              style={s.chooseClientBtn} 
              onPress={handleGuestBrowse}
            >
              <Ionicons name="home" size={32} color={colors.paper} />
              <Text style={s.chooseClientBtnText}>Client</Text>
              <Text style={s.chooseClientBtnSubtext}>Looking for help</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={s.chooseContractorBtn} 
              onPress={() => router.push('/contractor-register')}
            >
              <Ionicons name="construct" size={32} color={colors.paper} />
              <Text style={s.chooseContractorBtnText}>Contractor</Text>
              <Text style={s.chooseContractorBtnSubtext}>Offering services</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.chooseLoginLink} onPress={() => setMode('login')}>
            <Text style={s.chooseLoginText}>
              Already have an account? <Text style={s.chooseLoginBold}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── REGISTER SCREEN ───
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity testID="back-to-welcome-reg" style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </TouchableOpacity>

          <View style={s.formLogoRow}>
            <Logo size="small" />
          </View>

          <Text style={s.formTitle}>Create Account</Text>
          <Text style={s.formSubtitle}>Join MiPropertyGuru today</Text>
          {error ? <Text style={s.errorText}>{error}</Text> : null}

          <Text style={s.sectionLabel}>I am a...</Text>
          <View style={s.roleRow}>
            <TouchableOpacity testID="role-client-btn" style={[s.roleBtn, role === 'client' && s.roleBtnActive]}
              onPress={() => setRole('client')}>
              <Ionicons name="person" size={24} color={role === 'client' ? colors.paper : colors.secondary} />
              <Text style={[s.roleBtnText, role === 'client' && s.roleBtnTextActive]}>Client</Text>
              <Text style={[s.roleDesc, role === 'client' && s.roleDescActive]}>Looking for help</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="role-contractor-btn" style={[s.roleBtn, role === 'contractor' && s.roleBtnActive]}
              onPress={() => router.push('/contractor-register')}>
              <Ionicons name="construct" size={24} color={role === 'contractor' ? colors.paper : colors.secondary} />
              <Text style={[s.roleBtnText, role === 'contractor' && s.roleBtnTextActive]}>Contractor</Text>
              <Text style={[s.roleDesc, role === 'contractor' && s.roleDescActive]}>Offering services</Text>
            </TouchableOpacity>
          </View>

          {role === 'contractor' && (
            <View style={s.feeNotice}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={s.feeText}>Contractor accounts require a $24.99 CAD/month subscription to be visible to clients.</Text>
            </View>
          )}

          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <TextInput testID="register-name" style={s.input} placeholder="John Smith"
              placeholderTextColor={colors.placeholder} value={name} onChangeText={setName} />
          </View>
          <View style={s.inputGroup}>
            <Text style={[s.label, emailExists && s.labelError]}>
              Email {emailExists && <Text style={s.errorLabel}>*Already in use</Text>}
            </Text>
            <TextInput testID="register-email" style={[s.input, emailExists && s.inputError]} placeholder="your@email.com"
              placeholderTextColor={colors.placeholder} value={email} onChangeText={(t) => { setEmail(t); setEmailExists(false); }}
              keyboardType="email-address" autoCapitalize="none" />
            {emailExists && (
              <Text style={s.existsErrorText}>This email is already registered. Please login instead.</Text>
            )}
            {checkingEmail && (
              <Text style={s.checkingText}>Checking availability...</Text>
            )}
          </View>
          <View style={s.inputGroup}>
            <View style={s.labelRow}>
              <Text style={[s.label, phoneExists && s.labelError]}>Phone Number</Text>
              <Text style={s.optionalLabel}>(Optional)</Text>
            </View>
            <TextInput testID="register-phone" style={[s.input, phoneExists && s.inputError]} placeholder="(555) 555 5555"
              placeholderTextColor={colors.placeholder} value={phone} onChangeText={handlePhoneChange}
              keyboardType="phone-pad" maxLength={14} />
            <Text style={s.hintText}>Verification required if provided</Text>
            {phoneExists && (
              <Text style={s.existsErrorText}>This phone number is already registered. Please login instead.</Text>
            )}
            {checkingPhone && (
              <Text style={s.checkingText}>Checking availability...</Text>
            )}
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
                <Text style={s.label}>Short Bio</Text>
                <TextInput testID="register-bio" style={[s.input, s.bioInput]} placeholder="Describe your experience..."
                  placeholderTextColor={colors.placeholder} value={bio} onChangeText={setBio}
                  multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              
              {/* Terms and Privacy Agreement */}
              <View style={s.termsContainer}>
                <TouchableOpacity 
                  style={s.checkboxRow} 
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  activeOpacity={0.7}
                >
                  <View style={[s.checkbox, acceptedTerms && s.checkboxChecked]}>
                    {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={s.termsText}>
                    I agree to the{' '}
                    <Text style={s.termsLink} onPress={() => router.push('/terms')}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={s.termsLink} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
                <Text style={s.termsDisclaimer}>
                  I understand that MiPropertyGuru connects clients with contractors only. All work, payments, and responsibilities are between the client and contractor. MiPropertyGuru is not liable for any work performed or disputes.
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity testID="register-submit-btn" style={s.primaryBtn} onPress={handleRegister} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.paper} /> :
              <Text style={s.primaryBtnText}>{role === 'contractor' ? 'Register ($24.99 CAD/mo)' : 'Create Account'}</Text>}
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

  // ── Welcome Screen (Van-inspired) ──
  welcomeContainer: { flex: 1 },
  welcomeOrange: {
    flex: 1.1, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  welcomeOrangeInner: { alignItems: 'center', paddingHorizontal: spacing.l },
  registerNow: {
    fontSize: 16, fontWeight: '800', color: colors.paper, letterSpacing: 2,
    marginBottom: spacing.m, opacity: 0.9,
  },
  taglineBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    marginTop: spacing.l, backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s + 2, borderRadius: radius.m,
  },
  taglineText: {
    fontSize: 16, fontWeight: '600', color: colors.paper, textAlign: 'center', lineHeight: 22,
  },
  welcomeDark: {
    flex: 0.7, backgroundColor: colors.secondary,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.l,
  },
  servicesText: {
    fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    letterSpacing: 0.8, lineHeight: 20, marginBottom: spacing.l,
  },
  welcomeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    backgroundColor: colors.primary, borderRadius: radius.l,
    paddingVertical: 16, paddingHorizontal: 40,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  welcomeBtnText: { fontSize: 18, fontWeight: '700', color: colors.secondary },
  welcomeLoginBtn: { marginTop: spacing.m, paddingVertical: spacing.s },
  welcomeLoginText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  welcomeLoginBold: { fontWeight: '600', color: colors.primary },

  // ── Logo ──
  logoHouse: {
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderRadius: 18,
  },
  logoHouseLg: { width: 68, height: 68 },
  logoHouseSm: { width: 44, height: 44, borderWidth: 2, borderRadius: 12 },
  logoLeaf: { position: 'absolute' },
  logoLeafLg: { top: -10, right: -8 },
  logoLeafSm: { top: -7, right: -5 },
  logoTextRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
  logoMi: { fontSize: 20, fontWeight: '300', color: colors.logoYellow },
  logoMiLg: { fontSize: 28 },
  logoProperty: { fontSize: 20, fontWeight: '300', color: colors.paper },
  logoPropertyLg: { fontSize: 28 },
  logoGuru: { fontSize: 28, fontWeight: '800', color: colors.paper, letterSpacing: 2 },
  logoGuruLg: { fontSize: 38 },

  // ── Forms ──
  formLogoRow: { alignItems: 'center', marginBottom: spacing.m },
  backBtn: { marginBottom: spacing.m, width: 44, height: 44, justifyContent: 'center' },
  formScroll: { paddingHorizontal: spacing.l, paddingTop: spacing.m, paddingBottom: spacing.xxl },
  formTitle: { fontSize: 30, fontWeight: '700', color: colors.secondary, marginBottom: spacing.xs },
  formSubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: spacing.l },
  errorText: {
    fontSize: 14, color: colors.error, backgroundColor: '#FFF0F0',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: radius.s, marginBottom: spacing.m,
  },
  inputGroup: { marginBottom: spacing.m },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: spacing.xs },
  labelError: { color: '#EF4444' },
  errorLabel: { color: '#EF4444', fontWeight: '400', fontSize: 12 },
  optionalLabel: { fontSize: 12, color: colors.textSecondary, marginLeft: 6, fontWeight: '400' },
  hintText: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  existsErrorText: { fontSize: 12, color: '#EF4444', marginTop: 6, fontWeight: '600' },
  checkingText: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  inputError: { borderColor: '#EF4444', borderWidth: 2 },
  input: {
    backgroundColor: colors.background, borderRadius: radius.s, paddingHorizontal: spacing.m,
    paddingVertical: 14, fontSize: 17, color: colors.textPrimary, borderWidth: 1, borderColor: 'transparent',
  },
  bioInput: { height: 80, paddingTop: 14 },
  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.l, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.m,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', color: colors.paper },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.m },
  linkText: { fontSize: 15, color: colors.textSecondary },
  linkBold: { fontWeight: '600', color: colors.primary },
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
    flexDirection: 'row', backgroundColor: '#FFF4E6', borderRadius: radius.s,
    padding: spacing.m, marginBottom: spacing.m, gap: spacing.s, alignItems: 'flex-start',
    borderLeftWidth: 3, borderLeftColor: colors.primary,
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
  typeItemActive: { backgroundColor: '#FFF4E6' },
  typeText: { fontSize: 16, color: colors.secondary },
  typeTextActive: { fontWeight: '600', color: colors.primary },
  demoHint: { alignItems: 'center', marginTop: spacing.s },
  demoText: { fontSize: 12, color: colors.textDisabled },
  
  // Terms and checkbox styles
  termsContainer: { marginTop: spacing.m, marginBottom: spacing.s },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s },
  checkbox: { 
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  termsLink: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  termsDisclaimer: { 
    fontSize: 12, color: colors.textDisabled, lineHeight: 18, marginTop: spacing.s, 
    marginLeft: 32, fontStyle: 'italic',
  },
  
  // Forgot password
  forgotBtn: { alignItems: 'center', paddingVertical: spacing.s },
  forgotText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  
  // Keep me logged in
  keepLoggedInRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.s, 
    marginTop: spacing.s,
    marginBottom: spacing.s,
  },
  keepLoggedInCheckbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  keepLoggedInCheckboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  keepLoggedInText: { fontSize: 14, color: colors.textSecondary },
  
  // Choose Role Screen
  chooseContainer: {
    flex: 1,
    padding: spacing.l,
    backgroundColor: colors.background,
  },
  chooseLogoRow: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  chooseTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chooseSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  chooseButtonsContainer: {
    gap: spacing.m,
  },
  chooseClientBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chooseClientBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.paper,
  },
  chooseClientBtnSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  chooseContractorBtn: {
    backgroundColor: '#C45500', // Darker orange
    borderRadius: 16,
    padding: spacing.l,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chooseContractorBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.paper,
  },
  chooseContractorBtnSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  chooseLoginLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  chooseLoginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chooseLoginBold: {
    fontWeight: '700',
    color: colors.primary,
  },
});
