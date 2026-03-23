import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth-context';

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
  yellow: '#F59E0B',
  border: '#E5E7EB',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  open: { color: colors.primary, bg: colors.primaryLight, label: 'Waiting for contractors', icon: 'time' },
  in_progress: { color: colors.green, bg: colors.greenLight, label: 'In progress', icon: 'construct' },
  completed: { color: colors.textSecondary, bg: '#F3F4F6', label: 'Completed', icon: 'checkmark-circle' },
  cancelled: { color: colors.red, bg: '#FEE2E2', label: 'Cancelled', icon: 'close-circle' },
};

export default function MyJobsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/jobs');
      setJobs(res.jobs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchJobs();
  }, []);

  const getResponseCount = (job: any) => {
    return (job.contractor_responses || []).filter((r: any) => r.action === 'accept').length;
  };

  const renderJobCard = ({ item }: { item: any }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.open;
    const responseCount = getResponseCount(item);
    const createdAt = new Date(item.created_at);
    const timeAgo = getTimeAgo(createdAt);

    return (
      <TouchableOpacity 
        style={styles.jobCard}
        onPress={() => router.push(`/job/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>

        <Text style={styles.jobCategory}>{item.category}</Text>
        <Text style={styles.jobDescription} numberOfLines={2}>{item.description}</Text>

        {item.status === 'open' && responseCount > 0 && (
          <View style={styles.responseBanner}>
            <Ionicons name="people" size={18} color={colors.green} />
            <Text style={styles.responseText}>
              {responseCount} contractor{responseCount > 1 ? 's' : ''} responded!
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </View>
        )}

        {item.status === 'open' && responseCount === 0 && (
          <View style={styles.waitingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.waitingText}>Waiting for contractors...</Text>
          </View>
        )}

        {item.status === 'in_progress' && item.selected_contractor_id && (
          <View style={styles.contractorBanner}>
            <Ionicons name="person" size={18} color={colors.green} />
            <Text style={styles.contractorText}>Contractor assigned</Text>
            <TouchableOpacity 
              style={styles.chatBtn}
              onPress={() => router.push(`/chat/${item.selected_contractor_id}`)}
            >
              <Ionicons name="chatbubble" size={16} color={colors.paper} />
              <Text style={styles.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location_address || 'Location set'}
            </Text>
          </View>
          {item.urgency === 'urgent' && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>🔥 Urgent</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Jobs</Text>
        <TouchableOpacity onPress={() => router.push('/post-job')}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {jobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No jobs posted yet</Text>
          <Text style={styles.emptySubtitle}>Post a job to find contractors near you</Text>
          <TouchableOpacity style={styles.postBtn} onPress={() => router.push('/post-job')}>
            <Ionicons name="add" size={20} color={colors.paper} />
            <Text style={styles.postBtnText}>Post a Job</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
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
    fontWeight: '600',
    color: colors.text,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeAgo: {
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
  responseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  responseText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.green,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  waitingText: {
    fontSize: 14,
    color: colors.primary,
  },
  contractorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  contractorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.green,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.paper,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
  },
});
