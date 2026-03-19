import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors } from '../src/theme';
import { router } from 'expo-router';

interface Contractor {
  id: string;
  name: string;
  email: string;
  contractor_type: string;
  subscription_status: string;
  subscription_fee: number;
}

export default function AdminSecretScreen() {
  const [adminSecret, setAdminSecret] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!adminSecret.trim()) {
      setError('Please enter the admin code');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      await api.post('/admin/verify', { admin_secret: adminSecret });
      setVerified(true);
      loadContractors();
    } catch (err: any) {
      setError(err.message || 'Invalid admin code');
    } finally {
      setVerifying(false);
    }
  };

  const loadContractors = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/contractors?admin_secret=${encodeURIComponent(adminSecret)}`);
      setContractors(res.contractors || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (contractor: Contractor) => {
    const confirm = Platform.OS === 'web'
      ? window.confirm(`Activate ${contractor.name} for FREE?`)
      : true;
    
    if (!confirm && Platform.OS === 'web') return;

    setActionLoading(contractor.id);
    try {
      await api.post(`/admin/activate/${contractor.id}`, { admin_secret: adminSecret });
      loadContractors();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to activate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (contractor: Contractor) => {
    const confirm = Platform.OS === 'web'
      ? window.confirm(`Deactivate ${contractor.name}?`)
      : true;
    
    if (!confirm && Platform.OS === 'web') return;

    setActionLoading(contractor.id);
    try {
      await api.post(`/admin/deactivate/${contractor.id}`, { admin_secret: adminSecret });
      loadContractors();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to deactivate');
    } finally {
      setActionLoading(null);
    }
  };

  const renderContractor = ({ item }: { item: Contractor }) => {
    const isActive = item.subscription_status === 'active';
    const isFree = item.subscription_fee === 0;
    const isLoading = actionLoading === item.id;

    return (
      <View style={styles.contractorCard}>
        <View style={styles.contractorInfo}>
          <Text style={styles.contractorName}>{item.name}</Text>
          <Text style={styles.contractorEmail}>{item.email}</Text>
          <Text style={styles.contractorType}>{item.contractor_type}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.pendingBadge]}>
              <Text style={styles.statusText}>{isActive ? 'Active' : 'Pending'}</Text>
            </View>
            {isFree && isActive && (
              <View style={[styles.statusBadge, styles.freeBadge]}>
                <Text style={styles.statusText}>FREE</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : isActive ? (
            <TouchableOpacity style={styles.deactivateBtn} onPress={() => handleDeactivate(item)}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
              <Text style={styles.deactivateBtnText}>Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.activateBtn} onPress={() => handleActivate(item)}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.activateBtnText}>Activate Free</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (!verified) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Access</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.verifyContent}>
          <Ionicons name="shield-checkmark" size={60} color={colors.primary} />
          <Text style={styles.verifyTitle}>Admin Panel</Text>
          <Text style={styles.verifySubtitle}>Enter your secret admin code to manage contractors</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Admin Secret Code"
            placeholderTextColor={colors.textDisabled}
            value={adminSecret}
            onChangeText={setAdminSecret}
            secureTextEntry
            autoCapitalize="none"
          />
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={verifying}>
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyBtnText}>Access Admin Panel</Text>
            )}
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
        <Text style={styles.headerTitle}>Manage Contractors</Text>
        <TouchableOpacity onPress={loadContractors} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{contractors.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {contractors.filter(c => c.subscription_status === 'active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {contractors.filter(c => c.subscription_status !== 'active').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={contractors}
          keyExtractor={(item) => item.id}
          renderItem={renderContractor}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No contractors found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  backBtn: { padding: 8 },
  refreshBtn: { padding: 8 },
  verifyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  verifyTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 16 },
  verifySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  input: { width: '100%', backgroundColor: colors.paper, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, marginTop: 24, borderWidth: 1, borderColor: colors.border },
  error: { color: colors.error, marginTop: 12 },
  verifyBtn: { backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginTop: 24, width: '100%', alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.paper, borderRadius: 12, padding: 16, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  list: { padding: 16, paddingTop: 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contractorCard: { backgroundColor: colors.paper, borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  contractorInfo: { flex: 1 },
  contractorName: { fontSize: 16, fontWeight: '600', color: colors.text },
  contractorEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  contractorType: { fontSize: 13, color: colors.primary, marginTop: 4 },
  statusRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: colors.success + '20' },
  pendingBadge: { backgroundColor: colors.warning + '20' },
  freeBadge: { backgroundColor: colors.primary + '20' },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.text },
  actions: { marginLeft: 12 },
  activateBtn: { backgroundColor: colors.success, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  activateBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  deactivateBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.error },
  deactivateBtnText: { color: colors.error, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
});
