import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  red: '#EF4444',
  border: '#E5E7EB',
};

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const ADMIN_SECRET = 'mipg-admin-2024'; // Default admin secret

export default function AdminPortalScreen() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'client' | 'contractor'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const savedSecret = await AsyncStorage.getItem('admin_secret');
    if (savedSecret === ADMIN_SECRET) {
      setAuthenticated(true);
      fetchData();
    }
  };

  const handleLogin = async () => {
    if (adminPassword === ADMIN_SECRET) {
      await AsyncStorage.setItem('admin_secret', adminPassword);
      setAuthenticated(true);
      fetchData();
    } else {
      Alert.alert('Error', 'Invalid admin password');
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('admin_secret');
    setAuthenticated(false);
    setUsers([]);
    setStats(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const roleParam = filter !== 'all' ? `?role=${filter}` : '';
      const usersRes = await fetch(`${API_BASE}/api/admin/users${roleParam}`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
      
      // Fetch stats
      const statsRes = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'X-Admin-Secret': ADMIN_SECRET }
      });
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!authenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loginContainer}>
          <View style={styles.loginCard}>
            <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
            <Text style={styles.loginTitle}>Admin Portal</Text>
            <Text style={styles.loginSubtitle}>Enter admin password to continue</Text>
            
            <TextInput
              style={styles.passwordInput}
              placeholder="Admin Password"
              placeholderTextColor={colors.textSecondary}
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
            />
            
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Access Portal</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>← Back to App</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.red} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.blueLight }]}>
              <Ionicons name="people" size={24} color={colors.blue} />
              <Text style={styles.statValue}>{stats.total_users}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.greenLight }]}>
              <Ionicons name="person" size={24} color={colors.green} />
              <Text style={styles.statValue}>{stats.clients}</Text>
              <Text style={styles.statLabel}>Pure Clients</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="construct" size={24} color={colors.primary} />
              <Text style={styles.statValue}>{stats.contractors}</Text>
              <Text style={styles.statLabel}>Contractors</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={24} color="#D97706" />
              <Text style={styles.statValue}>{stats.contractors_with_license}</Text>
              <Text style={styles.statLabel}>With License</Text>
            </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.blue} />
          <Text style={styles.infoBannerText}>
            <Text style={{ fontWeight: '700' }}>Pure Clients</Text> = Users who registered as clients only.{'\n'}
            <Text style={{ fontWeight: '700' }}>Contractors</Text> = Can switch between contractor & client mode.
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Role:</Text>
          <View style={styles.filterRow}>
            {['all', 'client', 'contractor'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f as any)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All Users' : f === 'client' ? '🏠 Clients' : '👷 Contractors'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Users List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Registered Users ({filteredUsers.length})
          </Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            filteredUsers.map((user) => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userPhone}>{user.phone}</Text>
                  </View>
                  <View style={styles.userBadges}>
                    <View style={[
                      styles.roleBadge,
                      user.role === 'contractor' ? styles.contractorBadge : styles.clientBadge
                    ]}>
                      <Text style={styles.roleBadgeText}>
                        {user.role === 'contractor' ? '👷 Contractor' : '🏠 Client'}
                      </Text>
                    </View>
                    {user.has_license && (
                      <View style={styles.licenseBadge}>
                        <Text style={styles.licenseBadgeText}>🪪 Licensed</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.userDetails}>
                  {user.role === 'contractor' && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Trade:</Text>
                        <Text style={styles.detailValue}>{user.contractor_type || 'N/A'}</Text>
                      </View>
                      {user.business_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Business:</Text>
                          <Text style={styles.detailValue}>{user.business_name}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Languages:</Text>
                        <Text style={styles.detailValue}>{(user.languages || ['English']).join(', ')}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Can be Client:</Text>
                        <Text style={[styles.detailValue, { color: colors.green }]}>Yes ✓</Text>
                      </View>
                    </>
                  )}
                  {user.role === 'client' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Can be Contractor:</Text>
                      <Text style={[styles.detailValue, { color: colors.red }]}>
                        No - Must register as contractor
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Registered:</Text>
                    <Text style={styles.detailValue}>{formatDate(user.created_at)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Login:</Text>
                    <Text style={styles.detailValue}>{formatDate(user.last_login)}</Text>
                  </View>
                  {user.suspicious_activity_flagged && (
                    <View style={styles.warningBadge}>
                      <Ionicons name="warning" size={14} color="#B91C1C" />
                      <Text style={styles.warningText}>Suspicious Activity Flagged</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
          
          {!loading && filteredUsers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
  },
  passwordInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  loginBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  backLink: {
    marginTop: 20,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.primary,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.blueLight,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  filterSection: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.paper,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  userBadges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contractorBadge: {
    backgroundColor: colors.primaryLight,
  },
  clientBadge: {
    backgroundColor: colors.greenLight,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  licenseBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  licenseBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
  },
  userDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
