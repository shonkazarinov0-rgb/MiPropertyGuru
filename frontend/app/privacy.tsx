import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../src/theme';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: March 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          MiPropertyGuru collects the following information:
        </Text>
        <Text style={styles.bulletPoint}>• Account information: Name, email, phone number, password</Text>
        <Text style={styles.bulletPoint}>• Profile information: Trade type, bio, portfolio photos (contractors)</Text>
        <Text style={styles.bulletPoint}>• Location data: To show nearby contractors and enable location-based services</Text>
        <Text style={styles.bulletPoint}>• Communications: Messages sent through the App</Text>
        <Text style={styles.bulletPoint}>• Payment information: Processed securely through Stripe</Text>
        <Text style={styles.bulletPoint}>• Device information: Device type, operating system, app version</Text>
        
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
        </Text>
        <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
        <Text style={styles.bulletPoint}>• Connect clients with contractors</Text>
        <Text style={styles.bulletPoint}>• Process payments and subscriptions</Text>
        <Text style={styles.bulletPoint}>• Send notifications about messages and account activity</Text>
        <Text style={styles.bulletPoint}>• Ensure platform safety and prevent fraud</Text>
        <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
        
        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We share your information in the following circumstances:
        </Text>
        <Text style={styles.bulletPoint}>• Contractor profiles are visible to clients searching for services</Text>
        <Text style={styles.bulletPoint}>• Contact information is shared when users initiate communication</Text>
        <Text style={styles.bulletPoint}>• Payment processing through Stripe (subject to Stripe's privacy policy)</Text>
        <Text style={styles.bulletPoint}>• When required by law or to protect our rights</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information to third parties.
        </Text>
        
        <Text style={styles.sectionTitle}>4. Location Data</Text>
        <Text style={styles.paragraph}>
          We collect location data to:
        </Text>
        <Text style={styles.bulletPoint}>• Show contractors near clients</Text>
        <Text style={styles.bulletPoint}>• Display contractor work areas</Text>
        <Text style={styles.bulletPoint}>• Enable live location sharing (optional for contractors)</Text>
        <Text style={styles.paragraph}>
          You can disable location services in your device settings, but this may limit App functionality.
        </Text>
        
        <Text style={styles.sectionTitle}>5. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your data, including:
        </Text>
        <Text style={styles.bulletPoint}>• Encrypted data transmission (HTTPS/TLS)</Text>
        <Text style={styles.bulletPoint}>• Secure password hashing</Text>
        <Text style={styles.bulletPoint}>• Regular security assessments</Text>
        <Text style={styles.paragraph}>
          However, no method of transmission over the Internet is 100% secure.
        </Text>
        
        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting us.
        </Text>
        
        <Text style={styles.sectionTitle}>7. Your Rights</Text>
        <Text style={styles.paragraph}>
          You have the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Access your personal data</Text>
        <Text style={styles.bulletPoint}>• Correct inaccurate data</Text>
        <Text style={styles.bulletPoint}>• Request deletion of your data</Text>
        <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
        <Text style={styles.bulletPoint}>• Export your data</Text>
        
        <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          MiPropertyGuru is not intended for users under 18 years of age. We do not knowingly collect information from children.
        </Text>
        
        <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes through the App or via email.
        </Text>
        
        <Text style={styles.sectionTitle}>10. Contact Us</Text>
        <Text style={styles.paragraph}>
          For questions about this Privacy Policy or your data, please contact us through the App.
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
