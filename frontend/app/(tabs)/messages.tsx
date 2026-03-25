import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  border: '#E5E7EB',
};

export default function MessagesScreen() {
  const router = useRouter();
  const { user, isClientMode, isContractorMode } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed'>('pending');

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
  // The person who STARTS a conversation (participant_1) is always the CLIENT
  // The person who RECEIVES the conversation (participant_2) is always the CONTRACTOR
  const filterByMode = (convList: any[]) => {
    if (!user) return convList;
    
    // If user is a pure client (not a contractor), show all their conversations
    if (user.role === 'client') return convList;
    
    // For contractors who can switch modes
    return convList.filter(conv => {
      const iAmTheInitiator = conv.participant_1 === user.id;
      
      // If I started the conversation, I was acting as CLIENT
      // If someone else started the conversation with me, I was acting as CONTRACTOR
      if (isClientMode) {
        // Show conversations where I was the client (I initiated)
        return iAmTheInitiator;
      }
      
      if (isContractorMode) {
        // Show conversations where I was the contractor (they initiated/contacted me)
        return !iAmTheInitiator;
      }
      
      return false;
    });
  };

  // Split conversations into confirmed and pending, then filter by mode
  const modeFilteredConversations = filterByMode(conversations);
  const confirmedConversations = modeFilteredConversations.filter(c => c.job_status === 'confirmed');
  const pendingConversations = modeFilteredConversations.filter(c => c.job_status !== 'confirmed');

  const currentConversations = activeTab === 'confirmed' ? confirmedConversations : pendingConversations;

  const renderConversation = ({ item }: { item: any }) => {
    const otherName = getOtherName(item);
    const initials = otherName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const isConfirmed = item.job_status === 'confirmed';
    const isPendingConfirmation = item.confirmed_by?.length > 0 && item.job_status !== 'confirmed';
    
    return (
      <TouchableOpacity 
        testID={`conversation-${item.id}`} 
        style={s.convCard}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={[s.convAvatar, isConfirmed && s.confirmedAvatar]}>
          <Text style={s.convAvatarText}>{initials}</Text>
        </View>
        <View style={s.convInfo}>
          <View style={s.convTopRow}>
            <Text style={s.convName} numberOfLines={1}>{otherName}</Text>
            <Text style={s.convTime}>{getTimestamp(item)}</Text>
          </View>
          <Text style={s.convMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
          </Text>
          {/* Status badges */}
          <View style={s.statusRow}>
            {isConfirmed && (
              <View style={s.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                <Text style={s.confirmedBadgeText}>Job Confirmed</Text>
              </View>
            )}
            {isPendingConfirmation && (
              <View style={s.pendingBadge}>
                <Ionicons name="hourglass-outline" size={12} color={colors.primary} />
                <Text style={s.pendingBadgeText}>Awaiting Confirmation</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        {user?.role === 'contractor' && (
          <Text style={s.modeLabel}>
            {isClientMode ? '🏠 Client Mode' : '👷 Contractor Mode'}
          </Text>
        )}
      </View>

      {/* Tabs for Pending / Confirmed */}
      <View style={s.tabContainer}>
        <TouchableOpacity 
          style={[s.tab, activeTab === 'pending' && s.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[s.tabText, activeTab === 'pending' && s.activeTabText]}>
            Pending
          </Text>
          {pendingConversations.length > 0 && (
            <View style={[s.tabBadge, activeTab === 'pending' && s.activeTabBadge]}>
              <Text style={[s.tabBadgeText, activeTab === 'pending' && s.activeTabBadgeText]}>
                {pendingConversations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[s.tab, activeTab === 'confirmed' && s.activeTab]}
          onPress={() => setActiveTab('confirmed')}
        >
          <View style={s.tabContent}>
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={activeTab === 'confirmed' ? colors.green : colors.textSecondary} 
            />
            <Text style={[s.tabText, activeTab === 'confirmed' && s.activeTabTextGreen]}>
              Confirmed Jobs
            </Text>
          </View>
          {confirmedConversations.length > 0 && (
            <View style={[s.tabBadge, s.greenBadge]}>
              <Text style={s.greenBadgeText}>
                {confirmedConversations.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentConversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary} 
            />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons 
                name={activeTab === 'confirmed' ? "checkmark-done-circle-outline" : "chatbubbles-outline"} 
                size={64} 
                color={colors.textSecondary} 
              />
              <Text style={s.emptyTitle}>
                {activeTab === 'confirmed' 
                  ? 'No confirmed jobs yet' 
                  : 'No pending conversations'}
              </Text>
              <Text style={s.emptyText}>
                {activeTab === 'confirmed'
                  ? 'Jobs will appear here once both parties confirm'
                  : 'Start by finding a contractor'}
              </Text>
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
  modeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
    gap: 6,
  },
  activeTab: {
    backgroundColor: colors.primaryLight,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  activeTabTextGreen: {
    color: colors.green,
  },
  tabBadge: {
    backgroundColor: colors.textSecondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: colors.primary,
  },
  greenBadge: {
    backgroundColor: colors.green,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.paper,
  },
  activeTabBadgeText: {
    color: colors.paper,
  },
  greenBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.paper,
  },
  listContent: { 
    padding: 16,
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
