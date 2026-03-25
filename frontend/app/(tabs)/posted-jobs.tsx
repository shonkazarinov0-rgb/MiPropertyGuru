import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, 
  RefreshControl, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  border: '#E5E7EB',
};

type TabType = 'pending' | 'confirmed' | 'completed';

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
};

export default function PostedJobsScreen() {
  const router = useRouter();
  const { user, isClientMode } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => { 
    fetchJobs(); 
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs/my-posted');
      setJobs(res.jobs || []);
    } catch (e) { 
      console.error('Error fetching jobs:', e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  const onRefresh = useCallback(() => { 
    setRefreshing(true); 
    fetchJobs(); 
  }, []);

  // Filter jobs by status
  const pendingJobs = jobs.filter(j => j.status !== 'confirmed' && j.status !== 'completed');
  const confirmedJobs = jobs.filter(j => j.status === 'confirmed');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const getJobsForTab = () => {
    switch (activeTab) {
      case 'confirmed': return confirmedJobs;
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

  const getStatusBadge = (job: any) => {
    if (job.status === 'completed') {
      return (
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-done" size={12} color={colors.blue} />
          <Text style={s.completedBadgeText}>Completed</Text>
        </View>
      );
    }
    if (job.status === 'confirmed') {
      return (
        <View style={s.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.green} />
          <Text style={s.confirmedBadgeText}>In Progress</Text>
        </View>
      );
    }
    const responseCount = job.responses?.length || 0;
    if (responseCount > 0) {
      return (
        <View style={s.responsesBadge}>
          <Ionicons name="chatbubbles" size={12} color={colors.primary} />
          <Text style={s.responsesBadgeText}>{responseCount} response{responseCount > 1 ? 's' : ''}</Text>
        </View>
      );
    }
    return (
      <View style={s.waitingBadge}>
        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
        <Text style={s.waitingBadgeText}>Waiting for responses</Text>
      </View>
    );
  };

  const renderJob = ({ item }: { item: any }) => {
    const iconName = tradeIcons[item.category] || 'build';
    const isCompleted = item.status === 'completed';
    
    return (
      <TouchableOpacity 
        style={[s.jobCard, isCompleted && s.completedCard]}
        onPress={() => router.push(`/job/${item.id}`)}
      >
        <View style={[s.jobIconBg, isCompleted && s.completedIconBg]}>
          <Ionicons name={iconName as any} size={24} color={isCompleted ? colors.blue : colors.primary} />
        </View>
        <View style={s.jobInfo}>
          <Text style={s.jobCategory}>{item.category}</Text>
          <Text style={s.jobDescription} numberOfLines={2}>{item.description}</Text>
          <View style={s.jobMeta}>
            {getStatusBadge(item)}
            <Text style={s.jobTime}>{getTimestamp(item.created_at)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  const getEmptyContent = () => {
    switch (activeTab) {
      case 'confirmed':
        return {
          icon: "briefcase-outline" as const,
          title: 'No jobs in progress',
          text: 'Jobs will appear here once you confirm with a contractor'
        };
      case 'completed':
        return {
          icon: "checkmark-done-outline" as const,
          title: 'No completed jobs',
          text: 'Completed jobs will appear here'
        };
      default:
        return {
          icon: "document-text-outline" as const,
          title: 'No posted jobs',
          text: 'Post a job to get started'
        };
    }
  };

  const emptyContent = getEmptyContent();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>My Jobs</Text>
        <View style={s.headerActions}>
          <ModeToggle />
          <TouchableOpacity style={s.postBtn} onPress={() => router.push('/post-job')}>
            <Ionicons name="add" size={20} color={colors.paper} />
            <Text style={s.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3 Tabs: Pending, Confirmed, Completed */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={s.tabScrollContainer}
        contentContainerStyle={s.tabContainer}
      >
        {/* Pending Tab - Orange */}
        <TouchableOpacity 
          style={[s.tab, activeTab === 'pending' && s.pendingTabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons 
            name="time-outline" 
            size={14} 
            color={activeTab === 'pending' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'pending' && s.pendingTabText]}>
            Pending
          </Text>
          {pendingJobs.length > 0 && (
            <View style={[s.tabBadge, s.orangeBadge]}>
              <Text style={s.tabBadgeText}>{pendingJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Confirmed Tab - Green */}
        <TouchableOpacity 
          style={[s.tab, activeTab === 'confirmed' && s.confirmedTabActive]}
          onPress={() => setActiveTab('confirmed')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={14} 
            color={activeTab === 'confirmed' ? colors.green : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'confirmed' && s.confirmedTabText]}>
            In Progress
          </Text>
          {confirmedJobs.length > 0 && (
            <View style={[s.tabBadge, s.greenBadge]}>
              <Text style={s.tabBadgeText}>{confirmedJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Completed Tab - Blue */}
        <TouchableOpacity 
          style={[s.tab, activeTab === 'completed' && s.completedTabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Ionicons 
            name="checkmark-done" 
            size={14} 
            color={activeTab === 'completed' ? colors.blue : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'completed' && s.completedTabText]}>
            Completed
          </Text>
          {completedJobs.length > 0 && (
            <View style={[s.tabBadge, s.blueBadge]}>
              <Text style={s.tabBadgeText}>{completedJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={getJobsForTab()}
          renderItem={renderJob}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name={emptyContent.icon} size={64} color={colors.textSecondary} />
              <Text style={s.emptyTitle}>{emptyContent.title}</Text>
              <Text style={s.emptyText}>{emptyContent.text}</Text>
              {activeTab === 'pending' && (
                <TouchableOpacity style={s.emptyPostBtn} onPress={() => router.push('/post-job')}>
                  <Ionicons name="add-circle" size={20} color={colors.paper} />
                  <Text style={s.emptyPostBtnText}>Post a Job</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background,
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
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.paper,
  },
  tabScrollContainer: {
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 56,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    gap: 5,
  },
  pendingTabActive: {
    backgroundColor: colors.primaryLight,
  },
  pendingTabText: {
    color: colors.primary,
  },
  confirmedTabActive: {
    backgroundColor: colors.greenLight,
  },
  confirmedTabText: {
    color: colors.green,
  },
  completedTabActive: {
    backgroundColor: colors.blueLight,
  },
  completedTabText: {
    color: colors.blue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.paper,
  },
  orangeBadge: {
    backgroundColor: colors.primary,
  },
  greenBadge: {
    backgroundColor: colors.green,
  },
  blueBadge: {
    backgroundColor: colors.blue,
  },
  listContent: { 
    padding: 16,
    paddingBottom: 100,
  },
  jobCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    backgroundColor: colors.paper, 
    borderRadius: 14, 
    padding: 14, 
    marginBottom: 10,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 2, 
    elevation: 1,
  },
  completedCard: {
    opacity: 0.85,
  },
  jobIconBg: {
    width: 50, 
    height: 50, 
    borderRadius: 12, 
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  completedIconBg: {
    backgroundColor: colors.blueLight,
  },
  jobInfo: { 
    flex: 1,
  },
  jobCategory: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text,
  },
  jobDescription: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    marginTop: 2,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  jobTime: { 
    fontSize: 12, 
    color: colors.textSecondary,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.blue,
  },
  responsesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  responsesBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  waitingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 80,
  },
  emptyTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: colors.text, 
    marginTop: 16,
  },
  emptyText: { 
    fontSize: 15, 
    color: colors.textSecondary, 
    marginTop: 8,
    textAlign: 'center',
  },
  emptyPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 24,
  },
  emptyPostBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
});
