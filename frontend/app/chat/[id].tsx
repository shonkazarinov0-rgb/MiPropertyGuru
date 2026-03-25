import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 
                    Constants.expoConfig?.extra?.backendUrl || 
                    'https://mipropertyguru-production.up.railway.app';

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

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const lastSentRef = useRef<string>('');

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
        setConversation(conv);
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
        // Check if message already exists (by id or by matching text+sender within last 5 seconds)
        if (prev.some(m => m.id === msg.id)) return prev;
        
        // Also check for temp messages with same text from same sender
        const isDuplicate = prev.some(m => 
          m.id.startsWith('temp-') && 
          m.sender_id === msg.sender_id && 
          m.text === msg.text
        );
        
        if (isDuplicate) {
          // Replace temp message with real message
          return prev.map(m => 
            (m.id.startsWith('temp-') && m.sender_id === msg.sender_id && m.text === msg.text) 
              ? msg 
              : m
          );
        }
        
        return [...prev, msg];
      });
    });
    
    // Listen for job confirmation updates
    socketRef.current.on('job_confirmed', (data: any) => {
      if (data.conversation_id === conversationId) {
        setConversation((prev: any) => ({
          ...prev,
          ...data,
        }));
      }
    });
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    
    // Prevent duplicate sends
    if (lastSentRef.current === trimmed) return;
    lastSentRef.current = trimmed;
    
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: user?.id,
      text: trimmed,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setText('');
    
    try {
      // Send via API instead of socket for reliability
      await api.post('/messages/send', {
        conversation_id: conversationId,
        text: trimmed,
      });
    } catch (e) {
      console.error('Failed to send message:', e);
      // Try socket as fallback
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversation_id: conversationId,
          text: trimmed,
        });
      }
    } finally {
      setSending(false);
      // Reset last sent after a delay
      setTimeout(() => { lastSentRef.current = ''; }, 2000);
    }
  };

  const confirmJob = async () => {
    // Use a simple confirmation since Alert.alert may not work on web
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to confirm this job? Both parties must confirm for the job to be marked as confirmed.');
      if (!confirmed) return;
      
      try {
        const res = await api.post(`/conversations/${conversationId}/confirm-job`);
        setConversation(res.conversation);
        
        if (res.conversation.job_status === 'confirmed') {
          window.alert('Job Confirmed! 🎉 Both parties have confirmed! This conversation has been moved to Confirmed Jobs.');
          router.push('/(tabs)/messages');
        } else {
          const otherType = user?.role === 'contractor' ? 'client' : 'contractor';
          window.alert(`Confirmation Sent ✓ You've confirmed! Waiting for the ${otherType} to confirm.`);
        }
      } catch (e: any) {
        window.alert('Error: ' + (e.message || 'Could not confirm job'));
      }
    } else {
      Alert.alert(
        'Confirm Job',
        'Are you sure you want to confirm this job? Both parties must confirm for the job to be marked as confirmed.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            onPress: async () => {
              try {
                const res = await api.post(`/conversations/${conversationId}/confirm-job`);
                setConversation(res.conversation);
                
                if (res.conversation.job_status === 'confirmed') {
                  Alert.alert(
                    'Job Confirmed! 🎉', 
                    'Both parties have confirmed! This conversation has been moved to Confirmed Jobs.',
                    [
                      { 
                        text: 'View Confirmed Jobs', 
                        onPress: () => router.push('/(tabs)/messages')
                      }
                    ]
                  );
                } else {
                  const otherType = user?.role === 'contractor' ? 'client' : 'contractor';
                  Alert.alert(
                    'Confirmation Sent ✓', 
                    `You've confirmed! Waiting for the ${otherType} to confirm.`
                  );
                }
              } catch (e: any) {
                Alert.alert('Error', e.message || 'Could not confirm job');
              }
            }
          }
        ]
      );
    }
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

  // Determine confirmation status
  const myConfirmed = conversation?.confirmed_by?.includes(user?.id);
  const isFullyConfirmed = conversation?.job_status === 'confirmed';
  const confirmCount = conversation?.confirmed_by?.length || 0;
  
  // Determine other party type
  const isContractor = user?.role === 'contractor';
  const otherPartyType = isContractor ? 'client' : 'contractor';

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Get other party's contact info
  const otherParticipant = conversation?.participant_1 === user?.id 
    ? { phone: conversation?.participant_2_phone, email: conversation?.participant_2_email }
    : { phone: conversation?.participant_1_phone, email: conversation?.participant_1_email };

  const handleCall = () => {
    if (otherParticipant.phone) {
      Linking.openURL(`tel:${otherParticipant.phone}`);
    } else {
      Alert.alert('Not Available', 'Phone number is not available for this contact.');
    }
  };

  const handleEmail = () => {
    if (otherParticipant.email) {
      Linking.openURL(`mailto:${otherParticipant.email}`);
    } else {
      Alert.alert('Not Available', 'Email is not available for this contact.');
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={s.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            <Text style={s.headerName}>{otherName}</Text>
            {isFullyConfirmed && (
              <View style={s.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={s.confirmedText}>Job Confirmed</Text>
              </View>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerActionBtn} onPress={handleCall}>
              <Ionicons name="call" size={22} color={colors.green} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerActionBtn} onPress={handleEmail}>
              <Ionicons name="mail" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer Banner */}
        <View style={s.disclaimerBanner}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
          <Text style={s.disclaimerText}>
            We recommend confirming licenses and experience before hiring.
          </Text>
        </View>

        {/* Job Confirmation Banner */}
        {!isFullyConfirmed && (
          <View style={s.confirmBanner}>
            <View style={s.confirmIconContainer}>
              <Ionicons 
                name={myConfirmed ? "checkmark-circle" : "briefcase-outline"} 
                size={20} 
                color={myConfirmed ? colors.green : colors.primary} 
              />
            </View>
            <View style={s.confirmTextContainer}>
              {myConfirmed ? (
                <>
                  <Text style={s.confirmTitle}>
                    <Text style={s.confirmCount}>{confirmCount}/2</Text> Confirmed
                  </Text>
                  <Text style={s.confirmSubtext}>
                    Waiting for {otherPartyType} to confirm...
                  </Text>
                </>
              ) : confirmCount > 0 ? (
                <>
                  <Text style={s.confirmTitle}>
                    <Text style={s.confirmCount}>{confirmCount}/2</Text> Confirmed
                  </Text>
                  <Text style={s.confirmSubtext}>
                    The {otherPartyType} has confirmed. Your turn!
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.confirmTitle}>Confirm the job</Text>
                  <Text style={s.confirmSubtext}>
                    Both parties must confirm to proceed
                  </Text>
                </>
              )}
            </View>
            {!myConfirmed && (
              <TouchableOpacity style={s.confirmBtn} onPress={confirmJob}>
                <Text style={s.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            )}
            {myConfirmed && (
              <View style={s.waitingBadge}>
                <ActivityIndicator size="small" color={colors.green} />
              </View>
            )}
          </View>
        )}
        
        {/* Fully Confirmed Banner */}
        {isFullyConfirmed && (
          <View style={s.fullyConfirmedBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
            <Text style={s.fullyConfirmedText}>Job Confirmed by both parties!</Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          onLayout={() => flatListRef.current?.scrollToEnd()}
        />

        {/* Input */}
        <View style={s.inputContainer}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]} 
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.paper} />
            ) : (
              <Ionicons name="send" size={20} color={colors.paper} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    width: 32,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  confirmedText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confirmIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  confirmTextContainer: {
    flex: 1,
  },
  confirmTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  confirmCount: {
    color: colors.primary,
    fontWeight: '700',
  },
  confirmSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  confirmBtnText: {
    color: colors.paper,
    fontSize: 13,
    fontWeight: '600',
  },
  waitingBadge: {
    padding: 8,
  },
  fullyConfirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  fullyConfirmedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    marginBottom: 8,
  },
  msgRowLeft: {
    alignItems: 'flex-start',
  },
  msgRowRight: {
    alignItems: 'flex-end',
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: colors.paper,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: colors.paper,
  },
  theirText: {
    color: colors.text,
  },
  msgTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  theirTime: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
