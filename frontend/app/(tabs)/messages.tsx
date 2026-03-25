import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
  ScrollView,
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
  gray: '#6B7280',
  grayLight: '#F3F4F6',
  border: '#E5E7EB',
};

type TabType = 'pending' | 'confirmed' | 'archived';

export default function MessagesScreen() {
  const router = useRouter();
  const { user, isClientMode, isContractorMode } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  useEffect(() => { fetchConversations(); }, []);

  // Re-fetch when mode changes
  useEffect(() => { 
    if (user?.role === 'contractor') {
      fetchConversations(); 
    }
  }, [isClientMode, isContractorMode]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.conversations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchConversations(); }, []);

  const getOtherName = (conv: any) => {
    return conv.participant_1 === user?.id ? conv.participant_2_name : conv.participant_1_name;
  };

  const getTimestamp = (conv: any) => {
    if (!conv.last_message_at) return '';
    const d = new Date(conv.last_message_at);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return `${Math.floor(diffHr / 24)}d`;
  };

  // Filter conversations based on current mode
  const filterByMode = (convList: any[]) => {
    if (!user) return convList;
    if (user.role === 'client') return convList;
    
    return convList.filter(conv => {
      const isParticipant1 = conv.participant_1 === user.id;
      const otherRole = isParticipant1 ? conv.participant_2_role : conv.participant_1_role;
      
      if (isClientMode && otherRole === 'contractor') return true;
      if (isContractorMode && otherRole === 'client') return true;
      return false;
    });
  };

  // Split conversations into 3 categories
  const modeFilteredConversations = filterByMode(conversations);
  const pendingConversations = modeFilteredConversations.filter(c => 
    c.job_status !== 'confirmed' && c.job_status !== 'archived'
  );
  const confirmedConversations = modeFilteredConversations.filter(c => c.job_status === 'confirmed');
  const archivedConversations = modeFilteredConversations.filter(c => c.job_status === 'archived');

  const getConversationsForTab = () => {
    switch (activeTab) {
      case 'confirmed': return confirmedConversations;
      case 'archived': return archivedConversations;
      default: return pendingConversations;
    }
  };

  const getAvatarStyle = (status: string) => {
    if (status === 'confirmed') return s.confirmedAvatar;
    if (status === 'archived') return s.archivedAvatar;
    return {};
  };

  const getStatusBadge = (conv: any) => {
    const isConfirmed = conv.job_status === 'confirmed';
    const isArchived = conv.job_status === 'archived';
    const isPendingConfirmation = conv.confirmed_by?.length > 0 && !isConfirmed && !isArchived;

    if (isArchived) {
      return (
        <View style={s.archivedBadge}>
          <Ionicons name="archive" size={12} color={colors.blue} />
          <Text style={s.archivedBadgeText}>Completed</Text>
        </View>
      );
    }
    if (isConfirmed) {
      return (
        <View style={s.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={12} color={colors.green} />
          <Text style={s.confirmedBadgeText}>In Progress</Text>
        </View>
      );
    }
    if (isPendingConfirmation) {
      return (
        <View style={s.pendingBadge}>
          <Ionicons name="hourglass-outline" size={12} color={colors.primary} />
          <Text style={s.pendingBadgeText}>Awaiting Confirmation</Text>
        </View>
      );
    }
    return null;
  };

  const renderConversation = ({ item }: { item: any }) => {
    const otherName = getOtherName(item);
    const initials = otherName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const isArchived = item.job_status === 'archived';
    
    return (
      <TouchableOpacity 
        testID={`conversation-${item.id}`} 
        style={[s.convCard, isArchived && s.archivedCard]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={[s.convAvatar, getAvatarStyle(item.job_status)]}>
          <Text style={s.convAvatarText}>{initials}</Text>
        </View>
        <View style={s.convInfo}>
          <View style={s.convTopRow}>
            <Text style={[s.convName, isArchived && s.archivedText]} numberOfLines={1}>{otherName}</Text>
            <Text style={s.convTime}>{getTimestamp(item)}</Text>
          </View>
          <Text style={s.convMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
          </Text>
          <View style={s.statusRow}>
            {getStatusBadge(item)}
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
          title: 'No active jobs',
          text: 'Jobs will appear here once both parties confirm'
        };
      case 'archived':
        return {
          icon: "archive-outline" as const,
          title: 'No completed jobs',
          text: 'Completed jobs will be archived here'
        };
      default:
        return {
          icon: "chatbubbles-outline" as const,
          title: 'No pending conversations',
          text: 'Start by finding a contractor'
        };
    }
  };

  const emptyContent = getEmptyContent();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <ModeToggle />
      </View>

      {/* 3 Tabs: Pending, Confirmed, Archived */}
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
          {pendingConversations.length > 0 && (
            <View style={[s.tabBadge, s.orangeBadge]}>
              <Text style={s.tabBadgeText}>{pendingConversations.length}</Text>
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
          {confirmedConversations.length > 0 && (
            <View style={[s.tabBadge, s.greenBadge]}>
              <Text style={s.tabBadgeText}>{confirmedConversations.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Archived Tab - Blue/Gray */}
        <TouchableOpacity 
          style={[s.tab, activeTab === 'archived' && s.archivedTabActive]}
          onPress={() => setActiveTab('archived')}
        >
          <Ionicons 
            name="archive" 
            size={14} 
            color={activeTab === 'archived' ? colors.blue : colors.textSecondary} 
          />
          <Text style={[s.tabText, activeTab === 'archived' && s.archivedTabText]}>
            Completed
          </Text>
          {archivedConversations.length > 0 && (
            <View style={[s.tabBadge, s.blueBadge]}>
              <Text style={s.tabBadgeText}>{archivedConversations.length}</Text>
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
          data={getConversationsForTab()}
          renderItem={renderConversation}
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
    minHeight: 64,
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
    backgroundColor: colors.grayLight,
    gap: 5,
  },
  // Pending tab styles (Orange)
  pendingTabActive: {
    backgroundColor: colors.primaryLight,
  },
  pendingTabText: {
    color: colors.primary,
  },
  // Confirmed tab styles (Green)
  confirmedTabActive: {
    backgroundColor: colors.greenLight,
  },
  confirmedTabText: {
    color: colors.green,
  },
  // Archived tab styles (Blue)
  archivedTabActive: {
    backgroundColor: colors.blueLight,
  },
  archivedTabText: {
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
  greenBadge: {
    backgroundColor: colors.green,
  },
  blueBadge: {
    backgroundColor: colors.blue,
  },
  orangeBadge: {
    backgroundColor: colors.primary,
  },
  listContent: { 
    padding: 16,
    paddingBottom: 100,
  },
  convCard: {
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
  archivedCard: {
    opacity: 0.85,
  },
  convAvatar: {
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: colors.primary,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  confirmedAvatar: {
    backgroundColor: colors.green,
  },
  archivedAvatar: {
    backgroundColor: colors.blue,
  },
  convAvatarText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.paper,
  },
  convInfo: { 
    flex: 1,
  },
  convTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  convName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text, 
    flex: 1, 
    marginRight: 8,
  },
  archivedText: {
    color: colors.textSecondary,
  },
  convTime: { 
    fontSize: 12, 
    color: colors.textSecondary,
  },
  convMessage: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
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
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  archivedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.blue,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
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
    paddingTop: 100,
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
});
