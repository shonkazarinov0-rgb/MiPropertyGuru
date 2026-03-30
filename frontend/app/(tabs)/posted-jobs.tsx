import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, 
  RefreshControl, Alert, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  red: '#EF4444',
  redLight: '#FEE2E2',
  border: '#E5E7EB',
};

type TabType = 'pending' | 'inProgress' | 'completed';

// Trade icons mapping
const tradeIcons: Record<string, string> = {
  'Electrician': 'flash',
  'Plumber': 'water',
  'Carpenter': 'construct',
  'Painter': 'color-palette',
  'HVAC': 'thermometer',
  'Roofer': 'home',
  'Landscaper': 'leaf',
  'General Contractor': 'build',
  'Handyman': 'hammer',
  'Cleaner': 'sparkles',
  'Fence': 'git-network',
  'Tile/Flooring': 'grid',
};

export default function PostedJobsScreen() {
  const router = useRouter();
  const { user, isClientMode, switchMode } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Auto-refresh when screen comes into focus (e.g., after editing a job)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [jobsRes, convsRes] = await Promise.all([
        api.get('/jobs/my-posted'),
        api.get('/conversations'),
      ]);
      setJobs(jobsRes.jobs || []);
      setConversations(convsRes.conversations || []);
    } catch (e) { 
      console.error('Error fetching data:', e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  const onRefresh = useCallback(() => { 
    setRefreshing(true); 
    fetchData(); 
  }, []);

  // Get the conversation associated with a job (if any)
  const getJobConversation = (job: any) => {
    // First try to find by job_id in conversation
    const byJobId = conversations.find(conv => conv.job_id === job.id);
    if (byJobId) return byJobId;
    
    // Second: try by job_title matching
    const byJobTitle = conversations.find(conv => 
      conv.job_title && conv.job_title.toLowerCase() === job.title?.toLowerCase()
    );
    if (byJobTitle) return byJobTitle;
    
    // Third: find by matching client posting and contractor responding
    const byResponses = conversations.find(conv => {
      // The client (job poster) should be one participant
      const clientIsP1 = conv.participant_1 === job.posted_by;
      const clientIsP2 = conv.participant_2 === job.posted_by;
      
      if (!clientIsP1 && !clientIsP2) return false;
      
      // Check if the contractor (other participant) responded to this job
      const contractorId = clientIsP1 ? conv.participant_2 : conv.participant_1;
      const respondedContractorIds = job.responses?.map((r: any) => r.contractor_id) || [];
      
      return respondedContractorIds.includes(contractorId);
    });
    
    return byResponses;
  };

  // Determine job status based on conversation state
  const getJobStatus = (job: any) => {
    const conv = getJobConversation(job);
    if (!conv) {
      // No conversation yet - job is pending
      return 'pending';
    }
    if (conv.job_status === 'archived') {
      return 'completed';
    }
    if (conv.job_status === 'confirmed') {
      return 'inProgress';
    }
    // Has conversation but not confirmed - still pending (negotiating)
    return 'pending';
  };

  // Filter jobs by status
  const pendingJobs = jobs.filter(j => getJobStatus(j) === 'pending');
  const inProgressJobs = jobs.filter(j => getJobStatus(j) === 'inProgress');
  const completedJobs = jobs.filter(j => getJobStatus(j) === 'completed');

  const getJobsForTab = () => {
    switch (activeTab) {
      case 'inProgress': return inProgressJobs;
      case 'completed': return completedJobs;
      default: return pendingJobs;
    }
  };

  const getTimestamp = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getContractorName = (job: any) => {
    const conv = getJobConversation(job);
    if (!conv) return null;
    // Get the other participant (not the client)
    if (conv.participant_1 === user?.id) {
      return conv.participant_2_name;
    }
    return conv.participant_1_name;
  };

  // Handle moving job back to Pending (reopen for contractors)
  const handleMoveToPending = async (job: any) => {
    const conv = getJobConversation(job);
    if (!conv) return;

    Alert.alert(
      'Reopen Job',
      'This will cancel the current arrangement and reopen the job for all contractors. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(job.id);
            try {
              await api.post(`/conversations/${conv.id}/reset-to-pending`);
              await fetchData();
              Alert.alert('Job Reopened', 'Contractors can now see and respond to this job again.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not reopen job');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Handle moving job back to In Progress
  const handleMoveToInProgress = async (job: any) => {
    const conv = getJobConversation(job);
    
    if (!conv) {
      console.log('[PostedJobs] No conversation found for job:', job.id, job.title);
      if (Platform.OS === 'web') {
        window.alert('No conversation found for this job');
      } else {
        Alert.alert('Error', 'No conversation found for this job');
      }
      return;
    }
    
    console.log('[PostedJobs] Reactivating job with conversation:', conv.id);
    
    const doReactivate = async () => {
      setActionLoading(job.id);
      try {
        await api.post(`/conversations/${conv.id}/reset-to-confirmed`);
        await fetchData();
        if (Platform.OS === 'web') {
          window.alert('Job moved back to In Progress!');
        } else {
          Alert.alert('Success', 'Job moved back to In Progress.');
        }
      } catch (e: any) {
        console.error('[PostedJobs] Reactivate error:', e);
        if (Platform.OS === 'web') {
          window.alert('Error: ' + (e.message || 'Could not reactivate job'));
        } else {
          Alert.alert('Error', e.message || 'Could not reactivate job');
        }
      } finally {
        setActionLoading(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Move this job back to In Progress?')) {
        doReactivate();
      }
    } else {
      Alert.alert(
        'Reactivate Job',
        'Move this job back to In Progress?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reactivate', onPress: doReactivate }
        ]
      );
    }
  };

  // Handle completing a job
  const handleComplete = async (job: any) => {
    const conv = getJobConversation(job);
    if (!conv) return;

    Alert.alert(
      'Complete Job',
      'Mark this job as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setActionLoading(job.id);
            try {
              await api.post(`/conversations/${conv.id}/archive-job`);
              await fetchData();
              Alert.alert('Job Completed', 'The job has been marked as completed.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not complete job');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  // Handle deleting a job
  const handleDelete = async (job: any) => {
    const doDelete = async () => {
      setActionLoading(job.id);
      try {
        await api.delete(`/jobs/${job.id}`);
        setJobs(jobs.filter(j => j.id !== job.id));
        if (Platform.OS === 'web') {
          window.alert('Job has been deleted.');
        } else {
          Alert.alert('Deleted', 'Job has been removed.');
        }
      } catch (e: any) {
        const errorMsg = e.message || 'Could not delete job';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      } finally {
        setActionLoading(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to delete this job? This cannot be undone.');
      if (confirmed) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Job',
        'Are you sure you want to delete this job? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  // Open chat with contractor
  const handleOpenChat = (job: any) => {
    const conv = getJobConversation(job);
    if (conv) {
      router.push(`/chat/${conv.id}`);
    }
  };

  const renderPendingJob = ({ item }: { item: any }) => {
    const conv = getJobConversation(item);
    const hasResponses = item.responses && item.responses.length > 0;
    const iconName = tradeIcons[item.trade_required] || 'build';

    return (
      <View style={s.jobCard}>
        <TouchableOpacity 
          onPress={() => router.push(`/job/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={s.jobHeader}>
            <View style={s.tradeIconContainer}>
              <Ionicons name={iconName as any} size={24} color={colors.primary} />
            </View>
            <View style={s.jobInfo}>
              <Text style={s.jobTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.jobTrade}>{item.trade_required}</Text>
            </View>
            <View style={s.pendingBadge}>
              <Ionicons name="time-outline" size={12} color={colors.primary} />
              <Text style={s.pendingBadgeText}>Pending</Text>
            </View>
          </View>

          <Text style={s.jobDescription} numberOfLines={2}>{item.description}</Text>

          <View style={s.jobMeta}>
            {item.location && (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={s.metaText}>{item.location}</Text>
              </View>
            )}
            {item.budget && (
              <View style={s.metaItem}>
                <Ionicons name="cash-outline" size={14} color={colors.green} />
                <Text style={[s.metaText, { color: colors.green, fontWeight: '600' }]}>
                  {item.budget.toString().startsWith('$') ? item.budget : `$${item.budget}`}
                </Text>
                {(item.budget_negotiable === true || item.budget_negotiable === false) && (
                  <View style={[s.negotiableBadge, item.budget_negotiable === false && s.fixedBadge]}>
                    <Text style={[s.negotiableBadgeText, item.budget_negotiable === false && s.fixedBadgeText]}>
                      {item.budget_negotiable ? 'Negotiable' : 'Fixed'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={s.jobFooter}>
            <Text style={s.timeText}>{getTimestamp(item.created_at)}</Text>
            {hasResponses && (
              <View style={s.responseBadge}>
                <Ionicons name="chatbubbles" size={12} color={colors.green} />
                <Text style={s.responseText}>{item.responses.length} response(s)</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={s.actionRow}>
          <TouchableOpacity 
            style={s.editBtn}
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={s.deleteBtn}
            onPress={() => handleDelete(item)}
            disabled={actionLoading === item.id}
            activeOpacity={0.7}
          >
            {actionLoading === item.id ? (
              <ActivityIndicator size="small" color={colors.red} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={colors.red} />
                <Text style={s.deleteBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInProgressJob = ({ item }: { item: any }) => {
    const contractorName = getContractorName(item);
    const iconName = tradeIcons[item.trade_required] || 'build';

    return (
      <TouchableOpacity 
        style={s.jobCard}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        <View style={s.jobHeader}>
          <View style={[s.tradeIconContainer, { backgroundColor: colors.greenLight }]}>
            <Ionicons name={iconName as any} size={24} color={colors.green} />
          </View>
          <View style={s.jobInfo}>
            <Text style={s.jobTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.contractorName}>with {contractorName || 'Contractor'}</Text>
          </View>
          <View style={s.inProgressBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.green} />
            <Text style={s.inProgressBadgeText}>In Progress</Text>
          </View>
        </View>

        <Text style={s.jobDescription} numberOfLines={2}>{item.description}</Text>

        <View style={s.actionRow}>
          <TouchableOpacity 
            style={s.messageBtn}
            onPress={() => handleOpenChat(item)}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            <Text style={s.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={s.completeBtn}
            onPress={() => handleComplete(item)}
            disabled={actionLoading === item.id}
          >
            {actionLoading === item.id ? (
              <ActivityIndicator size="small" color={colors.paper} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color={colors.paper} />
                <Text style={s.completeBtnText}>Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={s.reopenLink}
          onPress={() => handleMoveToPending(item)}
          disabled={actionLoading === item.id}
        >
          <Ionicons name="arrow-undo-outline" size={14} color={colors.textSecondary} />
          <Text style={s.reopenLinkText}>Cancel & Reopen for other contractors</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCompletedJob = ({ item }: { item: any }) => {
    const contractorName = getContractorName(item);
    const iconName = tradeIcons[item.trade_required] || 'build';

    return (
      <View style={[s.jobCard, { opacity: 0.85 }]}>
        <View style={s.jobHeader}>
          <View style={[s.tradeIconContainer, { backgroundColor: colors.blueLight }]}>
            <Ionicons name={iconName as any} size={24} color={colors.blue} />
          </View>
          <View style={s.jobInfo}>
            <Text style={s.jobTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.contractorName}>completed by {contractorName || 'Contractor'}</Text>
          </View>
          <View style={s.completedBadge}>
            <Ionicons name="checkmark-done" size={12} color={colors.blue} />
            <Text style={s.completedBadgeText}>Completed</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <TouchableOpacity 
            style={s.viewChatBtn}
            onPress={() => handleOpenChat(item)}
          >
            <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
            <Text style={s.viewChatBtnText}>View Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={s.reactivateBtn}
            onPress={() => handleMoveToInProgress(item)}
            disabled={actionLoading === item.id}
          >
            {actionLoading === item.id ? (
              <ActivityIndicator size="small" color={colors.green} />
            ) : (
              <>
                <Ionicons name="arrow-undo" size={16} color={colors.green} />
                <Text style={s.reactivateBtnText}>Reactivate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>My Jobs</Text>
        <ModeToggle />
      </View>

      {/* Tab Navigation */}
      <View style={s.tabContainer}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'pending' && s.tabActiveOrange]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons 
            name="time-outline" 
            size={14} 
            color={activeTab === 'pending' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'pending' && s.tabTextActiveOrange]}>
            Pending
          </Text>
          {pendingJobs.length > 0 && (
            <View style={[s.tabBadge, s.tabBadgeOrange]}>
              <Text style={s.tabBadgeText}>{pendingJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'inProgress' && s.tabActiveGreen]}
          onPress={() => setActiveTab('inProgress')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={14} 
            color={activeTab === 'inProgress' ? colors.green : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'inProgress' && s.tabTextActiveGreen]}>
            In Progress
          </Text>
          {inProgressJobs.length > 0 && (
            <View style={[s.tabBadge, s.tabBadgeGreen]}>
              <Text style={s.tabBadgeText}>{inProgressJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tab, activeTab === 'completed' && s.tabActiveBlue]}
          onPress={() => setActiveTab('completed')}
        >
          <Ionicons 
            name="checkmark-done-outline" 
            size={14} 
            color={activeTab === 'completed' ? colors.blue : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'completed' && s.tabTextActiveBlue]}>
            Completed
          </Text>
          {completedJobs.length > 0 && (
            <View style={[s.tabBadge, s.tabBadgeBlue]}>
              <Text style={s.tabBadgeText}>{completedJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Job Lists */}
      {activeTab === 'pending' && (
        <FlatList
          data={pendingJobs}
          renderItem={renderPendingJob}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={() => (
            <View style={s.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={colors.textSecondary} />
              <Text style={s.emptyTitle}>No pending jobs</Text>
              <Text style={s.emptySubtitle}>
                Post a job to get started and find contractors
              </Text>
            </View>
          )}
        />
      )}

      {activeTab === 'inProgress' && (
        <FlatList
          data={inProgressJobs}
          renderItem={renderInProgressJob}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />
          }
          ListEmptyComponent={() => (
            <View style={s.emptyState}>
              <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
              <Text style={s.emptyTitle}>No jobs in progress</Text>
              <Text style={s.emptySubtitle}>
                Jobs will appear here once you and a contractor both confirm in Messages
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
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />
          }
          ListEmptyComponent={() => (
            <View style={s.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
              <Text style={s.emptyTitle}>No completed jobs</Text>
              <Text style={s.emptySubtitle}>
                Completed jobs will appear here
              </Text>
            </View>
          )}
        />
      )}

      {/* Floating Post Button */}
      <TouchableOpacity 
        style={s.floatingPostBtn}
        onPress={() => router.push('/post-job')}
      >
        <Ionicons name="add" size={28} color={colors.paper} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: { 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: colors.paper, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 64,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: colors.text,
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
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 4,
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
    minWidth: 18,
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Job card
  jobCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tradeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  jobTrade: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  contractorName: {
    fontSize: 13,
    color: colors.green,
    fontWeight: '500',
  },
  jobDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  responseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  responseText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.green,
  },
  // Badges
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  inProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inProgressBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.blue,
  },
  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.redLight,
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.red,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  viewChatBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reactivateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    gap: 6,
  },
  reactivateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green,
  },
  reopenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 4,
  },
  reopenLinkText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  // Floating button
  floatingPostBtn: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  // Negotiable badge styles
  negotiableBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  negotiableBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  fixedBadge: {
    backgroundColor: '#DBEAFE',
  },
  fixedBadgeText: {
    color: '#3B82F6',
  },
});
