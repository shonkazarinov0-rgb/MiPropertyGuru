import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Switch, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
  redLight: '#FEE2E2',
  yellow: '#F59E0B',
  border: '#E5E7EB',
};

export default function ContractorDashboard() {
  const router = useRouter();
  const { user, refreshUser, switchMode, isClientMode, isContractorMode } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [incomingJobs, setIncomingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user) {
      setIsOnline(user.is_online || false);
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (isOnline) {
      updateLocation();
      const interval = setInterval(updateLocation, 60000); // Update every minute when online
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  const updateLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        api.get('/contractors/stats'),
        api.get('/jobs/incoming'),
      ]);
      setStats(statsRes);
      setIncomingJobs(jobsRes.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const toggleOnlineStatus = async () => {
    if (togglingStatus) return;
    
    setTogglingStatus(true);
    try {
      if (!isOnline) {
        await updateLocation();
      }
      
      const res = await api.put('/contractors/online-status', {
        is_online: !isOnline,
        current_lat: currentLocation?.lat,
        current_lng: currentLocation?.lng,
      });
      
      setIsOnline(!isOnline);
      if (refreshUser) refreshUser();
      
      Alert.alert(
        !isOnline ? 'You are now LIVE! 🟢' : 'You are now offline',
        !isOnline 
          ? 'Clients can now see you on the map and send you job requests.'
          : 'You won\'t receive new job alerts while offline.'
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleJobResponse = async (jobId: string, action: 'accept' | 'ignore') => {
    try {
      await api.post('/jobs/respond', { job_id: jobId, action });
      
      if (action === 'accept') {
        Alert.alert('Great! 🎉', 'The client has been notified. They may contact you soon.');
      }
      
      // Remove job from list
      setIncomingJobs(incomingJobs.filter(j => j.id !== jobId));
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to respond');
    }
  };

  const toggleMode = async () => {
    try {
      const newMode = isClientMode ? 'contractor' : 'client';
      await switchMode(newMode);
      if (newMode === 'client') {
        router.push('/(tabs)/home');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderJobAlert = ({ item }: { item: any }) => {
    const createdAt = new Date(item.created_at);
    const timeAgo = getTimeAgo(createdAt);

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
          <Text style={styles.jobTime}>{timeAgo}</Text>
        </View>
        
        <Text style={styles.jobCategory}>{item.category}</Text>
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.jobMeta}>
          {item.distance_km && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.metaText}>{item.distance_km} km away</Text>
            </View>
          )}
          {item.urgency === 'urgent' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>🔥 Urgent</Text>
            </View>
          )}
        </View>
        
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={styles.ignoreBtn}
            onPress={() => handleJobResponse(item.id, 'ignore')}
          >
            <Text style={styles.ignoreBtnText}>Ignore</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acceptBtn}
            onPress={() => handleJobResponse(item.id, 'accept')}
          >
            <Ionicons name="checkmark" size={20} color={colors.paper} />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={incomingJobs}
        renderItem={renderJobAlert}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={() => (
          <>
            {/* Online Status Toggle */}
            <View style={[styles.statusCard, isOnline ? styles.statusOnline : styles.statusOffline]}>
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                <View>
                  <Text style={styles.statusTitle}>
                    {isOnline ? 'You are LIVE' : 'You are offline'}
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    {isOnline 
                      ? 'Clients can find you on the map' 
                      : 'Go online to receive job alerts'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnlineStatus}
                trackColor={{ false: '#E5E7EB', true: colors.green }}
                thumbColor={colors.paper}
                disabled={togglingStatus}
              />
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.jobs_received_this_week || 0}</Text>
                <Text style={styles.statLabel}>Jobs this week</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.profile_views || 0}</Text>
                <Text style={styles.statLabel}>Profile views</Text>
              </View>
            </View>

            {/* Quick Stats Row */}
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <Ionicons name="star" size={18} color="#FFB800" />
                <Text style={styles.quickStatText}>{stats?.rating || 0}</Text>
                <Text style={styles.quickStatLabel}>({stats?.review_count || 0} reviews)</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                <Text style={styles.quickStatText}>{stats?.jobs_completed || 0}</Text>
                <Text style={styles.quickStatLabel}>completed</Text>
              </View>
            </View>

            {/* Switch Mode Button */}
            <TouchableOpacity style={styles.switchModeBtn} onPress={toggleMode}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={styles.switchModeText}>
                {isClientMode ? 'Switch to Contractor Mode' : 'Switch to Client Mode'}
              </Text>
            </TouchableOpacity>

            {/* Incoming Jobs Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Incoming Jobs</Text>
              {incomingJobs.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{incomingJobs.length}</Text>
                </View>
              )}
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            {isOnline ? (
              <>
                <Ionicons name="hourglass-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>Waiting for jobs...</Text>
                <Text style={styles.emptySubtitle}>
                  New job alerts will appear here when clients post jobs matching your skills
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>You're offline</Text>
                <Text style={styles.emptySubtitle}>
                  Go online to start receiving job alerts from clients near you
                </Text>
              </>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  statusOnline: {
    backgroundColor: colors.greenLight,
    borderWidth: 2,
    borderColor: colors.green,
  },
  statusOffline: {
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotOnline: {
    backgroundColor: colors.green,
  },
  dotOffline: {
    backgroundColor: colors.textSecondary,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  statusSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 8,
  },
  switchModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.red,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.paper,
  },
  jobCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newBadge: {
    backgroundColor: colors.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.paper,
  },
  jobTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobCategory: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  urgentBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  jobActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  ignoreBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ignoreBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.green,
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.paper,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
