import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
  Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
  greenLight: '#DCFCE7',
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

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'other', name: 'Other', flag: '🌐' },
];

export default function ContractorRegisterScreen() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Check if upgrading from existing client
  const isUpgrading = user?.role === 'client';

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [useSamePassword, setUseSamePassword] = useState(true);

  // Step 2: Trades
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Step 3: Languages
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [otherLanguage, setOtherLanguage] = useState('');

  // Step 4: Service Radius
  const [serviceRadius, setServiceRadius] = useState(15);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');

  // Step 5: Profile
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);

  // Step 6: License (optional)
  const [licenseFile, setLicenseFile] = useState<{name: string; uri: string; base64?: string} | null>(null);
  const [acceptLicenseTerms, setAcceptLicenseTerms] = useState(false);

  // Step 7: Terms
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Field validation tracking
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Pre-fill user data if upgrading from client
  useEffect(() => {
    if (isUpgrading && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [isUpgrading, user]);

  useEffect(() => {
    if (step === 4) {
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

  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== language));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, language]);
    }
  };

  // Validation helpers
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Canadian phone format validation
  const isValidCanadianPhone = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    // Canadian phone: 10 digits, optionally with 1 country code = 11 digits
    // Area codes: 2-9 for first digit (not 0 or 1)
    if (digitsOnly.length === 10) {
      return /^[2-9]\d{9}$/.test(digitsOnly);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return /^1[2-9]\d{9}$/.test(digitsOnly);
    }
    return false;
  };

  const formatCanadianPhone = (text: string) => {
    // Remove all non-digit characters
    let digitsOnly = text.replace(/\D/g, '');
    // Remove leading 1 for formatting purposes
    if (digitsOnly.startsWith('1') && digitsOnly.length > 10) {
      digitsOnly = digitsOnly.substring(1);
    }
    // Format as (XXX) XXX-XXXX for Canadian numbers
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
      case 1: // Basic Info
        if (!name.trim() || name.trim().length < 2) { 
          Alert.alert('Error', 'Please enter your full name (at least 2 characters)'); 
          return false; 
        }
        if (!phone.trim()) { 
          Alert.alert('Error', 'Phone number is required'); 
          return false; 
        }
        if (!isValidCanadianPhone(phone)) { 
          Alert.alert('Invalid Phone', 'Please enter a valid Canadian phone number (10 digits).\n\nExample: (416) 555-1234'); 
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
        // For upgrading users, password is only required if NOT using same password
        if (isUpgrading) {
          if (!useSamePassword && password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return false;
          }
        } else {
          if (password.length < 6) { 
            Alert.alert('Error', 'Password must be at least 6 characters'); 
            return false; 
          }
        }
        return true;
      case 2: // Trades
        if (selectedTrades.length === 0) { 
          Alert.alert('Error', 'Select at least one trade'); 
          return false; 
        }
        return true;
      case 3: // Languages
        if (selectedLanguages.length === 0) {
          Alert.alert('Error', 'Select at least one language');
          return false;
        }
        return true;
      case 4: // Service Radius
        return true;
      case 5: // Profile
        return true;
      case 6: // License
        if (licenseFile && !acceptLicenseTerms) {
          Alert.alert('Error', 'You must confirm your license is valid and current');
          return false;
        }
        return true;
      case 7: // Terms
        if (!acceptTerms) { 
          Alert.alert('Error', 'You must accept the Terms of Service'); 
          return false; 
        }
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

  const pickLicenseFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setLicenseFile({
          name: file.name,
          uri: file.uri,
        });
        setAcceptLicenseTerms(false); // Reset checkbox when new file is selected
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const removeLicenseFile = () => {
    setLicenseFile(null);
    setAcceptLicenseTerms(false);
  };

  const handleRegister = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Prepare languages with Other if specified
      let finalLanguages = [...selectedLanguages];
      if (selectedLanguages.includes('Other') && otherLanguage.trim()) {
        finalLanguages = finalLanguages.filter(l => l !== 'Other');
        finalLanguages.push(otherLanguage.trim());
      }

      let res;
      
      if (isUpgrading) {
        // Upgrade existing client to contractor
        res = await api.post('/auth/upgrade-to-contractor', {
          name: name.trim(),
          phone: phone.trim(),
          business_name: businessName.trim() || null,
          trades: selectedTrades,
          languages: finalLanguages,
          service_radius: serviceRadius,
          bio: bio.trim(),
          experience_years: parseInt(experienceYears) || 0,
          has_license: !!licenseFile,
          license_confirmed: acceptLicenseTerms,
          use_same_password: useSamePassword,
          new_password: useSamePassword ? null : password,
        });
      } else {
        // New contractor registration
        res = await api.post('/auth/register', {
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
          business_name: businessName.trim() || null,
          languages: finalLanguages,
          has_license: !!licenseFile,
          license_confirmed: acceptLicenseTerms,
        });
      }

      if (res.token && res.user) {
        // Store the token
        await AsyncStorage.setItem('auth_token', res.token);
        await AsyncStorage.setItem('keep_logged_in', 'true');
        await AsyncStorage.removeItem('guest_mode'); // Clear guest mode if was browsing as guest
        
        if (isUpgrading) {
          // For upgrade, directly navigate to dashboard
          router.replace('/(tabs)/dashboard');
        } else {
          // Auto-login using email and password to properly set auth context
          try {
            await login(email.trim().toLowerCase(), password, true);
          } catch (e) {
            // If login fails, still redirect since token is stored
            console.log('Auto-login after registration:', e);
          }
          
          // Redirect to dashboard
          router.replace('/(tabs)/dashboard');
        }
      } else {
        Alert.alert('Registration Failed', 'Something went wrong. Please try again.');
      }
    } catch (e: any) {
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

  const renderStep1 = () => {
    const showPhoneError = touched.phone && phone.trim() && !isValidCanadianPhone(phone);
    const showEmailError = touched.email && email.trim() && !isValidEmail(email);
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {isUpgrading ? 'Upgrade to Contractor' : "Let's get started"}
        </Text>
        <Text style={styles.stepSubtitle}>
          {isUpgrading 
            ? 'Your details are pre-filled from your client account' 
            : 'Enter your basic information'}
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={[styles.input, isUpgrading && styles.inputPreFilled]}
            value={name}
            onChangeText={setName}
            placeholder="John Smith"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Business Name (Optional)</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g., Smith's Electric Services"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, showPhoneError && styles.inputLabelError]}>
            Phone Number (Canadian) {showPhoneError && <Text style={styles.requiredText}>*Invalid</Text>}
          </Text>
          <TextInput
            style={[styles.input, showPhoneError && styles.inputError, isUpgrading && styles.inputPreFilled]}
            value={phone}
            onChangeText={(text) => {
              setPhone(formatCanadianPhone(text));
              setTouched({ ...touched, phone: true });
            }}
            placeholder="(416) 555-1234"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={14}
          />
          {showPhoneError && (
            <Text style={styles.errorText}>Enter a valid Canadian phone number (10 digits)</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, showEmailError && styles.inputLabelError]}>
            Email {showEmailError && <Text style={styles.requiredText}>*Invalid</Text>}
          </Text>
          <TextInput
            style={[styles.input, showEmailError && styles.inputError, isUpgrading && styles.inputPreFilled]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setTouched({ ...touched, email: true });
            }}
            placeholder="you@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isUpgrading}
          />
          {showEmailError && (
            <Text style={styles.errorText}>Enter a valid email (e.g., name@example.com)</Text>
          )}
          {isUpgrading && (
            <Text style={styles.lockedFieldText}>Email cannot be changed</Text>
          )}
        </View>

        {/* Password Section */}
        {isUpgrading ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            
            {/* Password Option Toggle */}
            <View style={styles.passwordOptions}>
              <TouchableOpacity 
                style={[
                  styles.passwordOption,
                  useSamePassword && styles.passwordOptionActive
                ]}
                onPress={() => {
                  setUseSamePassword(true);
                  setPassword('');
                }}
              >
                <View style={[styles.radioOuter, useSamePassword && styles.radioOuterActive]}>
                  {useSamePassword && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.passwordOptionText, useSamePassword && styles.passwordOptionTextActive]}>
                  Use same password as my client account
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.passwordOption,
                  !useSamePassword && styles.passwordOptionActive
                ]}
                onPress={() => setUseSamePassword(false)}
              >
                <View style={[styles.radioOuter, !useSamePassword && styles.radioOuterActive]}>
                  {!useSamePassword && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.passwordOptionText, !useSamePassword && styles.passwordOptionTextActive]}>
                  Create a new password
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Show password input only if creating new */}
            {!useSamePassword && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            )}
          </View>
        ) : (
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
        )}
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
      <Text style={styles.stepTitle}>Languages You Speak</Text>
      <Text style={styles.stepSubtitle}>Select all languages you can communicate in with clients</Text>

      <View style={styles.languagesGrid}>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageChip,
              selectedLanguages.includes(lang.name) && styles.languageChipActive,
            ]}
            onPress={() => toggleLanguage(lang.name)}
          >
            <Text style={styles.languageFlag}>{lang.flag}</Text>
            <Text style={[
              styles.languageName,
              selectedLanguages.includes(lang.name) && styles.languageNameActive,
            ]}>
              {lang.name}
            </Text>
            {selectedLanguages.includes(lang.name) && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedLanguages.includes('Other') && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Specify Other Language</Text>
          <TextInput
            style={styles.input}
            value={otherLanguage}
            onChangeText={setOtherLanguage}
            placeholder="e.g., Cantonese, Tamil, etc."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>
      )}

      <View style={styles.selectedLangsBox}>
        <Text style={styles.selectedLangsLabel}>Selected: </Text>
        <Text style={styles.selectedLangsText}>
          {selectedLanguages.join(', ')}
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
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

  const renderStep5 = () => (
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

  const renderStep6 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>License (Optional)</Text>
      <Text style={styles.stepSubtitle}>Upload your professional license to build trust with clients</Text>

      <View style={styles.licenseBox}>
        <View style={styles.licenseIconBox}>
          <Ionicons name="document-text" size={40} color={colors.primary} />
        </View>
        <Text style={styles.licenseTitle}>Professional License</Text>
        <Text style={styles.licenseDesc}>
          Upload a copy of your trade license or certification. Accepted formats: Image or PDF.
        </Text>

        {!licenseFile ? (
          <TouchableOpacity style={styles.uploadBtn} onPress={pickLicenseFile}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.paper} />
            <Text style={styles.uploadBtnText}>Upload License</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileUploaded}>
            <View style={styles.fileInfo}>
              <Ionicons name="document-attach" size={24} color={colors.green} />
              <Text style={styles.fileName} numberOfLines={1}>{licenseFile.name}</Text>
            </View>
            <TouchableOpacity onPress={removeLicenseFile}>
              <Ionicons name="trash-outline" size={22} color={colors.red} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {licenseFile && (
        <TouchableOpacity
          style={styles.licenseTermsRow}
          onPress={() => setAcceptLicenseTerms(!acceptLicenseTerms)}
        >
          <View style={[styles.checkbox, acceptLicenseTerms && styles.checkboxActive]}>
            {acceptLicenseTerms && <Ionicons name="checkmark" size={16} color={colors.paper} />}
          </View>
          <Text style={styles.licenseTermsText}>
            I confirm that this license is valid, current, and belongs to me. I understand that misrepresentation may result in account suspension.
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.warningBox}>
        <Ionicons name="shield-checkmark" size={20} color={colors.textSecondary} />
        <Text style={styles.warningText}>
          Note: Uploading a license shows "License on file" on your profile. MiPropertyGuru does not verify licenses - clients are advised to confirm licenses independently.
        </Text>
      </View>

      <TouchableOpacity style={styles.skipLink} onPress={handleNext}>
        <Text style={styles.skipLinkText}>Skip for now →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Almost done!</Text>
      <Text style={styles.stepSubtitle}>Review and accept the terms</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        {businessName && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Business</Text>
            <Text style={styles.summaryValue}>{businessName}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trades</Text>
          <Text style={styles.summaryValue}>{selectedTrades.join(', ')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Languages</Text>
          <Text style={styles.summaryValue}>{selectedLanguages.join(', ')}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Radius</Text>
          <Text style={styles.summaryValue}>{serviceRadius} km</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Experience</Text>
          <Text style={styles.summaryValue}>{experienceYears || '0'} years</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>License</Text>
          <Text style={[styles.summaryValue, licenseFile ? { color: colors.green } : {}]}>
            {licenseFile ? '🪪 On file' : 'Not uploaded'}
          </Text>
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

  const totalSteps = 7;

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
          {step === 6 && renderStep6()}
          {step === 7 && renderStep7()}
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
  inputPreFilled: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  lockedFieldText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  passwordOptions: {
    gap: 12,
  },
  passwordOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.paper,
  },
  passwordOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  passwordOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  passwordOptionTextActive: {
    color: colors.text,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
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
  // Languages Step
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  languageChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  languageNameActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedLangsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  selectedLangsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  selectedLangsText: {
    fontSize: 14,
    color: colors.primary,
    flex: 1,
  },
  // Location/Radius
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
  // License Step
  licenseBox: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  licenseIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  licenseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  licenseDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  fileUploaded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.greenLight,
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  licenseTermsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  licenseTermsText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  skipLink: {
    alignItems: 'center',
    padding: 12,
  },
  skipLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  // Summary
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
