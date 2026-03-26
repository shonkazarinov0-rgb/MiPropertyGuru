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
import { TRADES, getTradeIcon } from '../src/constants/trades';

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

export default function PostJobScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetNegotiable, setBudgetNegotiable] = useState<boolean | null>(null);
  const [showTradePicker, setShowTradePicker] = useState(false);

  const toggleTrade = (tradeName: string) => {
    if (selectedTrades.includes(tradeName)) {
      setSelectedTrades(selectedTrades.filter(t => t !== tradeName));
    } else if (selectedTrades.length < 3) {
      setSelectedTrades([...selectedTrades, tradeName]);
    } else {
      Alert.alert('Limit Reached', 'You can select up to 3 trades per job.');
    }
  };

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
    if (selectedTrades.length === 0) {
      Alert.alert('Error', 'Please select at least one trade/service');
      return;
    }

    setLoading(true);
    try {
      await api.post('/jobs/post', {
        title: title.trim(),
        description: description.trim(),
        trade_required: selectedTrades.join(', '),  // Store as comma-separated
        trades_required: selectedTrades,  // Also store as array
        location: location.trim() || null,
        budget: budget.trim() || null,
        budget_negotiable: budgetNegotiable,
        urgency: 'normal',
      });

      // Redirect directly to My Jobs (Pending tab)
      router.replace('/(tabs)/posted-jobs');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

          {/* Trade Required - Multi-select up to 3 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Required * (Select up to 3)</Text>
            <TouchableOpacity 
              style={styles.selectInput}
              onPress={() => setShowTradePicker(true)}
            >
              {selectedTrades.length > 0 ? (
                <View style={styles.selectedTradesContainer}>
                  {selectedTrades.map((trade, idx) => (
                    <View key={trade} style={styles.selectedTradeChip}>
                      <Text style={styles.tradeChipIcon}>{getTradeIcon(trade)}</Text>
                      <Text style={styles.tradeChipText}>{trade}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select trades/services</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {selectedTrades.length > 0 && (
              <Text style={styles.tradeCount}>{selectedTrades.length}/3 selected</Text>
            )}
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
              placeholder="e.g., $100-200"
              placeholderTextColor={colors.textSecondary}
              keyboardType="default"
            />
            {/* Negotiable Toggle - Optional */}
            <View style={styles.negotiableRow}>
              <TouchableOpacity 
                style={[
                  styles.negotiableOption,
                  budgetNegotiable === true && styles.negotiableOptionActive
                ]}
                onPress={() => setBudgetNegotiable(budgetNegotiable === true ? null : true)}
              >
                <View style={[styles.radioCircle, budgetNegotiable === true && styles.radioCircleActive]}>
                  {budgetNegotiable === true && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.negotiableText, budgetNegotiable === true && styles.negotiableTextActive]}>
                  Negotiable
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.negotiableOption,
                  budgetNegotiable === false && styles.negotiableOptionActive
                ]}
                onPress={() => setBudgetNegotiable(budgetNegotiable === false ? null : false)}
              >
                <View style={[styles.radioCircle, budgetNegotiable === false && styles.radioCircleActive]}>
                  {budgetNegotiable === false && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.negotiableText, budgetNegotiable === false && styles.negotiableTextActive]}>
                  Fixed Price
                </Text>
              </TouchableOpacity>
            </View>
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

        {/* Trade Picker Modal - Multi-select */}
        <Modal
          visible={showTradePicker}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Services (Max 3)</Text>
              <TouchableOpacity onPress={() => setShowTradePicker(false)}>
                <Text style={styles.modalDoneBtn}>Done</Text>
              </TouchableOpacity>
            </View>
            {selectedTrades.length > 0 && (
              <View style={styles.selectedTradesHeader}>
                <Text style={styles.selectedTradesLabel}>Selected: {selectedTrades.length}/3</Text>
                <TouchableOpacity onPress={() => setSelectedTrades([])}>
                  <Text style={styles.clearAllBtn}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <ScrollView style={styles.modalContent}>
              {TRADES.map((trade) => {
                const isSelected = selectedTrades.includes(trade.name);
                const isDisabled = !isSelected && selectedTrades.length >= 3;
                return (
                  <TouchableOpacity
                    key={trade.name}
                    style={[
                      styles.tradeOption,
                      isSelected && styles.tradeOptionActive,
                      isDisabled && styles.tradeOptionDisabled
                    ]}
                    onPress={() => toggleTrade(trade.name)}
                    disabled={isDisabled}
                  >
                    <Text style={styles.tradeOptionIcon}>{trade.icon}</Text>
                    <Text style={[
                      styles.tradeOptionText,
                      isSelected && styles.tradeOptionTextActive,
                      isDisabled && styles.tradeOptionTextDisabled
                    ]}>{trade.name}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
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
  tradeOptionDisabled: {
    opacity: 0.4,
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
  tradeOptionTextDisabled: {
    color: colors.textSecondary,
  },
  // Multi-select trade chips
  selectedTradesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  selectedTradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  tradeChipIcon: {
    fontSize: 14,
  },
  tradeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  tradeCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalDoneBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedTradesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedTradesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  clearAllBtn: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.red,
  },
  // Negotiable toggle styles
  negotiableRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  negotiableOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.paper,
  },
  negotiableOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  negotiableText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  negotiableTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
