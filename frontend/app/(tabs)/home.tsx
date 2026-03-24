import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform, Dimensions,
  Image, Linking, Animated, PanResponder, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';

const { width, height } = Dimensions.get('window');

// Design System Colors
const colors = {
  primary: '#FF6A00',
  primaryDark: '#E55A00',
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

// Extended contractor categories with emojis
const CATEGORY_DATA = [
  { name: 'Electrician', icon: '⚡', color: '#FFC107' },
  { name: 'Plumber', icon: '🔧', color: '#2196F3' },
  { name: 'Handyman', icon: '🔨', color: '#795548' },
  { name: 'HVAC Technician', icon: '❄️', color: '#00BCD4' },
  { name: 'Carpenter', icon: '🪚', color: '#8D6E63' },
  { name: 'Painter', icon: '🎨', color: '#9C27B0' },
  { name: 'Roofer', icon: '🏠', color: '#607D8B' },
  { name: 'General Contractor', icon: '👷', color: '#FF9800' },
  { name: 'Tiler', icon: '🔲', color: '#3F51B5' },
  { name: 'Landscaper', icon: '🌳', color: '#4CAF50' },
  { name: 'Mason', icon: '🧱', color: '#BF360C' },
  { name: 'Welder', icon: '🔥', color: '#FF5722' },
  { name: 'Glazier', icon: '🪟', color: '#81D4FA' },
  { name: 'Demolition', icon: '💥', color: '#D32F2F' },
  { name: 'Drywall', icon: '🏗️', color: '#9E9E9E' },
  { name: 'Flooring', icon: '🪵', color: '#6D4C41' },
  { name: 'Insulation', icon: '🧤', color: '#E91E63' },
  { name: 'Concrete', icon: '🪨', color: '#757575' },
  { name: 'Fence', icon: '🚧', color: '#8BC34A' },
  { name: 'Deck Builder', icon: '🌲', color: '#33691E' },
  { name: 'Cabinet Maker', icon: '🪑', color: '#A1887F' },
  { name: 'Window Installer', icon: '🖼️', color: '#42A5F5' },
  { name: 'Siding', icon: '🏘️', color: '#78909C' },
  { name: 'Garage Door', icon: '🚗', color: '#546E7A' },
  { name: 'Pool Service', icon: '🏊', color: '#00ACC1' },
  { name: 'Locksmith', icon: '🔐', color: '#FFC107' },
  { name: 'Appliance Repair', icon: '🔌', color: '#673AB7' },
  { name: 'Pest Control', icon: '🐜', color: '#4E342E' },
  { name: 'Cleaning Service', icon: '🧹', color: '#26A69A' },
  { name: 'Moving Service', icon: '📦', color: '#FF7043' },
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
  
  // Radial Menu State
  const [showRadialMenu, setShowRadialMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const fabScale = useRef(new Animated.Value(1)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
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

  const getDailyJobCount = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const base = 85;
    const variation = (dayOfYear * 7) % 35;
    return base + variation;
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

  // Radial Menu Functions
  const openRadialMenu = () => {
    setShowRadialMenu(true);
    setSelectedIndex(-1);
    Animated.parallel([
      Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(menuOpacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(menuScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const closeRadialMenu = () => {
    Animated.parallel([
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(menuOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(menuScale, { toValue: 0.5, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowRadialMenu(false);
      if (selectedIndex >= 0 && selectedIndex < CATEGORY_DATA.length) {
        const selected = CATEGORY_DATA[selectedIndex];
        setCategory(selected.name);
      }
    });
  };

  const handlePanMove = (gestureY: number) => {
    // Map Y position to category index (inverted because higher Y = lower on screen)
    const menuHeight = Math.min(CATEGORY_DATA.length * 50, height * 0.6);
    const startY = height - 120 - menuHeight;
    const relativeY = gestureY - startY;
    const index = Math.floor(relativeY / 50);
    if (index >= 0 && index < CATEGORY_DATA.length) {
      setSelectedIndex(index);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        openRadialMenu();
      },
      onPanResponderMove: (_, gestureState) => {
        handlePanMove(gestureState.moveY);
      },
      onPanResponderRelease: () => {
        closeRadialMenu();
      },
    })
  ).current;

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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Enhanced Header */}
        <LinearGradient
          colors={['#FF6A00', '#FF8C33', '#FFA559']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage}
              />
              <View>
                <Text style={styles.appName}>MiPropertyGuru</Text>
                <Text style={styles.tagline}>Your home, our experts</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Ionicons name="notifications-outline" size={24} color={colors.paper} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Your Location</Text>
                <Text style={styles.locationValue}>{locationName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
            
            <View style={styles.statsCards}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: colors.greenLight }]}>
                  <View style={styles.pulsingDot} />
                </View>
                <Text style={styles.statNumber}>{onlineCount}</Text>
                <Text style={styles.statLabel}>Online Now</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: colors.primaryLight }]}>
                  <Text style={{ fontSize: 16 }}>📋</Text>
                </View>
                <Text style={styles.statNumber}>{getDailyJobCount()}</Text>
                <Text style={styles.statLabel}>Jobs Today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                </View>
                <Text style={styles.statNumber}>4.8</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse Categories</Text>
            <TouchableOpacity onPress={() => setCategory('All')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={CATEGORY_DATA.slice(0, 12)}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.name}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Available Contractors */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {category !== 'All' ? `${category}s` : 'Available Contractors'}
            </Text>
            <Text style={styles.resultCount}>{contractors.length} found</Text>
          </View>
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

      {/* Radial Menu Overlay */}
      {showRadialMenu && (
        <Animated.View 
          style={[
            styles.radialMenuOverlay,
            { opacity: menuOpacity }
          ]}
        >
          <Animated.View 
            style={[
              styles.radialMenuContainer,
              { transform: [{ scale: menuScale }] }
            ]}
          >
            <Text style={styles.radialMenuTitle}>Select a Service</Text>
            <ScrollView style={styles.radialMenuList} showsVerticalScrollIndicator={false}>
              {CATEGORY_DATA.map((cat, index) => (
                <View 
                  key={cat.name}
                  style={[
                    styles.radialMenuItem,
                    selectedIndex === index && styles.radialMenuItemSelected
                  ]}
                >
                  <Text style={styles.radialMenuIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.radialMenuText,
                    selectedIndex === index && styles.radialMenuTextSelected
                  ]}>{cat.name}</Text>
                </View>
              ))}
            </ScrollView>
            <Text style={styles.radialMenuHint}>Slide up/down to select, release to confirm</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Floating Action Button */}
      <Animated.View 
        style={[
          styles.fab,
          { transform: [{ scale: fabScale }] }
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#FF6A00', '#FF8C33']}
          style={styles.fabGradient}
        >
          <Ionicons name="flash" size={28} color={colors.paper} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.fabLabel}>Hold for services</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.paper,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    gap: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
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
  // Radial Menu Styles
  radialMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: 120,
  },
  radialMenuContainer: {
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 16,
    width: width * 0.7,
    maxHeight: height * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  radialMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  radialMenuList: {
    maxHeight: height * 0.35,
  },
  radialMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  radialMenuItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  radialMenuIcon: {
    fontSize: 24,
  },
  radialMenuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  radialMenuTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  radialMenuHint: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabLabel: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
