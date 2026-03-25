import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Switch, Alert, Linking, Modal,
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
  
  // Confirmation modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [jobToRemove, setJobToRemove] = useState<any>(null);

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
        api.get('/contractors/stats').catch(() => null),
        api.get('/jobs/available'),  // Use available jobs endpoint - excludes own posts
      ]);
      if (statsRes) setStats(statsRes);
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
    if (action === 'ignore') {
      // Show confirmation modal for "Not Interested"
      const job = incomingJobs.find(j => j.id === jobId);
      setJobToRemove(job);
      setShowRemoveModal(true);
      return;
    }
    
    // For "Contact" action - navigate to chat with the client
    const job = incomingJobs.find(j => j.id === jobId);
    if (job && job.posted_by) {
      try {
        // Create or get conversation with the job poster
        const conv = await api.post('/conversations', { participant_id: job.posted_by });
        // Navigate to chat
        router.push(`/chat/${conv.id}`);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to start conversation');
      }
    }
  };

  const confirmRemoveJob = async () => {
    if (!jobToRemove) return;
    
    try {
      // Mark job as ignored/dismissed
      await api.post(`/jobs/${jobToRemove.id}/dismiss`).catch(() => {
        // If endpoint doesn't exist, just remove locally
      });
      
      // Remove job from list
      setIncomingJobs(incomingJobs.filter(j => j.id !== jobToRemove.id));
      setShowRemoveModal(false);
      setJobToRemove(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove job');
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
        {/* Top row with badge and time */}
        <View style={styles.jobTopRow}>
          <View style={styles.newIndicator}>
            <View style={styles.newDot} />
            <Text style={styles.newText}>New Job</Text>
          </View>
          <Text style={styles.jobTime}>{timeAgo}</Text>
        </View>
        
        {/* Job title and trade */}
        <Text style={styles.jobTitle}>{item.title}</Text>
        
        <View style={styles.tradeRow}>
          <View style={styles.tradeChip}>
            <Text style={styles.tradeChipText}>{item.trade_required}</Text>
          </View>
          {item.urgency === 'urgent' && (
            <View style={styles.urgentChip}>
              <Ionicons name="flame" size={12} color="#EF4444" />
              <Text style={styles.urgentChipText}>Urgent</Text>
            </View>
          )}
        </View>
        
        {/* Description */}
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        
        {/* Location & Budget row */}
        {(item.location || item.budget) && (
          <View style={styles.detailsRow}>
            {item.location && (
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            )}
            {item.budget && (
              <View style={styles.detailItem}>
                <Ionicons name="wallet-outline" size={14} color="#6B7280" />
                <Text style={styles.detailText}>{item.budget}</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Client info */}
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {item.posted_by_name?.charAt(0) || 'C'}
            </Text>
          </View>
          <Text style={styles.clientName}>{item.posted_by_name}</Text>
        </View>
        
        {/* Action buttons */}
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={styles.declineBtn}
            onPress={() => handleJobResponse(item.id, 'ignore')}
          >
            <Ionicons name="close" size={18} color="#6B7280" />
            <Text style={styles.declineBtnText}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.respondBtn}
            onPress={() => handleJobResponse(item.id, 'accept')}
          >
            <Ionicons name="chatbubble" size={16} color={colors.paper} />
            <Text style={styles.respondBtnText}>Respond</Text>
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
      
      {/* Remove Job Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="trash-outline" size={40} color={colors.red} />
            </View>
            <Text style={styles.modalTitle}>Remove This Job?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove this job from your dashboard? You won't see it again.
            </Text>
            {jobToRemove && (
              <View style={styles.modalJobPreview}>
                <Text style={styles.modalJobTitle}>{jobToRemove.title}</Text>
                <Text style={styles.modalJobTrade}>{jobToRemove.trade_required}</Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowRemoveModal(false);
                  setJobToRemove(null);
                }}
              >
                <Text style={styles.modalCancelText}>Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmBtn}
                onPress={confirmRemoveJob}
              >
                <Text style={styles.modalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  newIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  newText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
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
  jobTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tradeChip: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tradeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  urgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  urgentChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  tradeBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  tradeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  clientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  postedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postedByText: {
    fontSize: 13,
    color: colors.textSecondary,
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
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  respondBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 6,
  },
  respondBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.paper,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.redLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalJobPreview: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
  },
  modalJobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modalJobTrade: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.paper,
  },
});
