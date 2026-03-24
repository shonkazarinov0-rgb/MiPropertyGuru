import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
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
  border: '#E5E7EB',
  red: '#EF4444',
};

const TRADES = [
  { name: 'Electrician', icon: '⚡' },
  { name: 'Plumber', icon: '🔧' },
  { name: 'Handyman', icon: '🔨' },
  { name: 'HVAC Technician', icon: '❄️' },
  { name: 'Carpenter', icon: '🪚' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Roofer', icon: '🏠' },
  { name: 'General Contractor', icon: '👷' },
  { name: 'Tiler', icon: '🔲' },
  { name: 'Landscaper', icon: '🌳' },
  { name: 'Mason', icon: '🧱' },
  { name: 'Welder', icon: '🔥' },
  { name: 'Glazier', icon: '🪟' },
  { name: 'Demolition', icon: '💥' },
  { name: 'Drywall', icon: '🏗️' },
  { name: 'Flooring', icon: '🪵' },
  { name: 'Insulation', icon: '🧤' },
  { name: 'Concrete', icon: '🪨' },
  { name: 'Fence', icon: '🚧' },
  { name: 'Deck Builder', icon: '🌲' },
  { name: 'Cabinet Maker', icon: '🪑' },
  { name: 'Window Installer', icon: '🖼️' },
  { name: 'Siding', icon: '🏘️' },
  { name: 'Garage Door', icon: '🚗' },
  { name: 'Pool Service', icon: '🏊' },
  { name: 'Locksmith', icon: '🔐' },
  { name: 'Appliance Repair', icon: '🔌' },
];

export default function ContractorRegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Trades
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Step 3: Service Radius
  const [serviceRadius, setServiceRadius] = useState(15);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');

  // Step 4: Profile
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);

  // Step 5: Terms
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Field validation tracking
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (step === 3) {
      getLocation();
    }
  }, [step]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (address) {
          setLocationName(`${address.city || address.region || 'Your area'}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTrade = (trade: string) => {
    if (selectedTrades.includes(trade)) {
      setSelectedTrades(selectedTrades.filter(t => t !== trade));
    } else if (selectedTrades.length < 5) {
      setSelectedTrades([...selectedTrades, trade]);
    } else {
      Alert.alert('Limit reached', 'You can select up to 5 trades');
    }
  };

  // Validation helpers
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    // Must have at least 10 digits (standard phone number)
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const digitsOnly = text.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX for US numbers
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    } else if (digitsOnly.length <= 6) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
    } else {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!name.trim() || name.trim().length < 2) { 
          Alert.alert('Error', 'Please enter your full name (at least 2 characters)'); 
          return false; 
        }
        if (!phone.trim()) { 
          Alert.alert('Error', 'Phone number is required'); 
          return false; 
        }
        if (!isValidPhone(phone)) { 
          Alert.alert('Invalid Phone', 'Please enter a valid phone number (at least 10 digits)'); 
          return false; 
        }
        if (!email.trim()) { 
          Alert.alert('Error', 'Email is required'); 
          return false; 
        }
        if (!isValidEmail(email)) { 
          Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., name@example.com)'); 
          return false; 
        }
        if (password.length < 6) { 
          Alert.alert('Error', 'Password must be at least 6 characters'); 
          return false; 
        }
        return true;
      case 2:
        if (selectedTrades.length === 0) { Alert.alert('Error', 'Select at least one trade'); return false; }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        if (!acceptTerms) { Alert.alert('Error', 'You must accept the Terms of Service'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      console.log('Attempting registration...');
      const res = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role: 'contractor',
        trades: selectedTrades,
        contractor_type: selectedTrades[0],
        bio: bio.trim(),
        experience_years: parseInt(experienceYears) || 0,
        service_radius: serviceRadius,
      });

      console.log('Registration response:', res);

      if (res.token && res.user) {
        console.log('Registration successful, storing token and redirecting...');
        // Store the token
        await AsyncStorage.setItem('auth_token', res.token);
        // Redirect to dashboard
        router.replace('/(tabs)/dashboard');
      } else {
        console.log('No token/user in response');
        Alert.alert('Registration Failed', 'Something went wrong. Please try again.');
      }
    } catch (e: any) {
      console.log('Registration error:', e);
      const errorMessage = e.message || e.detail || 'Please try again';
      if (errorMessage.includes('already registered') || errorMessage.includes('already in use')) {
        Alert.alert('Account Exists', 'This email or phone number is already in use. Please use different credentials or try logging in.');
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => {
    const showPhoneError = touched.phone && phone.trim() && !isValidPhone(phone);
    const showEmailError = touched.email && email.trim() && !isValidEmail(email);
    const showPhoneRequired = touched.email && email.trim() && !phone.trim();
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Let's get started</Text>
        <Text style={styles.stepSubtitle}>Enter your basic information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="John Smith"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, (showPhoneError || showPhoneRequired) && styles.inputLabelError]}>
            Phone Number {(showPhoneError || showPhoneRequired) && <Text style={styles.requiredText}>*Required</Text>}
          </Text>
          <TextInput
            style={[styles.input, (showPhoneError || showPhoneRequired) && styles.inputError]}
            value={phone}
            onChangeText={(text) => {
              setPhone(formatPhoneNumber(text));
              setTouched({ ...touched, phone: true });
            }}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={14}
          />
          {showPhoneRequired && (
            <Text style={styles.errorText}>Please enter your phone number</Text>
          )}
          {showPhoneError && (
            <Text style={styles.errorText}>Enter a valid phone number (at least 10 digits)</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, showEmailError && styles.inputLabelError]}>
            Email {showEmailError && <Text style={styles.requiredText}>*Invalid</Text>}
          </Text>
          <TextInput
            style={[styles.input, showEmailError && styles.inputError]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setTouched({ ...touched, email: true });
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {showEmailError && (
            <Text style={styles.errorText}>Enter a valid email (e.g., name@example.com)</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
          />
        </View>
      </View>
    );
  };

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your trade?</Text>
      <Text style={styles.stepSubtitle}>Select up to 5 services you offer ({selectedTrades.length}/5)</Text>

      <View style={styles.tradesGrid}>
        {TRADES.map(trade => (
          <TouchableOpacity
            key={trade.name}
            style={[
              styles.tradeCard,
              selectedTrades.includes(trade.name) && styles.tradeCardActive,
            ]}
            onPress={() => toggleTrade(trade.name)}
          >
            <Text style={styles.tradeIcon}>{trade.icon}</Text>
            <Text style={[
              styles.tradeName,
              selectedTrades.includes(trade.name) && styles.tradeNameActive,
            ]}>
              {trade.name}
            </Text>
            {selectedTrades.includes(trade.name) && (
              <View style={styles.checkMark}>
                <Ionicons name="checkmark" size={12} color={colors.paper} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set your service area</Text>
      <Text style={styles.stepSubtitle}>You'll receive job alerts within this radius</Text>

      <View style={styles.locationBox}>
        <Ionicons name="location" size={20} color={colors.primary} />
        <Text style={styles.locationText}>
          {locationName || 'Detecting your location...'}
        </Text>
      </View>

      <View style={styles.radiusSection}>
        <Text style={styles.radiusValue}>{serviceRadius} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={50}
          step={5}
          value={serviceRadius}
          onValueChange={setServiceRadius}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>5 km</Text>
          <Text style={styles.sliderLabel}>50 km</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          You can change this anytime in your settings. A larger radius means more potential jobs but also more competition.
        </Text>
      </View>
    </View>
  );

  const pickWorkPhoto = async () => {
    if (workPhotos.length >= 6) {
      Alert.alert('Limit reached', 'You can upload up to 6 photos');
      return;
    }
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const photoUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setWorkPhotos([...workPhotos, photoUri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const removeWorkPhoto = (index: number) => {
    setWorkPhotos(workPhotos.filter((_, i) => i !== index));
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell clients about yourself</Text>
      <Text style={styles.stepSubtitle}>This helps you stand out from the competition</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Years of Experience</Text>
        <TextInput
          style={styles.input}
          value={experienceYears}
          onChangeText={setExperienceYears}
          placeholder="e.g., 10"
          placeholderTextColor={colors.textSecondary}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Bio (Optional)</Text>
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell clients about your experience, specialties, and what makes you great at what you do..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={500}
        />
        <Text style={styles.charCount}>{bio.length}/500</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Photos of Your Work (Optional)</Text>
        <Text style={styles.inputHint}>Show off your best projects - up to 6 photos</Text>
        
        <View style={styles.photoGrid}>
          {workPhotos.map((photo, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri: photo }} style={styles.workPhoto} />
              <TouchableOpacity 
                style={styles.removePhotoBtn}
                onPress={() => removeWorkPhoto(index)}
              >
                <Ionicons name="close-circle" size={24} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))}
          {workPhotos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickWorkPhoto}>
              <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Almost done!</Text>
      <Text style={styles.stepSubtitle}>Review and accept the terms</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trades</Text>
          <Text style={styles.summaryValue}>{selectedTrades.join(', ')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Radius</Text>
          <Text style={styles.summaryValue}>{serviceRadius} km</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Experience</Text>
          <Text style={styles.summaryValue}>{experienceYears || '0'} years</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setAcceptTerms(!acceptTerms)}
      >
        <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
          {acceptTerms && <Ionicons name="checkmark" size={16} color={colors.paper} />}
        </View>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/terms')}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/privacy')}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.pricingBox}>
        <Text style={styles.pricingTitle}>💎 Subscription Required</Text>
        <Text style={styles.pricingPrice}>FREE (Limited Time!)</Text>
        <Text style={styles.pricingDesc}>
          Get unlimited access to leads, appear on the map, and connect with clients directly.
        </Text>
      </View>
    </View>
  );

  const totalSteps = 5;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contractor Registration</Text>
          <Text style={styles.stepIndicator}>Step {step}/{totalSteps}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < totalSteps ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.paper} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, (!acceptTerms || loading) && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={!acceptTerms || loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
  stepIndicator: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bioInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  inputLabelError: {
    color: colors.red,
  },
  inputError: {
    borderColor: colors.red,
    borderWidth: 2,
  },
  requiredText: {
    color: colors.red,
    fontWeight: '400',
    fontSize: 12,
  },
  errorText: {
    color: colors.red,
    fontSize: 12,
    marginTop: 6,
  },
  inputHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  workPhoto: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  addPhotoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tradeCard: {
    width: '48%',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  tradeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tradeIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  tradeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  tradeNameActive: {
    color: colors.primary,
  },
  checkMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  locationText: {
    fontSize: 15,
    color: colors.text,
  },
  radiusSection: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  radiusValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
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
  summaryCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  pricingBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  pricingDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
