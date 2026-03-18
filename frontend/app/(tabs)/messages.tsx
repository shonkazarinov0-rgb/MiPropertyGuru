import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchConversations(); }, []);

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

  const renderConversation = ({ item }: { item: any }) => {
    const otherName = getOtherName(item);
    const initials = otherName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    return (
      <TouchableOpacity testID={`conversation-${item.id}`} style={s.convCard}
        onPress={() => router.push(`/chat/${item.id}`)}>
        <View style={s.convAvatar}><Text style={s.convAvatarText}>{initials}</Text></View>
        <View style={s.convInfo}>
          <View style={s.convTopRow}>
            <Text style={s.convName} numberOfLines={1}>{otherName}</Text>
            <Text style={s.convTime}>{getTimestamp(item)}</Text>
          </View>
          <Text style={s.convMessage} numberOfLines={1}>
            {item.last_message || 'Start a conversation...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textDisabled} />
              <Text style={s.emptyTitle}>No messages yet</Text>
              <Text style={s.emptyText}>Start by finding a contractor in Explore</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.m, paddingVertical: spacing.m, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 28, fontWeight: '700', color: colors.secondary },
  listContent: { padding: spacing.m },
  convCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  convAvatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  convAvatarText: { fontSize: 16, fontWeight: '700', color: colors.paper },
  convInfo: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: 16, fontWeight: '600', color: colors.secondary, flex: 1, marginRight: spacing.s },
  convTime: { fontSize: 12, color: colors.textSecondary },
  convMessage: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.secondary, marginTop: spacing.m },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs },
});
