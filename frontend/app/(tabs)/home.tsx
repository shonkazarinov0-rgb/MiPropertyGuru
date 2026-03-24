import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform, Dimensions,
  Image, Linking, Animated, Modal,
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
  const [showFullMap, setShowFullMap] = useState(false);
  
  // FAB Menu State - Click to open
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.8)).current;
  
  // Dynamic engagement stat
  const [engagementStat, setEngagementStat] = useState({ count: 7, type: 'Electricians' });

  // Rotate engagement stats every 30 seconds
  useEffect(() => {
    const updateEngagement = () => {
      const types = ['Electricians', 'Plumbers', 'Handymen', 'Painters', 'Carpenters', 'Roofers', 'HVAC Techs'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      const randomCount = Math.floor(Math.random() * 12) + 3; // 3-14
      setEngagementStat({ count: randomCount, type: randomType });
    };
    
    updateEngagement();
    const interval = setInterval(updateEngagement, 30000);
    return () => clearInterval(interval);
  }, []);

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
    }
  }, [category, userLoc]);

  const fetchContractors = async () => {
    // Only fetch contractors if user is in client mode or is a client
    if (user?.role === 'contractor' && user?.currentMode !== 'client') {
      setContractors([]);
      setLoading(false);
      return;
    }
    
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (userLoc) {
        params.append('lat', String(userLoc.lat));
        params.append('lng', String(userLoc.lng));
      }
      const res = await api.get(`/contractors?${params.toString()}`);
      // Filter out the current user so they don't see themselves
      const filteredContractors = (res.contractors || []).filter(
        (contractor: any) => contractor.id !== user?.id
      );
      setContractors(filteredContractors);
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
  }, [category, userLoc]);

  const getDailyJobCount = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const base = 85;
    const variation = (dayOfYear * 7) % 35;
    return base + variation;
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

  // Service Menu Functions
  const toggleServiceMenu = () => {
    if (showServiceMenu) {
      closeServiceMenu();
    } else {
      openServiceMenu();
    }
  };

  const openServiceMenu = () => {
    setShowServiceMenu(true);
    Animated.parallel([
      Animated.spring(menuOpacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(menuScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const closeServiceMenu = () => {
    Animated.parallel([
      Animated.timing(menuOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(menuScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowServiceMenu(false);
    });
  };

  const selectCategory = (categoryName: string) => {
    setCategory(categoryName);
    closeServiceMenu();
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

  // Check if user is contractor in contractor mode
  const isContractorMode = user?.role === 'contractor' && user?.currentMode !== 'client';

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
                  <Text style={{ fontSize: 16 }}>💼</Text>
                </View>
                <Text style={styles.statNumber}>{engagementStat.count}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>{engagementStat.type} hired</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Show message if contractor is in contractor mode */}
        {isContractorMode ? (
          <View style={styles.contractorModeMessage}>
            <Ionicons name="information-circle" size={48} color={colors.primary} />
            <Text style={styles.contractorModeTitle}>You're in Contractor Mode</Text>
            <Text style={styles.contractorModeText}>
              Switch to Client Mode to browse and hire contractors for your own projects.
            </Text>
            <TouchableOpacity 
              style={styles.switchModeBtn}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.switchModeBtnText}>Switch to Client Mode</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
              </View>
              <FlatList
                horizontal
                data={[{ name: 'All', icon: '🔍', color: '#666' }, ...CATEGORY_DATA]}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      item.name === 'All' ? styles.allCategoryChip : styles.categoryChip, 
                      category === item.name && styles.categoryChipActive
                    ]}
                    onPress={() => setCategory(item.name)}
                  >
                    {item.name === 'All' ? (
                      <Text style={[styles.allCategoryText, category === 'All' && styles.categoryTextActive]}>All</Text>
                    ) : (
                      <>
                        <Text style={styles.categoryIcon}>{item.icon}</Text>
                        <Text style={[styles.categoryText, category === item.name && styles.categoryTextActive]}>
                          {item.name}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
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
          </>
        )}
      </ScrollView>

      {/* Service Menu Modal */}
      <Modal
        visible={showServiceMenu}
        transparent
        animationType="none"
        onRequestClose={closeServiceMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeServiceMenu}
        >
          <Animated.View 
            style={[
              styles.serviceMenuContainer,
              { 
                opacity: menuOpacity,
                transform: [{ scale: menuScale }]
              }
            ]}
          >
            <View style={styles.serviceMenuHeader}>
              <Text style={styles.serviceMenuTitle}>Select a Service</Text>
              <TouchableOpacity onPress={closeServiceMenu}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.serviceMenuList} showsVerticalScrollIndicator={false}>
              {CATEGORY_DATA.map((cat) => (
                <TouchableOpacity 
                  key={cat.name}
                  style={[
                    styles.serviceMenuItem,
                    category === cat.name && styles.serviceMenuItemSelected
                  ]}
                  onPress={() => selectCategory(cat.name)}
                >
                  <Text style={styles.serviceMenuIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.serviceMenuText,
                    category === cat.name && styles.serviceMenuTextSelected
                  ]}>{cat.name}</Text>
                  {category === cat.name && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Action Button - Click to open */}
      {!isContractorMode && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={toggleServiceMenu}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF6A00', '#FF8C33']}
            style={styles.fabGradient}
          >
            <Ionicons name={showServiceMenu ? "close" : "flash"} size={28} color={colors.paper} />
          </LinearGradient>
        </TouchableOpacity>
      )}
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
    textAlign: 'center',
  },
  contractorModeMessage: {
    margin: 20,
    padding: 30,
    backgroundColor: colors.paper,
    borderRadius: 16,
    alignItems: 'center',
  },
  contractorModeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  contractorModeText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  switchModeBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  switchModeBtnText: {
    color: colors.paper,
    fontSize: 14,
    fontWeight: '600',
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
  allCategoryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allCategoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
  // Service Menu Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  serviceMenuContainer: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
    paddingBottom: 40,
  },
  serviceMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceMenuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  serviceMenuList: {
    paddingHorizontal: 16,
  },
  serviceMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
  },
  serviceMenuItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  serviceMenuIcon: {
    fontSize: 24,
  },
  serviceMenuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  serviceMenuTextSelected: {
    color: colors.primary,
    fontWeight: '700',
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
});
