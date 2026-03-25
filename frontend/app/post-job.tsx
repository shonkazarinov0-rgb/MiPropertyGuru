import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal,
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
  border: '#E5E7EB',
  red: '#EF4444',
};

const TRADES = [
  { name: 'Electrician', icon: '⚡' },
  { name: 'Plumber', icon: '🔧' },
  { name: 'Handyman', icon: '🔨' },
  { name: 'HVAC Technician', icon: '❄️' },
  { name: 'Carpenter', icon: '🪚' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Roofer', icon: '🏠' },
  { name: 'General Contractor', icon: '👷' },
  { name: 'Tiler', icon: '🔲' },
  { name: 'Landscaper', icon: '🌳' },
  { name: 'Mason', icon: '🧱' },
  { name: 'Welder', icon: '🔥' },
  { name: 'Glazier', icon: '🪟' },
  { name: 'Demolition', icon: '💥' },
  { name: 'Drywall', icon: '🏗️' },
  { name: 'Flooring', icon: '🪵' },
  { name: 'Locksmith', icon: '🔐' },
  { name: 'Appliance Repair', icon: '🔌' },
];

export default function PostJobScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tradeRequired, setTradeRequired] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [showTradePicker, setShowTradePicker] = useState(false);

  const handlePost = async () => {
    // Check if guest
    if (isGuest || !user) {
      Alert.alert(
        'Sign In Required',
        'You need to create an account to post a job.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/') },
        ]
      );
      return;
    }

    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the job');
      return;
    }
    if (!tradeRequired) {
      Alert.alert('Error', 'Please select the trade/service required');
      return;
    }

    setLoading(true);
    try {
      await api.post('/jobs/post', {
        title: title.trim(),
        description: description.trim(),
        trade_required: tradeRequired,
        location: location.trim() || null,
        budget: budget.trim() || null,
        urgency: 'normal',
      });

      Alert.alert(
        'Job Posted!',
        'Your job has been posted. Contractors matching your requirements will be notified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTrade = TRADES.find(t => t.name === tradeRequired);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              Post your job and let contractors come to you. They'll see your job on their dashboard and can contact you directly.
            </Text>
          </View>

          {/* Job Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Fix leaking kitchen faucet"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Trade Required */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Required *</Text>
            <TouchableOpacity 
              style={styles.selectInput}
              onPress={() => setShowTradePicker(true)}
            >
              {selectedTrade ? (
                <View style={styles.selectedTrade}>
                  <Text style={styles.tradeIcon}>{selectedTrade.icon}</Text>
                  <Text style={styles.selectedTradeText}>{selectedTrade.name}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select a trade/service</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job Description *</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the work needed, any issues, and when you'd like it done..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location (Optional)</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Downtown Toronto, ON"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Budget */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Budget (Optional)</Text>
            <TextInput
              style={styles.input}
              value={budget}
              onChangeText={setBudget}
              placeholder="e.g., $100-200 or Negotiable"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.noteBox}>
            <Ionicons name="shield-checkmark" size={18} color={colors.textSecondary} />
            <Text style={styles.noteText}>
              Your contact info will be shared with contractors who respond to your job.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.postBtn, loading && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color={colors.paper} />
                <Text style={styles.postBtnText}>Post Job</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Trade Picker Modal */}
        <Modal
          visible={showTradePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service</Text>
              <TouchableOpacity onPress={() => setShowTradePicker(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {TRADES.map((trade) => (
                <TouchableOpacity
                  key={trade.name}
                  style={[
                    styles.tradeOption,
                    tradeRequired === trade.name && styles.tradeOptionActive
                  ]}
                  onPress={() => {
                    setTradeRequired(trade.name);
                    setShowTradePicker(false);
                  }}
                >
                  <Text style={styles.tradeOptionIcon}>{trade.icon}</Text>
                  <Text style={[
                    styles.tradeOptionText,
                    tradeRequired === trade.name && styles.tradeOptionTextActive
                  ]}>{trade.name}</Text>
                  {tradeRequired === trade.name && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedTrade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tradeIcon: {
    fontSize: 20,
  },
  selectedTradeText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  textArea: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 6,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  tradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  tradeOptionActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tradeOptionIcon: {
    fontSize: 24,
  },
  tradeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  tradeOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
