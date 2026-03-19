import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [liveLocation, setLiveLocation] = useState(user?.live_location_enabled || false);
  const [saving, setSaving] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');

  useEffect(() => {
    if (user?.role === 'contractor') fetchPortfolio();
  }, []);

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

  const isContractor = user?.role === 'contractor';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.header}>
          <Text style={s.title}>Profile</Text>
        </View>

        <View style={s.profileCard}>
          <View style={s.avatarLg}>
            <Text style={s.avatarLgText}>{user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
          </View>
          <Text style={s.profileName}>{user?.name}</Text>
          {isContractor && <View style={s.typeBadge}><Text style={s.typeText}>{user?.contractor_type}</Text></View>}
          <Text style={s.profileEmail}>{user?.email}</Text>
          <Text style={s.profilePhone}>{user?.phone}</Text>
          {isContractor && (
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
            </View>
          )}
        </View>

        {isContractor && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Subscription</Text>
              <View style={s.subscriptionCard}>
                <View style={s.subRow}>
                  <Text style={s.subLabel}>Status</Text>
                  <View style={[s.subBadge, user?.subscription_status === 'active' ? s.subActive : s.subPending]}>
                    <Text style={s.subBadgeText}>{user?.subscription_status === 'active' ? 'Active' : 'Pending'}</Text>
                  </View>
                </View>
                <View style={s.subRow}>
                  <Text style={s.subLabel}>Monthly Fee</Text>
                  <Text style={s.subAmount}>$24.99 CAD/mo</Text>
                </View>
                <Text style={s.subNote}>Stripe payment integration coming soon</Text>
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Location Settings</Text>
              <View style={s.settingCard}>
                <View style={s.settingRow}>
                  <View style={s.settingInfo}>
                    <Ionicons name="location" size={22} color={colors.primary} />
                    <View style={{ marginLeft: spacing.s }}>
                      <Text style={s.settingLabel}>Live Location</Text>
                      <Text style={s.settingDesc}>Share your real-time location</Text>
                    </View>
                  </View>
                  <Switch testID="live-location-toggle" value={liveLocation} onValueChange={toggleLiveLocation}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={liveLocation ? colors.primary : '#f4f4f4'} />
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
                  <TouchableOpacity testID="add-work-location-btn" style={s.addBtn} onPress={() => setShowAddLocation(true)}>
                    <Ionicons name="add-circle" size={20} color={colors.primary} />
                    <Text style={s.addBtnText}>Add Work Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Portfolio</Text>
                <TouchableOpacity testID="add-portfolio-btn" onPress={() => setShowAddPortfolio(true)}>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
              {portfolio.map(item => (
                <View key={item.id} style={s.portfolioItem}>
                  <Text style={s.portfolioTitle}>{item.title}</Text>
                  <Text style={s.portfolioDesc}>{item.description}</Text>
                </View>
              ))}
              {portfolio.length === 0 && <Text style={s.emptyText}>No portfolio items yet</Text>}
            </View>

            <TouchableOpacity testID="generate-contract-btn" style={s.contractBtn}
              onPress={() => router.push('/contract/generate')}>
              <Ionicons name="document-text" size={22} color={colors.paper} />
              <Text style={s.contractBtnText}>Generate AI Contract</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAddLocation} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Work Location</Text>
            <Text style={s.modalDesc}>Your current GPS coordinates will be used</Text>
            <TextInput testID="location-name-input" style={s.modalInput} placeholder="Area name (e.g. Downtown NYC)"
              placeholderTextColor={colors.placeholder} value={locationName} onChangeText={setLocationName} />
            <View style={s.modalBtns}>
              <TouchableOpacity testID="cancel-location-btn" style={s.modalCancelBtn} onPress={() => setShowAddLocation(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-location-btn" style={s.modalSaveBtn} onPress={addWorkLocation} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.secondary} size="small" /> : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showAddPortfolio} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Portfolio Item</Text>
            <TextInput testID="portfolio-title-input" style={s.modalInput} placeholder="Project title"
              placeholderTextColor={colors.placeholder} value={portfolioTitle} onChangeText={setPortfolioTitle} />
            <TextInput testID="portfolio-desc-input" style={[s.modalInput, { height: 80 }]} placeholder="Describe the project..."
              placeholderTextColor={colors.placeholder} value={portfolioDesc} onChangeText={setPortfolioDesc}
              multiline textAlignVertical="top" />
            <View style={s.modalBtns}>
              <TouchableOpacity testID="cancel-portfolio-btn" style={s.modalCancelBtn} onPress={() => setShowAddPortfolio(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-portfolio-btn" style={s.modalSaveBtn} onPress={addPortfolioItem} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.secondary} size="small" /> : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: spacing.m, paddingVertical: spacing.m, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 28, fontWeight: '700', color: colors.secondary },
  profileCard: {
    backgroundColor: colors.paper, margin: spacing.m, borderRadius: radius.m, padding: spacing.l,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  avatarLg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.m,
  },
  avatarLgText: { fontSize: 28, fontWeight: '700', color: colors.paper },
  profileName: { fontSize: 22, fontWeight: '700', color: colors.secondary },
  typeBadge: {
    backgroundColor: '#FFF8EC', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: radius.round, marginTop: spacing.xs,
  },
  typeText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  profileEmail: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs },
  profilePhone: { fontSize: 15, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: spacing.m, gap: spacing.l },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },
  section: { paddingHorizontal: spacing.m, marginTop: spacing.m },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.secondary, marginBottom: spacing.s },
  subscriptionCard: {
    backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.m,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.s },
  subLabel: { fontSize: 15, color: colors.textSecondary },
  subBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.round },
  subActive: { backgroundColor: '#E8F9EE' },
  subPending: { backgroundColor: '#FFF8EC' },
  subBadgeText: { fontSize: 12, fontWeight: '600', color: colors.success },
  subAmount: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  subNote: { fontSize: 12, color: colors.textDisabled, marginTop: spacing.xs },
  settingCard: {
    backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.m,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  settingDesc: { fontSize: 12, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.m },
  workLocTitle: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: spacing.s },
  workLocItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingVertical: spacing.xs },
  workLocText: { fontSize: 14, color: colors.textSecondary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.s },
  addBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  portfolioItem: {
    backgroundColor: colors.paper, borderRadius: radius.s, padding: spacing.m, marginBottom: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  portfolioTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  portfolioDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: 14, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.m },
  contractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s,
    backgroundColor: colors.secondary, borderRadius: radius.l, paddingVertical: 16,
    marginHorizontal: spacing.m, marginTop: spacing.l,
  },
  contractBtnText: { fontSize: 17, fontWeight: '600', color: colors.paper },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.s,
    marginHorizontal: spacing.m, marginTop: spacing.l, paddingVertical: 16,
    borderWidth: 1, borderColor: colors.error, borderRadius: radius.l,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: colors.error },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.l },
  modalContent: { backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.l },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.secondary, marginBottom: spacing.xs },
  modalDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.m },
  modalInput: {
    backgroundColor: colors.background, borderRadius: radius.s, paddingHorizontal: spacing.m,
    paddingVertical: 12, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.m,
  },
  modalBtns: { flexDirection: 'row', gap: spacing.m },
  modalCancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radius.l, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  modalSaveBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: radius.l, backgroundColor: colors.primary },
  modalSaveText: { fontSize: 16, fontWeight: '600', color: colors.secondary },
});
