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

  if (user?.role === 'client') {
    return (
      <TouchableOpacity
        style={styles.becomeContractorBtn}
        onPress={() => {
          try {
            console.log('Become a Pro button pressed');
            router.push('/contractor-register');
          } catch (e: any) {
            console.error('Become a Pro navigation crash:', e);
            console.error('Become a Pro navigation message:', e?.message);
          }
        }}
      >
        <Ionicons name="construct" size={12} color={colors.green} />
        <Text style={styles.becomeContractorText}>Become a Pro</Text>
      </TouchableOpacity>
    );
  }

  if (user?.role !== 'contractor') return null;

  const handleClientMode = async () => {
    console.log('handleClientMode pressed');

    if (isClientMode) {
      console.log('Already in client mode');
      return;
    }

    try {
      console.log('About to switchMode(client)');
      await switchMode('client');
      console.log('switchMode(client) success');

      if (pathname === '/dashboard' || pathname === '/(tabs)/dashboard') {
        console.log('About to router.replace(/(tabs)/posted-jobs)');
        router.replace('/(tabs)/posted-jobs');
        console.log('router.replace posted-jobs success');
      }
    } catch (e: any) {
      console.error('handleClientMode crash:', e);
      console.error('handleClientMode message:', e?.message);
    }
  };

  const handleContractorMode = async () => {
    console.log('handleContractorMode pressed');

    if (isContractorMode) {
      console.log('Already in contractor mode');
      return;
    }

    try {
      console.log('About to switchMode(contractor)');
      await switchMode('contractor');
      console.log('switchMode(contractor) success');

      if (pathname === '/posted-jobs' || pathname === '/(tabs)/posted-jobs') {
        console.log('About to router.replace(/(tabs)/dashboard)');
        router.replace('/(tabs)/dashboard');
        console.log('router.replace dashboard success');
      }
    } catch (e: any) {
      console.error('handleContractorMode crash:', e);
      console.error('handleContractorMode message:', e?.message);
    }
  };

  return (
    <View
      style={[
        styles.container,
        pathname === '/home' || pathname === '/(tabs)/home'
          ? styles.containerWhite
          : styles.containerGray,
      ]}
    >
      <TouchableOpacity
        style={[styles.option, isClientMode && styles.optionActiveClient]}
        onPress={handleClientMode}
        activeOpacity={0.7}
      >
        <Ionicons
          name="home"
          size={10}
          color={isClientMode ? colors.paper : colors.textSecondary}
        />
        <Text style={[styles.optionText, isClientMode && styles.optionTextActive]}>
          Client
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, isContractorMode && styles.optionActiveContractor]}
        onPress={handleContractorMode}
        activeOpacity={0.7}
      >
        <Ionicons
          name="construct"
          size={10}
          color={isContractorMode ? colors.paper : colors.textSecondary}
        />
        <Text style={[styles.optionText, isContractorMode && styles.optionTextActive]}>
          Contractor
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 2,
  },
  containerWhite: {
    backgroundColor: colors.paper,
  },
  containerGray: {
    backgroundColor: '#F3F4F6',
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
    backgroundColor: colors.primary,
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
