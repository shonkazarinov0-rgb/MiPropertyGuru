import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  primary: '#FF6A00',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to MiPropertyGuru ("Platform", "we", "us", "our").
          </Text>
          <Text style={styles.paragraph}>
            MiPropertyGuru provides a technology platform that connects individuals seeking services ("Clients") with independent service providers ("Contractors").
          </Text>
          <Text style={styles.important}>
            MiPropertyGuru does not provide any contracting or home services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Nature of the Platform</Text>
          <Text style={styles.paragraph}>
            MiPropertyGuru is strictly a marketplace platform.
          </Text>
          <Text style={styles.bulletPoint}>• We do not employ or manage Contractors</Text>
          <Text style={styles.bulletPoint}>• We do not perform services</Text>
          <Text style={styles.bulletPoint}>• We do not supervise work</Text>
          <Text style={styles.paragraph}>
            All services are performed solely between Clients and Contractors.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. No Guarantee or Verification</Text>
          <Text style={styles.paragraph}>
            MiPropertyGuru does not guarantee:
          </Text>
          <Text style={styles.bulletPoint}>• Quality of work</Text>
          <Text style={styles.bulletPoint}>• Contractor qualifications</Text>
          <Text style={styles.bulletPoint}>• Licensing status</Text>
          <Text style={styles.important}>
            Any license information displayed (including "License on file") is provided by the Contractor and is NOT guaranteed or independently verified by MiPropertyGuru.
          </Text>
          <Text style={styles.paragraph}>
            Users are responsible for verifying all qualifications before hiring.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Independent Contractors</Text>
          <Text style={styles.paragraph}>
            Contractors are:
          </Text>
          <Text style={styles.bulletPoint}>• Independent individuals or businesses</Text>
          <Text style={styles.bulletPoint}>• Not employees or agents of MiPropertyGuru</Text>
          <Text style={styles.paragraph}>
            They are solely responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Their work</Text>
          <Text style={styles.bulletPoint}>• Safety</Text>
          <Text style={styles.bulletPoint}>• Legal compliance</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Payments</Text>
          <Text style={styles.paragraph}>
            All payments are:
          </Text>
          <Text style={styles.bulletPoint}>• Between Clients and Contractors</Text>
          <Text style={styles.bulletPoint}>• Not handled by MiPropertyGuru</Text>
          <Text style={styles.paragraph}>
            We are not responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Payment disputes</Text>
          <Text style={styles.bulletPoint}>• Pricing</Text>
          <Text style={styles.bulletPoint}>• Refunds</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. User Responsibilities</Text>
          <Text style={styles.subTitle}>Clients:</Text>
          <Text style={styles.bulletPoint}>• Must verify contractor qualifications</Text>
          <Text style={styles.bulletPoint}>• Assume all risks related to services</Text>
          <Text style={styles.subTitle}>Contractors:</Text>
          <Text style={styles.bulletPoint}>• Must ensure licenses (if required) are valid</Text>
          <Text style={styles.bulletPoint}>• Must comply with all laws</Text>
          <Text style={styles.bulletPoint}>• Are responsible for their services</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Safety Disclaimer</Text>
          <Text style={styles.paragraph}>
            Some services involve risks (e.g., electrical, construction).
          </Text>
          <Text style={styles.important}>
            By using MiPropertyGuru, users acknowledge these risks and accept full responsibility.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, MiPropertyGuru is not liable for:
          </Text>
          <Text style={styles.bulletPoint}>• Injury or death</Text>
          <Text style={styles.bulletPoint}>• Property damage</Text>
          <Text style={styles.bulletPoint}>• Financial loss</Text>
          <Text style={styles.bulletPoint}>• Poor work</Text>
          <Text style={styles.bulletPoint}>• Disputes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Indemnification</Text>
          <Text style={styles.paragraph}>
            Users agree to indemnify MiPropertyGuru against any claims arising from:
          </Text>
          <Text style={styles.bulletPoint}>• Use of the platform</Text>
          <Text style={styles.bulletPoint}>• Services performed</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Account Responsibility</Text>
          <Text style={styles.paragraph}>
            Users are responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Account security</Text>
          <Text style={styles.bulletPoint}>• Activity under their account</Text>
          <Text style={styles.bulletPoint}>• One active session per account at a time</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. No Warranty</Text>
          <Text style={styles.paragraph}>
            The platform is provided "as is" without guarantees.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Termination</Text>
          <Text style={styles.paragraph}>
            We may suspend accounts for:
          </Text>
          <Text style={styles.bulletPoint}>• Violations</Text>
          <Text style={styles.bulletPoint}>• Suspicious activity</Text>
          <Text style={styles.bulletPoint}>• Multiple logins from different locations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Governing Law</Text>
          <Text style={styles.paragraph}>
            These terms are governed by the laws of Ontario, Canada.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Changes</Text>
          <Text style={styles.paragraph}>
            We may update these terms at any time. Continued use of the platform constitutes acceptance of changes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact</Text>
          <Text style={styles.paragraph}>
            For questions about these terms, please contact us through the Support section in the app.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using MiPropertyGuru, you agree to these Terms of Service.
          </Text>
        </View>
      </ScrollView>
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
    padding: 16,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
    backgroundColor: colors.paper,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 24,
    marginLeft: 8,
  },
  important: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    lineHeight: 22,
    marginVertical: 8,
    backgroundColor: '#FFF3EB',
    padding: 12,
    borderRadius: 8,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
    padding: 16,
    backgroundColor: colors.paper,
    borderRadius: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
