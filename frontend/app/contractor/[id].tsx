import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Linking, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

export default function ContractorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [contractor, setContractor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => { fetchContractor(); }, [id]);

  const fetchContractor = async () => {
    try {
      const res = await api.get(`/contractors/${id}`);
      setContractor(res.contractor);
      setReviews(res.reviews || []);
      setPortfolio(res.portfolio || []);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleMessage = async () => {
    // Check if user is logged in - redirect to registration if not
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to create an account to message contractors.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/') },
        ]
      );
      return;
    }
    
    if (!contractor) return;
    setMessaging(true);
    try {
      const conv = await api.post('/conversations', { participant_id: contractor.id });
      router.push(`/chat/${conv.id}`);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setMessaging(false); }
  };

  const handleCall = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to create an account to contact contractors.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/') },
        ]
      );
      return;
    }
    if (contractor?.phone) Linking.openURL(`tel:${contractor.phone}`);
  };

  const handleEmail = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to create an account to contact contractors.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/') },
        ]
      );
      return;
    }
    if (contractor?.email) Linking.openURL(`mailto:${contractor.email}`);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons key={i} name={i < Math.round(rating) ? 'star' : 'star-outline'}
        size={16} color="#FFB700" />
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!contractor) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><Text style={s.errorText}>Contractor not found</Text></View>
      </SafeAreaView>
    );
  }

  const initials = contractor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
  const languages = contractor.languages || ['English'];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity testID="back-btn" style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.paper} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Contractor Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.profileSection}>
          <View style={s.avatarLg}><Text style={s.avatarText}>{initials}</Text></View>
          <Text style={s.name}>{contractor.name}</Text>
          
          {/* Business Name */}
          {contractor.business_name && (
            <Text style={s.businessName}>{contractor.business_name}</Text>
          )}
          
          <View style={s.typeBadge}>
            <Text style={s.typeText}>{contractor.contractor_type}</Text>
          </View>
          
          {/* License Badge */}
          {contractor.has_license && (
            <View style={s.licenseBadge}>
              <Text style={s.licenseBadgeText}>🪪 License on file</Text>
            </View>
          )}
          
          <View style={s.ratingRow}>
            {renderStars(contractor.rating || 0)}
            <Text style={s.ratingNum}>{contractor.rating || 0}</Text>
            <Text style={s.reviewCount}>({contractor.review_count || 0} reviews)</Text>
          </View>
          
          {/* Languages Badge */}
          <View style={s.languagesBadge}>
            <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
            <Text style={s.languagesText}>
              {languages.join(', ')}
            </Text>
          </View>
          
          <View style={s.locationInfo}>
            <Ionicons name="location" size={16} color={contractor.live_location_enabled ? colors.success : colors.primary} />
            <Text style={s.locationText}>
              {contractor.live_location_enabled ? 'Live Location Active' : 'Recent Location'}
            </Text>
          </View>
          
          {/* Experience */}
          {contractor.experience_years > 0 && (
            <View style={s.experienceBadge}>
              <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
              <Text style={s.experienceText}>{contractor.experience_years}+ years experience</Text>
            </View>
          )}
        </View>

        {contractor.bio ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bioText}>{contractor.bio}</Text>
          </View>
        ) : null}
        
        {/* Trades/Services */}
        {contractor.trades && contractor.trades.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Services Offered</Text>
            <View style={s.tradesContainer}>
              {contractor.trades.map((trade: string, index: number) => (
                <View key={index} style={s.tradeChip}>
                  <Text style={s.tradeChipText}>{trade}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.contactSection}>
          <TouchableOpacity testID="call-btn" style={s.contactBtn} onPress={handleCall}>
            <View style={[s.contactIcon, { backgroundColor: '#E8F9EE' }]}>
              <Ionicons name="call" size={22} color={colors.success} />
            </View>
            <Text style={s.contactLabel}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="email-btn" style={s.contactBtn} onPress={handleEmail}>
            <View style={[s.contactIcon, { backgroundColor: '#E8F0FF' }]}>
              <Ionicons name="mail" size={22} color={colors.info} />
            </View>
            <Text style={s.contactLabel}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="message-btn" style={s.contactBtn} onPress={handleMessage} disabled={messaging}>
            <View style={[s.contactIcon, { backgroundColor: '#FFF8EC' }]}>
              {messaging ? <ActivityIndicator size="small" color={colors.primary} /> :
                <Ionicons name="chatbubble" size={22} color={colors.primary} />}
            </View>
            <Text style={s.contactLabel}>Message</Text>
          </TouchableOpacity>
        </View>
        
        {/* Not logged in banner */}
        {!user && (
          <View style={s.signInBanner}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={s.signInBannerText}>
              <Text 
                style={s.signInLink} 
                onPress={() => router.push('/?mode=login')}
              >
                Sign in
              </Text>
              {' or '}
              <Text 
                style={s.signInLink}
                onPress={() => router.push('/?mode=register')}
              >
                Register
              </Text>
              {' to contact'}
            </Text>
          </View>
        )}

        {portfolio.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Portfolio ({portfolio.length})</Text>
            {portfolio.map(item => (
              <View key={item.id} style={s.portfolioCard}>
                {item.images && item.images.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={s.portfolioImagesScroll}
                  >
                    {item.images.map((img: string, idx: number) => (
                      <Image 
                        key={idx} 
                        source={{ uri: img }} 
                        style={s.portfolioImage} 
                      />
                    ))}
                  </ScrollView>
                )}
                <View style={s.portfolioInfo}>
                  <Text style={s.portfolioTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={s.portfolioDesc} numberOfLines={2}>{item.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length === 0 ? (
            <Text style={s.emptyText}>No reviews yet</Text>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <Text style={s.reviewerName}>{review.client_name}</Text>
                  <View style={s.reviewStars}>{renderStars(review.rating)}</View>
                </View>
                <Text style={s.reviewComment}>{review.comment}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: colors.error },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, backgroundColor: colors.primary,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 17, fontWeight: '600', color: colors.paper },
  scrollContent: { paddingBottom: 100 },
  profileSection: {
    backgroundColor: colors.paper, padding: spacing.l, alignItems: 'center',
    borderBottomLeftRadius: radius.l, borderBottomRightRadius: radius.l,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  avatarLg: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.m,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: colors.paper },
  name: { fontSize: 24, fontWeight: '700', color: colors.secondary },
  businessName: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  typeBadge: {
    backgroundColor: '#FFF8EC', paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: radius.round, marginTop: spacing.xs,
  },
  typeText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  licenseBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
    marginTop: spacing.s,
  },
  licenseBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.s, gap: 4 },
  ratingNum: { fontSize: 16, fontWeight: '700', color: colors.secondary, marginLeft: 4 },
  reviewCount: { fontSize: 14, color: colors.textSecondary },
  languagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
  },
  languagesText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  experienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s,
  },
  experienceText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rate: { fontSize: 20, fontWeight: '700', color: colors.primary, marginTop: spacing.s },
  locationInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.s,
    backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.round,
  },
  locationText: { fontSize: 13, color: colors.textSecondary },
  section: { padding: spacing.m },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.secondary, marginBottom: spacing.m },
  bioText: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  tradesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tradeChip: {
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.round,
  },
  tradeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryDark,
  },
  contactSection: {
    flexDirection: 'row', justifyContent: 'space-around', padding: spacing.m,
    backgroundColor: colors.paper, marginHorizontal: spacing.m, marginTop: spacing.m,
    borderRadius: radius.m,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  contactBtn: { alignItems: 'center', gap: spacing.xs },
  contactIcon: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
  },
  contactLabel: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    marginHorizontal: spacing.m,
    marginTop: spacing.m,
    padding: spacing.m,
    borderRadius: radius.m,
    gap: 8,
    flexWrap: 'wrap',
  },
  signInPromptText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  signInBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.s,
  },
  signInBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.paper,
  },
  // New sign-in banner style (matching the image)
  signInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: radius.m,
    padding: spacing.m,
    marginHorizontal: spacing.m,
    marginTop: spacing.xs,
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  signInBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  signInBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginLeft: spacing.s,
  },
  signInLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  signInBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signInBannerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.paper,
  },
  portfolioCard: {
    backgroundColor: colors.paper,
    borderRadius: radius.s, 
    padding: spacing.m, 
    marginBottom: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  portfolioImagesScroll: {
    marginBottom: spacing.s,
  },
  portfolioImage: {
    width: 140,
    height: 100,
    borderRadius: radius.s,
    marginRight: spacing.s,
  },
  portfolioInfo: { flex: 1 },
  portfolioTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  portfolioDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  reviewCard: {
    backgroundColor: colors.paper, borderRadius: radius.s, padding: spacing.m,
    marginBottom: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  reviewerName: { fontSize: 15, fontWeight: '600', color: colors.secondary },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  emptyText: { fontSize: 14, color: colors.textDisabled, textAlign: 'center' },
});
