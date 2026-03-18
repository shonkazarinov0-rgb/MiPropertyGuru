import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

export default function ContractGenerateScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contractorName, setContractorName] = useState(user?.name || '');
  const [clientName, setClientName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [generating, setGenerating] = useState(false);
  const [contract, setContract] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!clientName || !jobDescription || !jobLocation || !amount) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post('/contracts/generate', {
        contractor_name: contractorName,
        client_name: clientName,
        job_description: jobDescription,
        job_location: jobLocation,
        start_date: startDate || 'TBD',
        estimated_duration: duration || 'TBD',
        total_amount: parseFloat(amount),
        payment_terms: paymentTerms || '50% upfront, 50% on completion',
      });
      setContract(res.contract_text);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate contract');
    } finally {
      setGenerating(false);
    }
  };

  if (contract) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity testID="contract-back-btn" style={s.backBtn} onPress={() => setContract(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.paper} />
          </TouchableOpacity>
          <Text style={s.topTitle}>Generated Contract</Text>
          <TouchableOpacity testID="contract-close-btn" style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.paper} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.contractScroll}>
          <View style={s.contractCard}>
            <View style={s.contractHeader}>
              <Ionicons name="document-text" size={24} color={colors.primary} />
              <Text style={s.contractHeaderText}>Service Agreement</Text>
            </View>
            <Text style={s.contractText}>{contract}</Text>
          </View>
          <View style={s.contractActions}>
            <TouchableOpacity testID="new-contract-btn" style={s.secondaryBtn} onPress={() => setContract(null)}>
              <Text style={s.secondaryBtnText}>Generate New</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity testID="gen-back-btn" style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.paper} />
        </TouchableOpacity>
        <Text style={s.topTitle}>AI Contract Generator</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
          <View style={s.infoCard}>
            <Ionicons name="sparkles" size={22} color={colors.primary} />
            <Text style={s.infoText}>AI will generate a legally formatted service contract based on the details you provide.</Text>
          </View>

          <InputField testID="contractor-name-input" label="Contractor Name" value={contractorName}
            onChangeText={setContractorName} placeholder="Your name" />
          <InputField testID="client-name-input" label="Client Name *" value={clientName}
            onChangeText={setClientName} placeholder="Client's full name" />
          <InputField testID="job-desc-input" label="Job Description *" value={jobDescription}
            onChangeText={setJobDescription} placeholder="Describe the work to be done..."
            multiline />
          <InputField testID="job-location-input" label="Job Location *" value={jobLocation}
            onChangeText={setJobLocation} placeholder="Address or location" />
          <InputField testID="start-date-input" label="Start Date" value={startDate}
            onChangeText={setStartDate} placeholder="e.g. March 1, 2026" />
          <InputField testID="duration-input" label="Estimated Duration" value={duration}
            onChangeText={setDuration} placeholder="e.g. 2 weeks" />
          <InputField testID="amount-input" label="Total Amount ($) *" value={amount}
            onChangeText={setAmount} placeholder="e.g. 5000" keyboardType="numeric" />
          <InputField testID="payment-terms-input" label="Payment Terms" value={paymentTerms}
            onChangeText={setPaymentTerms} placeholder="e.g. 50% upfront, 50% on completion" />

          <TouchableOpacity testID="generate-contract-submit-btn" style={s.generateBtn}
            onPress={handleGenerate} disabled={generating}>
            {generating ? (
              <View style={s.genLoadingRow}>
                <ActivityIndicator color={colors.secondary} />
                <Text style={s.generateBtnText}>Generating with AI...</Text>
              </View>
            ) : (
              <View style={s.genLoadingRow}>
                <Ionicons name="sparkles" size={20} color={colors.secondary} />
                <Text style={s.generateBtnText}>Generate Contract</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, value, onChangeText, placeholder, multiline, keyboardType, testID }: any) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.label}>{label}</Text>
      <TextInput testID={testID} style={[s.input, multiline && s.multiInput]}
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={colors.placeholder} multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'} keyboardType={keyboardType} />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, backgroundColor: colors.primary,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 17, fontWeight: '600', color: colors.paper },
  formScroll: { padding: spacing.m, paddingBottom: 100 },
  infoCard: {
    flexDirection: 'row', gap: spacing.s, backgroundColor: '#FFF8EC',
    borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.l, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  inputGroup: { marginBottom: spacing.m },
  label: { fontSize: 14, fontWeight: '600', color: colors.secondary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.paper, borderRadius: radius.s, paddingHorizontal: spacing.m,
    paddingVertical: 14, fontSize: 16, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
  },
  multiInput: { height: 90, paddingTop: 14 },
  generateBtn: {
    backgroundColor: colors.primary, borderRadius: radius.l, paddingVertical: 16,
    alignItems: 'center', marginTop: spacing.m,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  generateBtnText: { fontSize: 17, fontWeight: '600', color: colors.secondary },
  genLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  contractScroll: { padding: spacing.m, paddingBottom: 100 },
  contractCard: {
    backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.l,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  contractHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    marginBottom: spacing.m, paddingBottom: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  contractHeaderText: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  contractText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  contractActions: { marginTop: spacing.l, gap: spacing.m },
  secondaryBtn: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: radius.l,
    paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
