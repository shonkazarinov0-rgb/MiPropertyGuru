import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Switch, Alert, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import ModeToggle from '../../src/components/ModeToggle';

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
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
};

type TabType = 'incoming' | 'inProgress' | 'completed';

// Helper function to get trade-specific icon
const getTradeIcon = (tradeType: string): keyof typeof Ionicons.glyphMap => {
  const trade = (tradeType || '').toLowerCase();
  if (trade.includes('hvac') || trade.includes('heating') || trade.includes('cooling')) return 'snow-outline';
  if (trade.includes('plumb')) return 'water-outline';
  if (trade.includes('electr')) return 'flash-outline';
  if (trade.includes('carpenter') || trade.includes('wood')) return 'hammer-outline';
  if (trade.includes('paint')) return 'color-palette-outline';
  if (trade.includes('roof')) return 'home-outline';
  if (trade.includes('landscap') || trade.includes('garden')) return 'leaf-outline';
  if (trade.includes('clean')) return 'sparkles-outline';
  if (trade.includes('handyman') || trade.includes('general')) return 'construct-outline';
  if (trade.includes('tile') || trade.includes('floor')) return 'grid-outline';
  if (trade.includes('weld')) return 'flame-outline';
  return 'build-outline';
};

export default function ContractorDashboard() {
  const router = useRouter();
  const { user, refreshUser, switchMode, isClientMode, isContractorMode } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [incomingJobs, setIncomingJobs] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  
  // Confirmation modal state
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [jobToRemove, setJobToRemove] = useState<any>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [jobToComplete, setJobToComplete] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setIsOnline(user.is_online || false);
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (isOnline) {
      updateLocation();
      const interval = setInterval(updateLocation, 60000);
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
      const [statsRes, jobsRes, convsRes] = await Promise.all([
        api.get('/contractors/stats').catch(() => null),
        api.get('/jobs/available'),
        api.get('/conversations'),
      ]);
      if (statsRes) setStats(statsRes);
      setIncomingJobs(jobsRes.jobs || []);
      setConversations(convsRes.conversations || []);
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
        !isOnline ? 'You are now LIVE!' : 'You are now offline',
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

  // Filter conversations by status - only show where the other party is a CLIENT (not another contractor)
  const getInProgressJobs = () => {
    return conversations.filter(conv => {
      const isUserInConv = conv.participant_1 === user?.id || conv.participant_2 === user?.id;
      const isConfirmed = conv.job_status === 'confirmed';
      
      // Check if the OTHER participant is a client
      let otherPartyRole = '';
      if (conv.participant_1 === user?.id) {
        otherPartyRole = conv.participant_2_role || '';
      } else {
        otherPartyRole = conv.participant_1_role || '';
      }
      
      // Only show if other party is a client
      const isOtherPartyClient = otherPartyRole === 'client' || otherPartyRole === '';
      
      return isUserInConv && isConfirmed && isOtherPartyClient;
    });
  };

  const getCompletedJobs = () => {
    return conversations.filter(conv => {
      const isUserInConv = conv.participant_1 === user?.id || conv.participant_2 === user?.id;
      const isArchived = conv.job_status === 'archived';
      
      // Check if the OTHER participant is a client
      let otherPartyRole = '';
      if (conv.participant_1 === user?.id) {
        otherPartyRole = conv.participant_2_role || '';
      } else {
        otherPartyRole = conv.participant_1_role || '';
      }
      
      // Only show if other party is a client
      const isOtherPartyClient = otherPartyRole === 'client' || otherPartyRole === '';
      
      return isUserInConv && isArchived && isOtherPartyClient;
    });
  };

  // Get the client name from conversation
  const getClientName = (conv: any) => {
    if (conv.participant_1 === user?.id) {
      return conv.participant_2_name || 'Client';
    }
    return conv.participant_1_name || 'Client';
  };

  const handleJobResponse = async (jobId: string, action: 'accept' | 'ignore') => {
    if (action === 'ignore') {
      const job = incomingJobs.find(j => j.id === jobId);
      setJobToRemove(job);
      setShowRemoveModal(true);
      return;
    }
    
    const job = incomingJobs.find(j => j.id === jobId);
    if (job && job.posted_by) {
      try {
        const conv = await api.post('/conversations', { participant_id: job.posted_by });
        router.push(`/chat/${conv.id}`);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to start conversation');
      }
    }
  };

  const confirmRemoveJob = async () => {
    if (!jobToRemove) return;
    
    try {
      await api.post(`/jobs/${jobToRemove.id}/dismiss`).catch(() => {});
      setIncomingJobs(incomingJobs.filter(j => j.id !== jobToRemove.id));
      setShowRemoveModal(false);
      setJobToRemove(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove job');
    }
  };

  const handleCompleteJob = (conv: any) => {
    setJobToComplete(conv);
    setShowCompleteModal(true);
  };

  const confirmCompleteJob = async () => {
    if (!jobToComplete) return;
    
    try {
      await api.post(`/conversations/${jobToComplete.id}/archive-job`);
      // Refresh data
      fetchData();
      setShowCompleteModal(false);
      setJobToComplete(null);
      Alert.alert('Job Completed!', 'This job has been marked as completed.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to complete job');
    }
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderIncomingJob = ({ item }: { item: any }) => {
    const createdAt = new Date(item.created_at);
    const timeAgo = getTimeAgo(createdAt);

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobTopRow}>
          <View style={styles.newIndicator}>
            <View style={styles.newDot} />
            <Text style={styles.newText}>New Job</Text>
          </View>
          <Text style={styles.jobTime}>{timeAgo}</Text>
        </View>
        
        <Text style={styles.jobTitle}>{item.title}</Text>
        
        <View style={styles.tradeRow}>
          <View style={styles.tradeChipOrange}>
            <Ionicons name={getTradeIcon(item.trade_required)} size={14} color={colors.primary} />
            <Text style={styles.tradeChipOrangeText}>{item.trade_required}</Text>
          </View>
          {item.urgency === 'urgent' && (
            <View style={styles.urgentChip}>
              <Ionicons name="flame" size={12} color="#EF4444" />
              <Text style={styles.urgentChipText}>Urgent</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>
        
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
        
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>
              {item.posted_by_name?.charAt(0) || 'C'}
            </Text>
          </View>
          <Text style={styles.clientName}>{item.posted_by_name}</Text>
        </View>
        
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

  const renderInProgressJob = ({ item }: { item: any }) => {
    const clientName = getClientName(item);
    const timeAgo = getTimeAgo(item.confirmed_at || item.updated_at || item.created_at);

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobTopRow}>
          <View style={[styles.newIndicator, { backgroundColor: colors.greenLight }]}>
            <View style={[styles.newDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.newText, { color: colors.green }]}>In Progress</Text>
          </View>
          <Text style={styles.jobTime}>{timeAgo}</Text>
        </View>
        
        <Text style={styles.jobTitle}>{item.job_title || 'Job with ' + clientName}</Text>
        
        <View style={styles.clientRow}>
          <View style={[styles.clientAvatar, { backgroundColor: colors.greenLight }]}>
            <Text style={[styles.clientAvatarText, { color: colors.green }]}>
              {clientName?.charAt(0) || 'C'}
            </Text>
          </View>
          <View>
            <Text style={styles.clientName}>{clientName}</Text>
            <Text style={styles.clientSubtext}>Both parties confirmed</Text>
          </View>
        </View>
        
        <View style={styles.jobActions}>
          <TouchableOpacity 
            style={styles.messageBtn}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.completeBtn}
            onPress={() => handleCompleteJob(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.paper} />
            <Text style={styles.completeBtnText}>Complete Job</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCompletedJob = ({ item }: { item: any }) => {
    const clientName = getClientName(item);
    const timeAgo = getTimeAgo(item.archived_at || item.updated_at);

    return (
      <View style={[styles.jobCard, { opacity: 0.8 }]}>
        <View style={styles.jobTopRow}>
          <View style={[styles.newIndicator, { backgroundColor: colors.blueLight }]}>
            <Ionicons name="checkmark-done" size={14} color={colors.blue} />
            <Text style={[styles.newText, { color: colors.blue, marginLeft: 4 }]}>Completed</Text>
          </View>
          <Text style={styles.jobTime}>{timeAgo}</Text>
        </View>
        
        <Text style={styles.jobTitle}>{item.job_title || 'Job with ' + clientName}</Text>
        
        <View style={styles.clientRow}>
          <View style={[styles.clientAvatar, { backgroundColor: colors.blueLight }]}>
            <Text style={[styles.clientAvatarText, { color: colors.blue }]}>
              {clientName?.charAt(0) || 'C'}
            </Text>
          </View>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.viewChatBtn}
          onPress={() => router.push(`/chat/${item.id}`)}
        >
          <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.viewChatBtnText}>View Chat History</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const inProgressJobs = getInProgressJobs();
  const completedJobs = getCompletedJobs();

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'incoming': return incomingJobs.length;
      case 'inProgress': return inProgressJobs.length;
      case 'completed': return completedJobs.length;
    }
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
      {/* Dashboard Header with Mode Toggle */}
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Dashboard</Text>
        <ModeToggle />
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.tabActiveOrange]}
          onPress={() => setActiveTab('incoming')}
        >
          <Ionicons 
            name="time-outline" 
            size={14} 
            color={activeTab === 'incoming' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.tabTextActiveOrange]}>
            Incoming
          </Text>
          {isOnline && incomingJobs.length > 0 && (
            <View style={[styles.tabBadge, styles.tabBadgeOrange]}>
              <Text style={styles.tabBadgeText}>
                {incomingJobs.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inProgress' && styles.tabActiveGreen]}
          onPress={() => setActiveTab('inProgress')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={14} 
            color={activeTab === 'inProgress' ? colors.green : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'inProgress' && styles.tabTextActiveGreen]}>
            In Progress
          </Text>
          {inProgressJobs.length > 0 && (
            <View style={[styles.tabBadge, styles.tabBadgeGreen]}>
              <Text style={styles.tabBadgeText}>
                {inProgressJobs.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.tabActiveBlue]}
          onPress={() => setActiveTab('completed')}
        >
          <Ionicons 
            name="checkmark-done-outline" 
            size={14} 
            color={activeTab === 'completed' ? colors.blue : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActiveBlue]}>
            Completed
          </Text>
          {completedJobs.length > 0 && (
            <View style={[styles.tabBadge, styles.tabBadgeBlue]}>
              <Text style={styles.tabBadgeText}>
                {completedJobs.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {activeTab === 'incoming' && (
        <FlatList
          data={isOnline ? incomingJobs : []}
          renderItem={renderIncomingJob}
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

              {/* Stats Cards - Only show when online */}
              {isOnline && (
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="star" size={24} color="#FFB800" />
                    <Text style={styles.statNumber}>{stats?.rating || '0.0'}</Text>
                    <Text style={styles.statLabel}>Avg Rating ({stats?.review_count || 0} reviews)</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="eye" size={24} color={colors.primary} />
                    <Text style={styles.statNumber}>{stats?.profile_views || 0}</Text>
                    <Text style={styles.statLabel}>Profile views</Text>
                  </View>
                </View>
              )}
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
      )}

      {activeTab === 'inProgress' && (
        <FlatList
          data={inProgressJobs}
          renderItem={renderInProgressJob}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No jobs in progress</Text>
              <Text style={styles.emptySubtitle}>
                Jobs will appear here once both you and the client confirm in Messages
              </Text>
            </View>
          )}
        />
      )}

      {activeTab === 'completed' && (
        <FlatList
          data={completedJobs}
          renderItem={renderCompletedJob}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No completed jobs</Text>
              <Text style={styles.emptySubtitle}>
                Your completed jobs will be shown here
              </Text>
            </View>
          )}
        />
      )}
      
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

      {/* Complete Job Confirmation Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconContainer, { backgroundColor: colors.greenLight }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.green} />
            </View>
            <Text style={styles.modalTitle}>Complete This Job?</Text>
            <Text style={styles.modalMessage}>
              Mark this job as completed? This will move it to your Completed section.
            </Text>
            {jobToComplete && (
              <View style={styles.modalJobPreview}>
                <Text style={styles.modalJobTitle}>{jobToComplete.job_title || 'Job with ' + getClientName(jobToComplete)}</Text>
                <Text style={styles.modalJobTrade}>Client: {getClientName(jobToComplete)}</Text>
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCompleteModal(false);
                  setJobToComplete(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, { backgroundColor: colors.green }]}
                onPress={confirmCompleteJob}
              >
                <Text style={styles.modalConfirmText}>Complete</Text>
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
  dashboardHeader: {
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
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  tabActiveOrange: {
    backgroundColor: colors.primaryLight,
  },
  tabActiveGreen: {
    backgroundColor: colors.greenLight,
  },
  tabActiveBlue: {
    backgroundColor: colors.blueLight,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActiveOrange: {
    color: colors.primary,
  },
  tabTextActiveGreen: {
    color: colors.green,
  },
  tabTextActiveBlue: {
    color: colors.blue,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeOrange: {
    backgroundColor: colors.primary,
  },
  tabBadgeGreen: {
    backgroundColor: colors.green,
  },
  tabBadgeBlue: {
    backgroundColor: colors.blue,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.paper,
  },
  tabBadgeTextActive: {
    color: colors.paper,
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
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
  jobTime: {
    fontSize: 12,
    color: colors.textSecondary,
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
  tradeChipOrange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  tradeChipOrangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
  clientSubtext: {
    fontSize: 12,
    color: colors.green,
    marginTop: 2,
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
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.green,
    gap: 6,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.paper,
  },
  viewChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  viewChatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
