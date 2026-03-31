import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import ModeToggle from '../../src/components/ModeToggle';
import { TRADES, getTradeIcon } from '../../src/constants/trades';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  border: '#E5E7EB',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser, switchMode, isClientMode, isContractorMode } = useAuth();
  const [liveLocation, setLiveLocation] = useState(user?.live_location_enabled || false);
  const [phoneVisible, setPhoneVisible] = useState(user?.phone_visible !== false); // Default to true
  const [serviceRadius, setServiceRadius] = useState(user?.service_radius || 50);
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [originalPhone, setOriginalPhone] = useState(user?.phone || ''); // Store original for revert
  const [editTrades, setEditTrades] = useState<string[]>(user?.trades || []);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);
  const [phoneVerifyCode, setPhoneVerifyCode] = useState('');
  const [phoneToVerify, setPhoneToVerify] = useState('');
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState(user?.license_number || '');
  const [licenseType, setLicenseType] = useState(user?.license_type || '');
  const [licenseExpiry, setLicenseExpiry] = useState(user?.license_expiry || '');

  // Phone number formatter: (555) 555 5555
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
  const [licenseImage, setLicenseImage] = useState<string | null>(user?.license_image || null);
  
  // Client profile edit states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  
  // Edit work location states
  const [showEditLocation, setShowEditLocation] = useState(false);
  const [editLocationIndex, setEditLocationIndex] = useState<number>(-1);
  const [editLocationName, setEditLocationName] = useState('');

  useEffect(() => {
    if (user?.role === 'contractor') {
      fetchPortfolio();
    }
    // Sync phone states when user data loads/changes
    if (user?.phone) {
      setEditPhone(user.phone);
      setOriginalPhone(user.phone);
    }
  }, [user]);

  const fetchPortfolio = async () => {
    try {
      const res = await api.get(`/portfolio/${user?.id}`);
      setPortfolio(res.portfolio || []);
    } catch {}
  };

  const toggleLiveLocation = async (val: boolean) => {
    setLiveLocation(val);
    setSaving(true);
    try {
      let lat, lng;
      if (val) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      }
      await api.put('/contractors/location', {
        live_location_enabled: val,
        current_lat: lat, current_lng: lng,
        work_locations: user?.work_locations || [],
      });
      await refreshUser();
    } catch (e: any) { Alert.alert('Error', e.message); setLiveLocation(!val); }
    finally { setSaving(false); }
  };

  const updateServiceRadius = async (value: number) => {
    setServiceRadius(value);
    try {
      await api.put('/contractors/service-radius', { service_radius: value });
      await refreshUser();
    } catch (e: any) {
      console.error('Failed to update service radius:', e.message);
    }
  };

  const togglePhoneVisibility = async (val: boolean) => {
    setPhoneVisible(val);
    try {
      await api.put('/contractors/phone-visibility', { phone_visible: val });
      await refreshUser();
    } catch (e: any) {
      console.error('Failed to update phone visibility:', e.message);
      setPhoneVisible(!val);
    }
  };

  const savePhoneNumber = async () => {
    if (editPhone === user?.phone) return; // No change
    if (!editPhone.trim()) return; // Empty phone
    
    // If phone changed, require verification
    setPhoneToVerify(editPhone);
    setSendingPhoneCode(true);
    try {
      await api.post('/auth/send-phone-code', { phone: editPhone });
      setShowPhoneVerifyModal(true);
      setPhoneVerifyCode('');
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Error sending verification code: ' + (e.message || 'Unknown error'));
      } else {
        Alert.alert('Error', 'Failed to send verification code: ' + (e.message || 'Unknown error'));
      }
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const verifyAndSavePhone = async () => {
    if (phoneVerifyCode.length !== 6) {
      if (Platform.OS === 'web') {
        window.alert('Please enter the 6-digit code');
      } else {
        Alert.alert('Error', 'Please enter the 6-digit code');
      }
      return;
    }
    
    setVerifyingPhone(true);
    try {
      await api.post('/auth/verify-phone', { 
        phone: phoneToVerify, 
        code: phoneVerifyCode 
      });
      await refreshUser();
      setShowPhoneVerifyModal(false);
      setEditPhone(phoneToVerify);
      if (Platform.OS === 'web') {
        window.alert('Phone number verified successfully!');
      } else {
        Alert.alert('Success', 'Phone number verified successfully!');
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Verification failed: ' + (e.message || 'Invalid code'));
      } else {
        Alert.alert('Error', e.message || 'Invalid verification code');
      }
    } finally {
      setVerifyingPhone(false);
    }
  };

  const resendPhoneCode = async () => {
    setSendingPhoneCode(true);
    try {
      await api.post('/auth/send-phone-code', { phone: phoneToVerify });
      if (Platform.OS === 'web') {
        window.alert('New code sent!');
      } else {
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone.');
      }
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert('Failed to resend code');
      } else {
        Alert.alert('Error', 'Failed to resend code');
      }
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const toggleTrade = (tradeName: string) => {
    if (editTrades.includes(tradeName)) {
      if (editTrades.length > 1) { // Must have at least 1 trade
        setEditTrades(editTrades.filter(t => t !== tradeName));
      }
    } else if (editTrades.length < 5) {
      setEditTrades([...editTrades, tradeName]);
    }
  };

  const saveTrades = async () => {
    try {
      await api.put('/contractors/profile', { trades: editTrades });
      await refreshUser();
      setShowTradeModal(false);
    } catch (e: any) {
      console.error('Failed to update trades:', e.message);
    }
  };

  // Save client profile (name and phone)
  const saveClientProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.put('/users/profile', {
        name: editName.trim(),
        phone: editPhone.trim(),
      });
      await refreshUser();
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const addWorkLocation = async () => {
    if (!locationName.trim()) return;
    setSaving(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 40.7128, lng = -74.0060;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude; lng = loc.coords.longitude;
      }
      const newLocs = [...(user?.work_locations || []), { name: locationName, lat, lng }].slice(0, 3);
      await api.put('/contractors/location', {
        live_location_enabled: liveLocation,
        work_locations: newLocs,
      });
      await refreshUser();
      setLocationName(''); setShowAddLocation(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  // Edit work location
  const editWorkLocation = async () => {
    if (!editLocationName.trim() || editLocationIndex < 0) return;
    setSaving(true);
    try {
      const updatedLocs = [...(user?.work_locations || [])];
      updatedLocs[editLocationIndex] = { 
        ...updatedLocs[editLocationIndex], 
        name: editLocationName.trim() 
      };
      await api.put('/contractors/location', {
        live_location_enabled: liveLocation,
        work_locations: updatedLocs,
      });
      await refreshUser();
      setEditLocationName('');
      setEditLocationIndex(-1);
      setShowEditLocation(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  // Delete work location
  const deleteWorkLocation = async (index: number) => {
    Alert.alert(
      'Delete Location',
      'Are you sure you want to remove this work location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const updatedLocs = (user?.work_locations || []).filter((_: any, i: number) => i !== index);
              await api.put('/contractors/location', {
                live_location_enabled: liveLocation,
                work_locations: updatedLocs,
              });
              await refreshUser();
            } catch (e: any) { Alert.alert('Error', e.message); }
            finally { setSaving(false); }
          }
        }
      ]
    );
  };

  const addPortfolioItem = async () => {
    if (!portfolioTitle.trim()) {
      Alert.alert('Error', 'Please enter a project title');
      return;
    }
    if (portfolioImages.length === 0) {
      Alert.alert('Error', 'Please add at least one photo');
      return;
    }
    setSaving(true);
    try {
      await api.post('/portfolio', { 
        title: portfolioTitle, 
        description: portfolioDesc,
        images: portfolioImages 
      });
      await fetchPortfolio();
      setPortfolioTitle(''); 
      setPortfolioDesc(''); 
      setPortfolioImages([]);
      setShowAddPortfolio(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const pickPortfolioImage = async () => {
    if (portfolioImages.length >= 4) {
      Alert.alert('Limit reached', 'You can add up to 4 photos per portfolio item');
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
        setPortfolioImages([...portfolioImages, photoUri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
  };

  const deletePortfolioItem = async (itemId: string) => {
    Alert.alert(
      'Delete Portfolio Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/portfolio/${itemId}`);
              await fetchPortfolio();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  // License functions
  const pickLicenseImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setLicenseImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking license image:', error);
    }
  };

  const saveLicense = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter a license number');
      return;
    }
    
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        license_number: licenseNumber.trim(),
        license_type: licenseType.trim(),
        license_expiry: licenseExpiry.trim(),
        license_image: licenseImage,
      });
      await refreshUser();
      setShowLicenseModal(false);
      Alert.alert('Success', 'License information saved');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save license');
    } finally {
      setSaving(false);
    }
  };

  const handleModeSwitch = async () => {
    if (user?.role !== 'contractor') return;
    
    const newMode = isContractorMode ? 'client' : 'contractor';
    await switchMode(newMode);
    // Stay on current page - no navigation
  };

  const isContractor = user?.role === 'contractor';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header - Outside ScrollView for consistency */}
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
        <ModeToggle />
      </View>
      
      <ScrollView contentContainerStyle={s.scrollContent}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarLg}>
            <Text style={s.avatarLgText}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <Text style={s.profileName}>{user?.name}</Text>
          
          {/* Show trade badges with icons only in contractor mode - with edit button */}
          {isContractor && isContractorMode && user?.trades && user.trades.length > 0 && (
            <TouchableOpacity style={s.tradesContainerEditable} onPress={() => { setEditTrades(user.trades); setShowTradeModal(true); }}>
              {user.trades.map((trade: string, index: number) => (
                <View key={index} style={s.typeBadge}>
                  <Text style={s.tradeIcon}>{getTradeIcon(trade)}</Text>
                  <Text style={s.typeText}>{trade}</Text>
                </View>
              ))}
              <View style={s.editTradesBtn}>
                <Ionicons name="pencil" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
          {/* Fallback to contractor_type if no trades array - with edit button */}
          {isContractor && isContractorMode && (!user?.trades || user.trades.length === 0) && user?.contractor_type && (
            <TouchableOpacity style={s.tradesContainerEditable} onPress={() => { setEditTrades([user.contractor_type]); setShowTradeModal(true); }}>
              <View style={s.typeBadge}>
                <Text style={s.tradeIcon}>{getTradeIcon(user?.contractor_type)}</Text>
                <Text style={s.typeText}>{user?.contractor_type}</Text>
              </View>
              <View style={s.editTradesBtn}>
                <Ionicons name="pencil" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          )}
          
          <Text style={s.profileEmail}>{user?.email}</Text>
          <Text style={s.profilePhone}>{user?.phone}</Text>
          
          {/* Show stats only in contractor mode - improved layout */}
          {isContractor && isContractorMode && (
            <View style={s.statsRow}>
              <View style={s.stat}>
                <View style={s.statIconRow}>
                  <Text style={s.statValue}>{user?.rating || 0}</Text>
                  <Ionicons name="star" size={18} color="#F59E0B" />
                </View>
                <Text style={s.statLabel}>Rating</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <View style={s.statIconRow}>
                  <Text style={s.statValue}>{user?.review_count || 0}</Text>
                  <Ionicons name="chatbubble" size={16} color="#6366F1" />
                </View>
                <Text style={s.statLabel}>Reviews</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <View style={s.statIconRow}>
                  <Text style={s.statValue}>{user?.experience_years || 0}</Text>
                  <Ionicons name="briefcase" size={16} color="#10B981" />
                </View>
                <Text style={s.statLabel}>Yrs Exp</Text>
              </View>
            </View>
          )}
          
          {/* Languages Spoken - show for contractors */}
          {isContractor && isContractorMode && user?.languages && user.languages.length > 0 && (
            <View style={s.languagesRow}>
              <Ionicons name="earth" size={18} color="#4A90D9" />
              <Text style={s.languagesText}>{user.languages.join(', ')}</Text>
            </View>
          )}
          
          {/* License Badge - show for contractors with license */}
          {isContractor && isContractorMode && user?.has_license && (
            <View style={s.licenseBadgeProfile}>
              <Text style={s.licenseBadgeProfileText}>🪪 License on file</Text>
            </View>
          )}
        </View>

        {/* Contractor-only sections - only show in contractor mode */}
        {isContractor && isContractorMode && (
          <>
            {/* Bio Section */}
            {user?.bio && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>About Me</Text>
                <View style={s.bioCard}>
                  <Text style={s.bioText}>{user.bio}</Text>
                </View>
              </View>
            )}

            {/* License Section */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>License</Text>
                <TouchableOpacity onPress={() => setShowLicenseModal(true)}>
                  <Ionicons name={user?.license_number ? "create-outline" : "add-circle"} size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {user?.license_number ? (
                <View style={s.licenseCard}>
                  <View style={s.licenseHeader}>
                    <Ionicons name="ribbon" size={24} color={colors.green} />
                    <View style={s.licenseBadge}>
                      <Text style={s.licenseBadgeText}>Verified</Text>
                    </View>
                  </View>
                  <View style={s.licenseDetails}>
                    <View style={s.licenseRow}>
                      <Text style={s.licenseLabel}>License #</Text>
                      <Text style={s.licenseValue}>{user.license_number}</Text>
                    </View>
                    {user.license_type && (
                      <View style={s.licenseRow}>
                        <Text style={s.licenseLabel}>Type</Text>
                        <Text style={s.licenseValue}>{user.license_type}</Text>
                      </View>
                    )}
                    {user.license_expiry && (
                      <View style={s.licenseRow}>
                        <Text style={s.licenseLabel}>Expires</Text>
                        <Text style={s.licenseValue}>{user.license_expiry}</Text>
                      </View>
                    )}
                  </View>
                  {user.license_image && (
                    <Image source={{ uri: user.license_image }} style={s.licenseImage} />
                  )}
                </View>
              ) : (
                <TouchableOpacity style={s.addLicenseBtn} onPress={() => setShowLicenseModal(true)}>
                  <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                  <Text style={s.addLicenseText}>Add your license</Text>
                  <Text style={s.addLicenseSubtext}>Build trust with clients</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Portfolio Section - Combined photos with title/description */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Portfolio</Text>
                <TouchableOpacity onPress={() => setShowAddPortfolio(true)}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {portfolio.map(item => (
                <View key={item.id} style={s.portfolioItem}>
                  {item.images && item.images.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={s.portfolioImagesScroll}
                    >
                      {item.images.map((img: string, idx: number) => (
                        <Image 
                          key={idx} 
                          source={{ uri: img }} 
                          style={s.portfolioImage} 
                        />
                      ))}
                    </ScrollView>
                  )}
                  <View style={s.portfolioInfo}>
                    <Text style={s.portfolioTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={s.portfolioDesc}>{item.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={s.deletePortfolioBtn}
                    onPress={() => deletePortfolioItem(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))}
              {portfolio.length === 0 && (
                <View style={s.emptyPortfolio}>
                  <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
                  <Text style={s.emptyText}>No portfolio items yet</Text>
                  <Text style={s.emptySubtext}>Add photos of your work to showcase your skills</Text>
                </View>
              )}
            </View>

            {/* Subscription */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Subscription</Text>
              <View style={s.subscriptionCard}>
                <View style={s.subRow}>
                  <Text style={s.subLabel}>Status</Text>
                  <View style={[s.subBadge, user?.subscription_status === 'active' ? s.subActive : s.subPending]}>
                    <Text style={s.subBadgeText}>
                      {user?.subscription_status === 'active' ? 'Active' : 'Free Trial'}
                    </Text>
                  </View>
                </View>
                <Text style={s.subNote}>Enjoying free access during beta!</Text>
              </View>
            </View>

            {/* Location & Phone Settings */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Location & Phone Settings</Text>
              <View style={s.settingCard}>
                {/* Phone Visibility Toggle - FIRST */}
                <View style={s.settingRow}>
                  <View style={s.settingInfo}>
                    <Ionicons name="eye" size={22} color={colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.settingLabel}>Show Phone to Clients</Text>
                      <Text style={s.settingDesc}>Allow clients to call you directly</Text>
                    </View>
                  </View>
                  <Switch 
                    value={phoneVisible} 
                    onValueChange={togglePhoneVisibility}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={phoneVisible ? colors.primary : '#f4f4f4'} 
                  />
                </View>

                <View style={s.divider} />

                {/* Phone Number Edit - SECOND */}
                <View style={s.settingRow}>
                  <View style={s.settingInfo}>
                    <Ionicons name="call" size={22} color={colors.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <View style={s.phoneRowHeader}>
                        <Text style={s.settingLabel}>Phone Number</Text>
                        {user?.phone_verified && (
                          <View style={s.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                            <Text style={s.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.phoneInputRow}>
                        <TextInput
                          style={[s.phoneInput, { flex: 1 }]}
                          value={editPhone}
                          onChangeText={(text) => setEditPhone(formatPhoneNumber(text))}
                          onBlur={() => {
                            // Revert to original phone if not verified
                            if (editPhone !== originalPhone) {
                              setEditPhone(originalPhone);
                            }
                          }}
                          placeholder="(555) 555 5555"
                          keyboardType="phone-pad"
                          maxLength={14}
                        />
                        {editPhone && editPhone !== user?.phone && (
                          <TouchableOpacity 
                            style={s.verifyPhoneBtn}
                            onPress={savePhoneNumber}
                            disabled={sendingPhoneCode}
                          >
                            {sendingPhoneCode ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Text style={s.verifyPhoneBtnText}>Verify</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Live Location Toggle - THIRD */}
                <View style={s.settingRow}>
                  <View style={s.settingInfo}>
                    <Ionicons name="location" size={22} color={colors.primary} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.settingLabel}>Live Location</Text>
                      <Text style={s.settingDesc}>Share your real-time location</Text>
                    </View>
                  </View>
                  <Switch 
                    value={liveLocation} 
                    onValueChange={toggleLiveLocation}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={liveLocation ? colors.primary : '#f4f4f4'} 
                  />
                </View>

                <View style={s.divider} />
                
                {/* Service Radius Slider - FOURTH */}
                <View style={s.radiusSection}>
                  <View style={s.radiusHeader}>
                    <View style={s.radiusInfo}>
                      <Ionicons name="compass-outline" size={22} color={colors.primary} />
                      <Text style={s.radiusLabel}>Service Radius</Text>
                    </View>
                    <Text style={s.radiusValue}>
                      {serviceRadius >= 200 ? '200+ km' : `${serviceRadius} km`}
                    </Text>
                  </View>
                  <View style={s.sliderContainer}>
                    <Text style={s.sliderMinMax}>0</Text>
                    <Slider
                      style={s.slider}
                      minimumValue={0}
                      maximumValue={200}
                      step={5}
                      value={serviceRadius}
                      onSlidingComplete={updateServiceRadius}
                      onValueChange={setServiceRadius}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.primary}
                    />
                    <Text style={s.sliderMinMax}>200+</Text>
                  </View>
                  <Text style={s.radiusHint}>
                    How far are you willing to travel for jobs?
                  </Text>
                </View>
              </View>
            </View>

            {/* Account Settings for Contractor */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Account Settings</Text>
              <TouchableOpacity 
                style={s.menuItem}
                onPress={() => router.push('/forgot-password')}
              >
                <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
                <Text style={s.menuItemText}>Reset Password</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.menuItem}
                onPress={() => router.push('/support')}
              >
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                <Text style={s.menuItemText}>Support / Contact Us</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={s.menuItem}
                onPress={() => setShowPrivacyPolicy(true)}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                <Text style={s.menuItemText}>Privacy & Policy</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Client mode or pure client - simplified profile */}
        {(!isContractor || isClientMode) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Account Settings</Text>
            <TouchableOpacity 
              style={s.menuItem}
              onPress={() => {
                setEditName(user?.name || '');
                setEditPhone(user?.phone || '');
                setShowEditProfile(true);
              }}
            >
              <Ionicons name="person-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={s.menuItem}
              onPress={() => router.push('/forgot-password')}
            >
              <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Reset Password</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={s.menuItem}
              onPress={() => router.push('/support')}
            >
              <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Support / Contact Us</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={s.menuItem}
              onPress={() => setShowPrivacyPolicy(true)}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Privacy & Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.red} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        {/* Add Portfolio Modal */}
        <Modal visible={showAddPortfolio} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={s.modalKeyboard}
            >
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Add Portfolio Item</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowAddPortfolio(false);
                      setPortfolioTitle('');
                      setPortfolioDesc('');
                      setPortfolioImages([]);
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                {/* Photo Selection */}
                <Text style={s.inputLabel}>Photos (up to 4)</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={s.portfolioImagesPicker}
                >
                  {portfolioImages.map((img, idx) => (
                    <View key={idx} style={s.pickedImageContainer}>
                      <Image source={{ uri: img }} style={s.pickedImage} />
                      <TouchableOpacity 
                        style={s.removeImageBtn}
                        onPress={() => removePortfolioImage(idx)}
                      >
                        <Ionicons name="close-circle" size={22} color={colors.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {portfolioImages.length < 4 && (
                    <TouchableOpacity style={s.addImageBtn} onPress={pickPortfolioImage}>
                      <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                      <Text style={s.addImageText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <Text style={s.inputLabel}>Project Title *</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g., Kitchen Renovation"
                  placeholderTextColor={colors.textSecondary}
                  value={portfolioTitle}
                  onChangeText={setPortfolioTitle}
                />
                
                <Text style={s.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[s.modalInput, s.textArea]}
                  placeholder="Describe the project..."
                  placeholderTextColor={colors.textSecondary}
                  value={portfolioDesc}
                  onChangeText={setPortfolioDesc}
                  multiline
                  numberOfLines={3}
                />
                
                <View style={s.modalActions}>
                  <TouchableOpacity 
                    style={s.modalCancelBtn} 
                    onPress={() => {
                      setShowAddPortfolio(false);
                      setPortfolioTitle('');
                      setPortfolioDesc('');
                      setPortfolioImages([]);
                    }}
                  >
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.modalConfirmBtn, (!portfolioTitle.trim() || portfolioImages.length === 0) && s.modalConfirmBtnDisabled]} 
                    onPress={addPortfolioItem}
                    disabled={saving || !portfolioTitle.trim() || portfolioImages.length === 0}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.paper} />
                    ) : (
                      <Text style={s.modalConfirmText}>Add to Portfolio</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* License Modal */}
        <Modal visible={showLicenseModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={s.modalKeyboard}
            >
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>License Information</Text>
                  <TouchableOpacity onPress={() => setShowLicenseModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={s.inputLabel}>License Number *</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g., LIC-12345678"
                  placeholderTextColor={colors.textSecondary}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                />
                
                <Text style={s.inputLabel}>License Type</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g., General Contractor, Electrician"
                  placeholderTextColor={colors.textSecondary}
                  value={licenseType}
                  onChangeText={setLicenseType}
                />
                
                <Text style={s.inputLabel}>Expiration Date</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g., 12/2025"
                  placeholderTextColor={colors.textSecondary}
                  value={licenseExpiry}
                  onChangeText={setLicenseExpiry}
                />
                
                <Text style={s.inputLabel}>License Photo (optional)</Text>
                <TouchableOpacity style={s.licenseImagePicker} onPress={pickLicenseImage}>
                  {licenseImage ? (
                    <Image source={{ uri: licenseImage }} style={s.licensePickedImage} />
                  ) : (
                    <View style={s.licenseImagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                      <Text style={s.addImageText}>Upload Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={s.modalActions}>
                  <TouchableOpacity 
                    style={s.modalCancelBtn} 
                    onPress={() => setShowLicenseModal(false)}
                  >
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.modalSaveBtn, saving && s.modalSaveBtnDisabled]} 
                    onPress={saveLicense}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color={colors.paper} />
                    ) : (
                      <Text style={s.modalSaveText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Trade Edit Modal */}
        <Modal visible={showTradeModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.tradeModalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Edit Services</Text>
                <TouchableOpacity onPress={() => setShowTradeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={s.tradeModalSubtitle}>Select up to 5 services ({editTrades.length}/5)</Text>
              <ScrollView style={s.tradeList}>
                {TRADES.map((trade) => {
                  const isSelected = editTrades.includes(trade.name);
                  const isDisabled = !isSelected && editTrades.length >= 5;
                  return (
                    <TouchableOpacity
                      key={trade.name}
                      style={[s.tradeItem, isSelected && s.tradeItemSelected, isDisabled && s.tradeItemDisabled]}
                      onPress={() => !isDisabled && toggleTrade(trade.name)}
                      disabled={isDisabled}
                    >
                      <View style={s.tradeItemLeft}>
                        <Text style={s.tradeEmoji}>{trade.icon}</Text>
                        <Text style={[s.tradeName, isDisabled && s.tradeNameDisabled]}>{trade.name}</Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="remove-circle" size={24} color="#EF4444" />
                      ) : (
                        <Ionicons name="add-circle" size={24} color={isDisabled ? colors.border : colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={s.tradeModalActions}>
                <TouchableOpacity style={s.tradeModalCancelBtn} onPress={() => setShowTradeModal(false)}>
                  <Text style={s.tradeModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.tradeModalSaveBtn} onPress={saveTrades}>
                  <Text style={s.tradeModalSaveText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Phone Verification Modal */}
        <Modal visible={showPhoneVerifyModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={s.modalKeyboard}
            >
              <View style={s.phoneVerifyModalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Verify Phone Number</Text>
                  <TouchableOpacity onPress={() => setShowPhoneVerifyModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={s.phoneVerifyBody}>
                  <View style={s.phoneIconCircle}>
                    <Ionicons name="chatbubble-ellipses" size={32} color={colors.primary} />
                  </View>
                  <Text style={s.phoneVerifyTitle}>Enter Verification Code</Text>
                  <Text style={s.phoneVerifySubtitle}>
                    We sent a 6-digit code to{'\n'}
                    <Text style={s.phoneVerifyNumber}>{phoneToVerify}</Text>
                  </Text>
                  
                  <TextInput
                    style={s.codeInput}
                    value={phoneVerifyCode}
                    onChangeText={setPhoneVerifyCode}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                  
                  <TouchableOpacity 
                    style={[s.verifyCodeBtn, verifyingPhone && s.btnDisabled]}
                    onPress={verifyAndSavePhone}
                    disabled={verifyingPhone || phoneVerifyCode.length !== 6}
                  >
                    {verifyingPhone ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={s.verifyCodeBtnText}>Verify Phone Number</Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={s.resendCodeBtn}
                    onPress={resendPhoneCode}
                    disabled={sendingPhoneCode}
                  >
                    {sendingPhoneCode ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={s.resendCodeText}>Didn't receive code? Resend</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Edit Profile Modal (Client - Name & Phone only) */}
        <Modal visible={showEditProfile} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={s.modalKeyboard}
            >
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Edit Profile</Text>
                  <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={s.inputLabel}>Name *</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="Your name"
                  placeholderTextColor={colors.textSecondary}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />
                
                <Text style={s.inputLabel}>Phone Number</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g., (416) 555-1234"
                  placeholderTextColor={colors.textSecondary}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                
                <View style={s.modalActions}>
                  <TouchableOpacity 
                    style={s.modalCancelBtn} 
                    onPress={() => setShowEditProfile(false)}
                  >
                    <Text style={s.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.modalConfirmBtn, !editName.trim() && s.modalConfirmBtnDisabled]} 
                    onPress={saveClientProfile}
                    disabled={saving || !editName.trim()}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.paper} />
                    ) : (
                      <Text style={s.modalConfirmText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Privacy Policy Modal */}
        <Modal visible={showPrivacyPolicy} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { maxHeight: '80%' }]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Privacy & Policy</Text>
                <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={s.privacyScroll} showsVerticalScrollIndicator={false}>
                <Text style={s.privacySection}>Data Collection</Text>
                <Text style={s.privacyText}>
                  MiPropertyGuru collects personal information you provide when creating an account, including your name, email address, and phone number. We also collect information about jobs you post or respond to.
                </Text>
                
                <Text style={s.privacySection}>How We Use Your Data</Text>
                <Text style={s.privacyText}>
                  Your information is used to facilitate connections between property owners and service contractors. We use your contact details to enable communication between parties and to send important service updates.
                </Text>
                
                <Text style={s.privacySection}>Data Security</Text>
                <Text style={s.privacyText}>
                  We implement industry-standard security measures to protect your personal information. Your data is encrypted during transmission and stored securely on our servers.
                </Text>
                
                <Text style={s.privacySection}>Third-Party Sharing</Text>
                <Text style={s.privacyText}>
                  We do not sell your personal information to third parties. Your contact details are only shared with contractors or clients you choose to connect with through our platform.
                </Text>
                
                <Text style={s.privacySection}>Your Rights</Text>
                <Text style={s.privacyText}>
                  You have the right to access, correct, or delete your personal information at any time. Contact our support team for assistance with data-related requests.
                </Text>
                
                <Text style={s.privacySection}>Contact Us</Text>
                <Text style={s.privacyText}>
                  If you have questions about our privacy practices, please contact us at support@mipropertyguru.com
                </Text>
                
                <Text style={s.privacyUpdated}>Last updated: June 2025</Text>
              </ScrollView>
              
              <TouchableOpacity 
                style={s.privacyCloseBtn} 
                onPress={() => setShowPrivacyPolicy(false)}
              >
                <Text style={s.privacyCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  modeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  switchModeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  becomeContractorBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 4,
  },
  becomeContractorBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
  },
  becomeContractorSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  profileCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLgText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.paper,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 6,
    gap: 6,
  },
  tradesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  tradesContainerEditable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  editTradesBtn: {
    backgroundColor: colors.primaryLight,
    padding: 6,
    borderRadius: 15,
    marginLeft: 4,
  },
  phoneInput: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 4,
  },
  // Trade Modal Styles
  tradeModalContent: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  tradeModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  tradeList: {
    maxHeight: 400,
  },
  tradeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  tradeItemSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tradeItemDisabled: {
    opacity: 0.5,
  },
  tradeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeEmoji: {
    fontSize: 24,
  },
  tradeName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  tradeNameDisabled: {
    color: colors.textSecondary,
  },
  tradeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  tradeModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  tradeModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tradeModalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  tradeModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  // Phone verification styles
  phoneRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  verifyPhoneBtn: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  verifyPhoneBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  phoneVerifyModalContent: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    alignSelf: 'center',
  },
  phoneVerifyBody: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  phoneIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  phoneVerifyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  phoneVerifySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneVerifyNumber: {
    fontWeight: '600',
    color: colors.primary,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    width: '80%',
    marginBottom: 20,
  },
  verifyCodeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyCodeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  resendCodeBtn: {
    paddingVertical: 8,
  },
  resendCodeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  tradeIcon: {
    fontSize: 14,
    marginRight: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 10,
  },
  profilePhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statEmoji: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  bioCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
  },
  bioText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
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
  subscriptionCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  subBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subActive: {
    backgroundColor: colors.greenLight,
  },
  subPending: {
    backgroundColor: colors.primaryLight,
  },
  subBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
  subNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  settingCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  radiusSection: {
    marginBottom: 4,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radiusLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  radiusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMinMax: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    width: 30,
  },
  radiusHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  workLocTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 12,
  },
  workLocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flex: 1,
  },
  workLocItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workLocActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workLocEditBtn: {
    padding: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  workLocDeleteBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  workLocText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  portfolioItem: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  portfolioImagesScroll: {
    marginBottom: 10,
  },
  portfolioImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginRight: 8,
  },
  portfolioInfo: {
    flex: 1,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  portfolioDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  deletePortfolioBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    backgroundColor: colors.background,
    borderRadius: 20,
  },
  emptyPortfolio: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  settingsBtnText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.red,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    backgroundColor: colors.border,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  modalKeyboard: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  portfolioImagesPicker: {
    marginBottom: 16,
  },
  pickedImageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  pickedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  addImageText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Languages display
  languagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#EBF5FF',
    borderRadius: 20,
    gap: 8,
  },
  languagesText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  // License badge on profile
  licenseBadgeProfile: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  licenseBadgeProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  // License section styles
  licenseCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  licenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  licenseBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  licenseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  licenseDetails: {
    gap: 8,
  },
  licenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  licenseLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  licenseValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  licenseImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
  },
  addLicenseBtn: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  addLicenseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  addLicenseSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  licenseImagePicker: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  licensePickedImage: {
    width: '100%',
    height: '100%',
  },
  licenseImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Privacy Policy Modal styles
  privacyScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  privacySection: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  privacyUpdated: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 20,
    textAlign: 'center',
  },
  privacyCloseBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  privacyCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  // Modal Save button styles (if missing)
  modalSaveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: colors.border,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
});
