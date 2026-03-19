import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../src/theme';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: March 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using MiPropertyGuru ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Platform Description</Text>
        <Text style={styles.paragraph}>
          MiPropertyGuru is a platform that connects clients seeking property services with independent contractors. The App serves solely as a connection platform and does not employ, supervise, or control any contractors listed on the platform.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Contractor Responsibilities</Text>
        <Text style={styles.paragraph}>
          As a contractor using MiPropertyGuru, you acknowledge and agree that:
        </Text>
        <Text style={styles.bulletPoint}>• You are an independent contractor, not an employee of MiPropertyGuru</Text>
        <Text style={styles.bulletPoint}>• You are solely responsible for the quality, safety, and legality of all work performed</Text>
        <Text style={styles.bulletPoint}>• You must maintain all required licenses, permits, and insurance for your trade</Text>
        <Text style={styles.bulletPoint}>• You are responsible for your own taxes, including self-employment taxes</Text>
        <Text style={styles.bulletPoint}>• You must comply with all applicable laws and regulations</Text>
        <Text style={styles.bulletPoint}>• You are responsible for any damages, injuries, or claims arising from your work</Text>
        
        <Text style={styles.sectionTitle}>4. Client Responsibilities</Text>
        <Text style={styles.paragraph}>
          As a client using MiPropertyGuru, you acknowledge and agree that:
        </Text>
        <Text style={styles.bulletPoint}>• You are responsible for verifying contractor credentials and qualifications</Text>
        <Text style={styles.bulletPoint}>• All agreements, contracts, and payments are between you and the contractor</Text>
        <Text style={styles.bulletPoint}>• You should obtain written estimates and contracts before work begins</Text>
        <Text style={styles.bulletPoint}>• MiPropertyGuru does not guarantee the quality of any contractor's work</Text>
        
        <Text style={styles.sectionTitle}>5. Payment Terms</Text>
        <Text style={styles.paragraph}>
          All payments for services are made directly between clients and contractors. MiPropertyGuru is not involved in any payment transactions between clients and contractors. Contractors pay a monthly subscription fee to maintain their profile on the platform.
        </Text>
        
        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, MIPROPERTYGURU SHALL NOT BE LIABLE FOR:
        </Text>
        <Text style={styles.bulletPoint}>• Any damages, injuries, or losses arising from work performed by contractors</Text>
        <Text style={styles.bulletPoint}>• Disputes between clients and contractors</Text>
        <Text style={styles.bulletPoint}>• The quality, safety, or legality of any services provided</Text>
        <Text style={styles.bulletPoint}>• Any indirect, incidental, special, or consequential damages</Text>
        <Text style={styles.bulletPoint}>• Loss of profits, data, or business opportunities</Text>
        <Text style={styles.paragraph}>
          MiPropertyGuru's total liability shall not exceed the amount paid by you to the platform in the past 12 months.
        </Text>
        
        <Text style={styles.sectionTitle}>7. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless MiPropertyGuru, its owners, officers, employees, and agents from any claims, damages, losses, or expenses arising from your use of the platform or violation of these terms.
        </Text>
        
        <Text style={styles.sectionTitle}>8. Dispute Resolution</Text>
        <Text style={styles.paragraph}>
          Any disputes between clients and contractors must be resolved directly between those parties. MiPropertyGuru may, at its sole discretion, assist in mediation but is under no obligation to do so.
        </Text>
        
        <Text style={styles.sectionTitle}>9. Account Termination</Text>
        <Text style={styles.paragraph}>
          MiPropertyGuru reserves the right to suspend or terminate any account at any time for violation of these terms or for any other reason at our sole discretion.
        </Text>
        
        <Text style={styles.sectionTitle}>10. Modifications</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the modified terms.
        </Text>
        
        <Text style={styles.sectionTitle}>11. Contact</Text>
        <Text style={styles.paragraph}>
          For questions about these Terms of Service, please contact us through the App.
        </Text>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  backBtn: { padding: 8 },
  content: { flex: 1, padding: 20 },
  lastUpdated: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 10 },
  paragraph: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 10 },
  bulletPoint: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginLeft: 10, marginBottom: 6 },
  bottomPadding: { height: 40 },
});
