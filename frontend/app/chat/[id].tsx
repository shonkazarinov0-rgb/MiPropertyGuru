import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherName, setOtherName] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    connectSocket();
    return () => { socketRef.current?.disconnect(); };
  }, [conversationId]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(res.messages || []);
      const convRes = await api.get('/conversations');
      const conv = (convRes.conversations || []).find((c: any) => c.id === conversationId);
      if (conv) {
        setOtherName(conv.participant_1 === user?.id ? conv.participant_2_name : conv.participant_1_name);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const connectSocket = () => {
    socketRef.current = io(BACKEND_URL, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
    });
    socketRef.current.on('connect', () => {
      socketRef.current?.emit('authenticate', { user_id: user?.id });
      socketRef.current?.emit('join_room', { room_id: conversationId });
    });
    socketRef.current.on('new_message', (msg: any) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
  };

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current?.connected) return;
    const tempMsg = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user?.id,
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    socketRef.current.emit('send_message', {
      conversation_id: conversationId,
      text: trimmed,
    });
    setText('');
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[s.msgRow, isMine ? s.msgRowRight : s.msgRowLeft]}>
        <View style={[s.msgBubble, isMine ? s.myBubble : s.theirBubble]}>
          <Text style={[s.msgText, isMine ? s.myText : s.theirText]}>{item.text}</Text>
          <Text style={[s.msgTime, isMine ? s.myTime : s.theirTime]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity testID="chat-back-btn" style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.paper} />
        </TouchableOpacity>
        <View style={s.topInfo}>
          <Text style={s.topName}>{otherName || 'Chat'}</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={s.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={s.emptyChat}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textDisabled} />
                <Text style={s.emptyText}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        <View style={s.inputBar}>
          <TextInput testID="chat-input" style={s.chatInput} placeholder="Type a message..."
            placeholderTextColor={colors.placeholder} value={text} onChangeText={setText}
            multiline maxLength={1000} />
          <TouchableOpacity testID="send-btn" style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}
            onPress={sendMessage} disabled={!text.trim()}>
            <Ionicons name="send" size={20} color={text.trim() ? colors.paper : colors.textDisabled} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, backgroundColor: colors.secondary,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topInfo: { flex: 1, alignItems: 'center' },
  topName: { fontSize: 17, fontWeight: '600', color: colors.paper },
  messagesList: { padding: spacing.m, paddingBottom: spacing.s },
  msgRow: { marginBottom: spacing.s },
  msgRowRight: { alignItems: 'flex-end' },
  msgRowLeft: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: colors.paper, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  msgText: { fontSize: 16, lineHeight: 21 },
  myText: { color: colors.secondary },
  theirText: { color: colors.textPrimary },
  msgTime: { fontSize: 11, marginTop: 4 },
  myTime: { color: 'rgba(28,28,30,0.5)', alignSelf: 'flex-end' },
  theirTime: { color: colors.textDisabled, alignSelf: 'flex-end' },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.s },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.s,
    paddingHorizontal: spacing.m, paddingVertical: spacing.s,
    backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.border,
  },
  chatInput: {
    flex: 1, backgroundColor: colors.background, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16,
    color: colors.textPrimary, maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
});
