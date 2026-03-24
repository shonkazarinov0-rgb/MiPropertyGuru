import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';

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
  const [saving, setSaving] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [workPhotos, setWorkPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role === 'contractor') {
      fetchPortfolio();
      setWorkPhotos(user?.work_photos || []);
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

  const addPortfolioItem = async () => {
    if (!portfolioTitle.trim()) return;
    setSaving(true);
    try {
      await api.post('/portfolio', { title: portfolioTitle, description: portfolioDesc });
      await fetchPortfolio();
      setPortfolioTitle(''); setPortfolioDesc(''); setShowAddPortfolio(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
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
        const newPhotos = [...workPhotos, photoUri];
        setWorkPhotos(newPhotos);
        // Save to server
        try {
          await api.put('/contractors/work-photos', { work_photos: newPhotos });
        } catch (e) {
          console.log('Could not save photos to server');
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const removeWorkPhoto = async (index: number) => {
    const newPhotos = workPhotos.filter((_, i) => i !== index);
    setWorkPhotos(newPhotos);
    try {
      await api.put('/contractors/work-photos', { work_photos: newPhotos });
    } catch (e) {
      console.log('Could not save photos to server');
    }
  };

  const handleModeSwitch = async () => {
    if (user?.role !== 'contractor') return;
    
    const newMode = isContractorMode ? 'client' : 'contractor';
    await switchMode(newMode);
    
    // Navigate appropriately
    if (newMode === 'client') {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const isContractor = user?.role === 'contractor';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
          {isContractor && (
            <View style={s.modeBadge}>
              <Text style={s.modeText}>
                {isContractorMode ? '👷 Contractor Mode' : '🏠 Client Mode'}
              </Text>
            </View>
          )}
        </View>

        {/* Mode Switcher for Contractors - matches Dashboard style */}
        {isContractor && (
          <TouchableOpacity style={s.switchModeBtn} onPress={handleModeSwitch}>
            <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            <Text style={s.switchModeBtnText}>
              Switch to {isContractorMode ? 'Client' : 'Contractor'} Mode
            </Text>
          </TouchableOpacity>
        )}

        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarLg}>
            <Text style={s.avatarLgText}>
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </Text>
          </View>
          <Text style={s.profileName}>{user?.name}</Text>
          
          {/* Show trade badge only in contractor mode */}
          {isContractor && isContractorMode && (
            <View style={s.typeBadge}>
              <Text style={s.typeText}>{user?.contractor_type}</Text>
            </View>
          )}
          
          <Text style={s.profileEmail}>{user?.email}</Text>
          <Text style={s.profilePhone}>{user?.phone}</Text>
          
          {/* Show stats only in contractor mode */}
          {isContractor && isContractorMode && (
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statValue}>{user?.rating || 0}</Text>
                <Text style={s.statLabel}>Rating</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statValue}>{user?.review_count || 0}</Text>
                <Text style={s.statLabel}>Reviews</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={s.statValue}>{user?.experience_years || 0}</Text>
                <Text style={s.statLabel}>Years Exp</Text>
              </View>
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

            {/* Work Photos Section */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Photos of My Work</Text>
              <View style={s.photoGrid}>
                {workPhotos.map((photo, index) => (
                  <View key={index} style={s.photoItem}>
                    <Image source={{ uri: photo }} style={s.workPhoto} />
                    <TouchableOpacity 
                      style={s.removePhotoBtn}
                      onPress={() => removeWorkPhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                ))}
                {workPhotos.length < 6 && (
                  <TouchableOpacity style={s.addPhotoBtn} onPress={pickWorkPhoto}>
                    <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
                    <Text style={s.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
              {workPhotos.length === 0 && (
                <Text style={s.emptyText}>No work photos yet. Add some to showcase your skills!</Text>
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

            {/* Location Settings */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Location Settings</Text>
              <View style={s.settingCard}>
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
                <Text style={s.workLocTitle}>Work Locations ({(user?.work_locations || []).length}/3)</Text>
                {(user?.work_locations || []).map((loc: any, i: number) => (
                  <View key={i} style={s.workLocItem}>
                    <Ionicons name="pin" size={16} color={colors.textSecondary} />
                    <Text style={s.workLocText}>{loc.name}</Text>
                  </View>
                ))}
                {(user?.work_locations || []).length < 3 && (
                  <TouchableOpacity style={s.addBtn} onPress={() => setShowAddLocation(true)}>
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                    <Text style={s.addBtnText}>Add Work Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Portfolio */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Portfolio</Text>
                <TouchableOpacity onPress={() => setShowAddPortfolio(true)}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {portfolio.map(item => (
                <View key={item.id} style={s.portfolioItem}>
                  <Text style={s.portfolioTitle}>{item.title}</Text>
                  <Text style={s.portfolioDesc}>{item.description}</Text>
                </View>
              ))}
              {portfolio.length === 0 && (
                <Text style={s.emptyText}>No portfolio items yet</Text>
              )}
            </View>

            {/* Contractor Settings */}
            <TouchableOpacity 
              style={s.settingsBtn}
              onPress={() => router.push('/contractor-settings')}
            >
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
              <Text style={s.settingsBtnText}>Contractor Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        {/* Client mode or pure client - simplified profile */}
        {(!isContractor || isClientMode) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Account Settings</Text>
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="person-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="notifications-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.menuItem}>
              <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
              <Text style={s.menuItemText}>Privacy & Security</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.red} />
          <Text style={s.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        {/* Add Work Location Modal */}
        <Modal visible={showAddLocation} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Add Work Location</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Location name (e.g., Downtown Toronto)"
                placeholderTextColor={colors.textSecondary}
                value={locationName}
                onChangeText={setLocationName}
              />
              <View style={s.modalActions}>
                <TouchableOpacity 
                  style={s.modalCancelBtn} 
                  onPress={() => setShowAddLocation(false)}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={s.modalConfirmBtn} 
                  onPress={addWorkLocation}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.paper} />
                  ) : (
                    <Text style={s.modalConfirmText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Portfolio Modal */}
        <Modal visible={showAddPortfolio} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Add Portfolio Item</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Project title"
                placeholderTextColor={colors.textSecondary}
                value={portfolioTitle}
                onChangeText={setPortfolioTitle}
              />
              <TextInput
                style={[s.modalInput, s.textArea]}
                placeholder="Description"
                placeholderTextColor={colors.textSecondary}
                value={portfolioDesc}
                onChangeText={setPortfolioDesc}
                multiline
                numberOfLines={4}
              />
              <View style={s.modalActions}>
                <TouchableOpacity 
                  style={s.modalCancelBtn} 
                  onPress={() => setShowAddPortfolio(false)}
                >
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={s.modalConfirmBtn} 
                  onPress={addPortfolioItem}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.paper} />
                  ) : (
                    <Text style={s.modalConfirmText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    marginBottom: 20,
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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  profilePhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
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
    padding: 16,
    marginBottom: 10,
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
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
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
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
});
