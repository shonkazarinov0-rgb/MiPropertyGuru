import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
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
  { name: 'Insulation', icon: '🧤' },
  { name: 'Concrete', icon: '🪨' },
  { name: 'Fence', icon: '🚧' },
  { name: 'Deck Builder', icon: '🌲' },
  { name: 'Cabinet Maker', icon: '🪑' },
  { name: 'Window Installer', icon: '🖼️' },
  { name: 'Siding', icon: '🏘️' },
  { name: 'Garage Door', icon: '🚗' },
  { name: 'Pool Service', icon: '🏊' },
  { name: 'Locksmith', icon: '🔐' },
  { name: 'Appliance Repair', icon: '🔌' },
];

export default function ContractorSettingsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [serviceRadius, setServiceRadius] = useState(15);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState(0);

  useEffect(() => {
    if (user) {
      setServiceRadius(user.service_radius || 15);
      setSelectedTrades(user.trades || []);
      setBio(user.bio || '');
      setExperienceYears(user.experience_years || 0);
    }
  }, [user]);

  const toggleTrade = (tradeName: string) => {
    if (selectedTrades.includes(tradeName)) {
      setSelectedTrades(selectedTrades.filter(t => t !== tradeName));
    } else if (selectedTrades.length < 5) {
      setSelectedTrades([...selectedTrades, tradeName]);
    } else {
      Alert.alert('Limit reached', 'You can select up to 5 trades');
    }
  };

  const handleSave = async () => {
    if (selectedTrades.length === 0) {
      Alert.alert('Error', 'Please select at least one trade');
      return;
    }

    setSaving(true);
    try {
      await api.put('/contractors/profile', {
        service_radius: serviceRadius,
        trades: selectedTrades,
        bio,
        experience_years: experienceYears,
      });
      
      if (refreshUser) refreshUser();
      Alert.alert('Success', 'Settings saved!');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Radius */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Radius</Text>
          <Text style={styles.sectionSubtitle}>
            You'll receive job alerts within this distance
          </Text>
          
          <View style={styles.sliderContainer}>
            <Text style={styles.radiusValue}>{serviceRadius} km</Text>
            <Slider
              style={styles.slider}
              minimumValue={5}
              maximumValue={50}
              step={5}
              value={serviceRadius}
              onValueChange={setServiceRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>5 km</Text>
              <Text style={styles.sliderLabel}>50 km</Text>
            </View>
          </View>
        </View>

        {/* Trades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Trades</Text>
          <Text style={styles.sectionSubtitle}>
            Select up to 5 trades you're skilled in ({selectedTrades.length}/5)
          </Text>
          
          <View style={styles.tradesGrid}>
            {TRADES.map(trade => (
              <TouchableOpacity
                key={trade.name}
                style={[
                  styles.tradeChip,
                  selectedTrades.includes(trade.name) && styles.tradeChipActive,
                ]}
                onPress={() => toggleTrade(trade.name)}
              >
                <Text style={styles.tradeIcon}>{trade.icon}</Text>
                <Text style={[
                  styles.tradeText,
                  selectedTrades.includes(trade.name) && styles.tradeTextActive,
                ]}>
                  {trade.name}
                </Text>
                {selectedTrades.includes(trade.name) && (
                  <Ionicons name="checkmark" size={16} color={colors.paper} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={String(experienceYears)}
              onChangeText={(t) => setExperienceYears(parseInt(t) || 0)}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.inputLabel}>years of experience</Text>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.sectionSubtitle}>
            Tell clients about yourself and your services
          </Text>
          <TextInput
            style={styles.bioInput}
            value={bio}
            onChangeText={setBio}
            placeholder="Example: Experienced electrician specializing in residential work. Licensed and insured. Quality work at fair prices."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <Text style={styles.submitBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  sliderContainer: {
    marginTop: 8,
  },
  radiusValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tradesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tradeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  tradeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tradeIcon: {
    fontSize: 16,
  },
  tradeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  tradeTextActive: {
    color: colors.paper,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    width: 70,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  bioInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hourInput: {
    flex: 1,
  },
  hourLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  hourField: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  hourSeparator: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
