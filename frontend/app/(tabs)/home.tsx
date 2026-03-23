import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform, Dimensions,
  Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';

const { width } = Dimensions.get('window');

// Design System Colors
const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  border: '#E5E7EB',
};

const CATEGORY_DATA = [
  { name: 'Electrician', icon: '⚡' },
  { name: 'Plumber', icon: '💧' },
  { name: 'Handyman', icon: '🔨' },
  { name: 'HVAC Technician', icon: '❄️' },
  { name: 'Carpenter', icon: '🪚' },
  { name: 'Painter', icon: '🎨' },
  { name: 'Roofer', icon: '🏠' },
  { name: 'General Contractor', icon: '👷' },
  { name: 'Tiler', icon: '🔲' },
  { name: 'Landscaper', icon: '🌳' },
];

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contractors, setContractors] = useState<any[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [onlineCount, setOnlineCount] = useState(0);
  const [homeStats, setHomeStats] = useState<any>(null);
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          // Get location name
          try {
            const [address] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (address) {
              setLocationName(`${address.city || address.district || 'Your area'}`);
            }
          } catch {
            setLocationName('Your area');
          }
        } else {
          setUserLoc({ lat: 40.7128, lng: -74.0060 });
          setLocationName('New York');
        }
      } catch {
        setUserLoc({ lat: 40.7128, lng: -74.0060 });
        setLocationName('New York');
      }
    })();
  }, []);

  useEffect(() => {
    if (userLoc) {
      fetchContractors();
      fetchHomeStats();
    }
  }, [category, userLoc]);

  const fetchHomeStats = async () => {
    try {
      const params = userLoc ? `?lat=${userLoc.lat}&lng=${userLoc.lng}` : '';
      const res = await api.get(`/home/stats${params}`);
      setHomeStats(res);
      setOnlineCount(res.contractors_available || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchContractors = async () => {
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (userLoc) {
        params.append('lat', String(userLoc.lat));
        params.append('lng', String(userLoc.lng));
      }
      const res = await api.get(`/contractors?${params.toString()}`);
      setContractors(res.contractors || []);
      if (res.online_count !== undefined) setOnlineCount(res.online_count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContractors();
    fetchHomeStats();
  }, [category, userLoc]);

  const handleFindHelpNow = () => {
    // Navigate to contractor list with online filter
    router.push('/(tabs)/home');
  };

  const handleGetQuotes = () => {
    if (!user) {
      router.push('/');
      return;
    }
    router.push('/post-job');
  };

  const handlePostJob = () => {
    if (!user) {
      router.push('/');
      return;
    }
    router.push('/post-job');
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (contractorId: string) => {
    if (!user) {
      router.push('/');
      return;
    }
    router.push(`/chat/${contractorId}`);
  };

  const getMapHTML = () => {
    if (!userLoc) return '';
    const markers = contractors.slice(0, 15).map(c => {
      let lat = userLoc.lat, lng = userLoc.lng;
      if (c.is_online && c.current_location) {
        lat = c.current_location.lat;
        lng = c.current_location.lng;
      } else if (c.work_locations && c.work_locations.length > 0) {
        lat = c.work_locations[0].lat;
        lng = c.work_locations[0].lng;
      }
      return { id: c.id, name: c.name, type: c.contractor_type, lat, lng, online: c.is_online };
    });
    const mJSON = JSON.stringify(markers);
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh}</style></head>
<body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false}).setView([${userLoc.lat},${userLoc.lng}],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:''}).addTo(map);
L.circleMarker([${userLoc.lat},${userLoc.lng}],{radius:10,fillColor:'#007AFF',color:'#fff',weight:3,fillOpacity:1}).addTo(map).bindPopup('<b>You</b>');
var ms=${mJSON};
ms.forEach(function(m){
var col=m.online?'#22C55E':'#FF6A00';
var icon=L.divIcon({className:'',html:'<div style="background:'+col+';width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>',iconSize:[12,12],iconAnchor:[6,6]});
L.marker([m.lat,m.lng],{icon:icon}).addTo(map).on('click',function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'tap',id:m.id}))});
});
</script></body></html>`;
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap' && data.id) router.push(`/contractor/${data.id}`);
    } catch {}
  };

  const renderContractorCard = ({ item }: { item: any }) => {
    const initials = item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const distanceKm = item.distance_km || item.distance;
    
    return (
      <TouchableOpacity style={styles.contractorCard} onPress={() => router.push(`/contractor/${item.id}`)}>
        <View style={styles.cardHeader}>
          {item.profile_photo ? (
            <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.contractorName} numberOfLines={1}>{item.name}</Text>
              {item.is_online && (
                <View style={styles.onlineBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.onlineText}>Available now</Text>
                </View>
              )}
            </View>
            <Text style={styles.jobTitle}>{item.contractor_type}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.statText}>{item.rating || 0}</Text>
                <Text style={styles.statSubtext}>({item.review_count || 0})</Text>
              </View>
              {distanceKm && distanceKm < 999 && (
                <View style={styles.statItem}>
                  <Ionicons name="location" size={14} color={colors.textSecondary} />
                  <Text style={styles.statText}>{distanceKm} km</Text>
                </View>
              )}
              {item.avg_response_time && (
                <View style={styles.statItem}>
                  <Ionicons name="flash" size={14} color={colors.primary} />
                  <Text style={styles.statText}>~{item.avg_response_time} min</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        )}
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.messageBtn} 
            onPress={(e) => { e.stopPropagation(); handleMessage(item.id); }}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          {item.phone && (
            <TouchableOpacity 
              style={styles.callBtn}
              onPress={(e) => { e.stopPropagation(); handleCall(item.phone); }}
            >
              <Ionicons name="call" size={18} color={colors.paper} />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }: { item: typeof CATEGORY_DATA[0] }) => (
    <TouchableOpacity 
      style={[styles.categoryChip, category === item.name && styles.categoryChipActive]}
      onPress={() => setCategory(category === item.name ? 'All' : item.name)}
    >
      <Text style={styles.categoryIcon}>{item.icon}</Text>
      <Text style={[styles.categoryText, category === item.name && styles.categoryTextActive]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>miPropertyGuru</Text>
          <Text style={styles.tagline}>Find help near you in minutes</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.paper} />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
          <View style={styles.availableBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.availableText}>{onlineCount} contractors available now</Text>
          </View>
        </View>

        {/* Mini Map */}
        {userLoc && contractors.length > 0 && Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.mapPreview} onPress={() => setShowFullMap(true)}>
            <WebView 
              source={{ html: getMapHTML() }} 
              style={styles.mapWebView}
              onMessage={handleMapMessage}
              scrollEnabled={false}
              pointerEvents="none"
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>Tap to expand map</Text>
            </View>
          </TouchableOpacity>
        )}
        {Platform.OS === 'web' && (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={32} color={colors.primary} />
            <Text style={styles.mapPlaceholderText}>Map view on mobile app</Text>
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            horizontal
            data={CATEGORY_DATA}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Social Proof */}
        {homeStats && (
          <View style={styles.socialProof}>
            <View style={styles.proofItem}>
              <Text style={styles.proofIcon}>🔥</Text>
              <Text style={styles.proofText}>Popular right now</Text>
            </View>
            <View style={styles.proofItem}>
              <Text style={styles.proofIcon}>📋</Text>
              <Text style={styles.proofText}>{homeStats.jobs_posted_today || 0} jobs posted today</Text>
            </View>
          </View>
        )}

        {/* Available Contractors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Contractors</Text>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : contractors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No contractors found</Text>
              <Text style={styles.emptySubtext}>Try a different category or location</Text>
            </View>
          ) : (
            contractors.slice(0, 10).map(contractor => (
              <View key={contractor.id}>
                {renderContractorCard({ item: contractor })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky Find Help Button */}
      <TouchableOpacity style={styles.postJobBtn} onPress={handlePostJob}>
        <Ionicons name="search" size={24} color={colors.paper} />
        <Text style={styles.postJobText}>Get Help Now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.paper,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  availableText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.paper,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: -12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  mapPreview: {
    height: 160,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  mapWebView: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: 12,
    color: colors.paper,
    fontWeight: '500',
  },
  mapPlaceholder: {
    height: 100,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: colors.paper,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesList: {
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  categoryTextActive: {
    color: colors.primary,
  },
  socialProof: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 16,
  },
  proofItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  proofIcon: {
    fontSize: 14,
  },
  proofText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  contractorCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.paper,
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractorName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.green,
  },
  jobTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  statSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bio: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 6,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 6,
  },
  callBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.paper,
  },
  loader: {
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  postJobBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  postJobText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
});
