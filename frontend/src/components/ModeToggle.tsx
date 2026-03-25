import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../auth-context';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  border: '#E5E7EB',
};

export default function ModeToggle() {
  const { user, switchMode, isClientMode, isContractorMode } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // For pure clients (not contractors), show "Become a Contractor" button
  if (user?.role === 'client') {
    return (
      <TouchableOpacity 
        style={styles.becomeContractorBtn} 
        onPress={() => router.push('/?mode=register&role=contractor')}
      >
        <Ionicons name="construct" size={12} color={colors.green} />
        <Text style={styles.becomeContractorText}>Become a Pro</Text>
      </TouchableOpacity>
    );
  }

  // Only show mode toggle for contractors
  if (user?.role !== 'contractor') return null;

  const handleToggle = async () => {
    if (isClientMode) {
      await switchMode('contractor');
    } else {
      await switchMode('client');
      // If on dashboard, redirect to My Jobs (clients don't have dashboard)
      if (pathname === '/dashboard' || pathname === '/(tabs)/dashboard') {
        router.replace('/(tabs)/posted-jobs');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggle}>
      <View style={[styles.option, isClientMode && styles.optionActiveClient]}>
        <Ionicons 
          name="home" 
          size={10} 
          color={isClientMode ? colors.paper : colors.textSecondary} 
        />
        <Text style={[styles.optionText, isClientMode && styles.optionTextActive]}>
          Client
        </Text>
      </View>
      <View style={[styles.option, isContractorMode && styles.optionActiveContractor]}>
        <Ionicons 
          name="construct" 
          size={10} 
          color={isContractorMode ? colors.paper : colors.textSecondary} 
        />
        <Text style={[styles.optionText, isContractorMode && styles.optionTextActive]}>
          Contractor
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  optionActiveClient: {
    backgroundColor: colors.primary,
  },
  optionActiveContractor: {
    backgroundColor: colors.green,
  },
  optionText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.paper,
  },
  becomeContractorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  becomeContractorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.green,
  },
});
