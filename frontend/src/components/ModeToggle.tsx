import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth-context';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  border: '#E5E7EB',
};

export default function ModeToggle() {
  const { user, switchMode, isClientMode, isContractorMode } = useAuth();

  // Only show for contractors
  if (user?.role !== 'contractor') return null;

  const handleToggle = async () => {
    if (isClientMode) {
      await switchMode('contractor');
    } else {
      await switchMode('client');
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleToggle}>
      <View style={[styles.option, isClientMode && styles.optionActive]}>
        <Ionicons 
          name="home" 
          size={14} 
          color={isClientMode ? colors.paper : colors.textSecondary} 
        />
      </View>
      <View style={[styles.option, isContractorMode && styles.optionActiveContractor]}>
        <Ionicons 
          name="construct" 
          size={14} 
          color={isContractorMode ? colors.paper : colors.textSecondary} 
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 3,
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 13,
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  optionActiveContractor: {
    backgroundColor: colors.green,
  },
});
