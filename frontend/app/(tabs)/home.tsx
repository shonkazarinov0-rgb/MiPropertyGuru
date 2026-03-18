import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { colors, spacing, radius } from '../../src/theme';

const CATEGORIES = ['All', 'Electrician', 'Plumber', 'Handyman', 'Carpenter', 'Painter', 'Roofer', 'HVAC Technician', 'General Contractor'];
const CATEGORY_ICONS: Record<string, string> = {
  All: 'apps', Electrician: 'flash', Plumber: 'water', Handyman: 'hammer',
  Carpenter: 'construct', Painter: 'color-palette', Roofer: 'home',
  'HVAC Technician': 'snow', 'General Contractor': 'build',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contractors, setContractors] = useState<any[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } else {
          setUserLoc({ lat: 40.7128, lng: -74.0060 });
        }
      } catch {
        setUserLoc({ lat: 40.7128, lng: -74.0060 });
      }
    })();
  }, []);

  useEffect(() => { if (userLoc) fetchContractors(); }, [category, userLoc]);

  const fetchContractors = async () => {
    try {
      const params = new URLSearchParams();
      if (category !== 'All') params.append('category', category);
      if (userLoc) { params.append('lat', String(userLoc.lat)); params.append('lng', String(userLoc.lng)); }
      const res = await api.get(`/contractors?${params.toString()}`);
      setContractors(res.contractors || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); fetchContractors(); }, [category, userLoc]);

  const filtered = contractors.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contractor_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const getMapHTML = () => {
    if (!userLoc) return '';
    const markers = filtered.slice(0, 20).map(c => {
      let lat = userLoc.lat, lng = userLoc.lng;
      if (c.live_location_enabled && c.current_location) {
        lat = c.current_location.lat; lng = c.current_location.lng;
      } else if (c.work_locations && c.work_locations.length > 0) {
        lat = c.work_locations[0].lat; lng = c.work_locations[0].lng;
      }
      return { id: c.id, name: c.name, type: c.contractor_type, lat, lng, live: c.live_location_enabled };
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
L.circleMarker([${userLoc.lat},${userLoc.lng}],{radius:8,fillColor:'#007AFF',color:'#fff',weight:3,fillOpacity:1}).addTo(map).bindPopup('<b>You</b>');
var ms=${mJSON};
ms.forEach(function(m){
var col=m.live?'#34C759':'#FF9500';
var icon=L.divIcon({className:'',html:'<div style="background:'+col+';color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);border:2px solid #fff">'+m.name.split(' ')[0]+'</div>',iconSize:[0,0],iconAnchor:[0,0]});
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
    return (
      <TouchableOpacity testID={`contractor-card-${item.id}`} style={s.card}
        onPress={() => router.push(`/contractor/${item.id}`)}>
        <View style={s.cardRow}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <View style={s.cardInfo}>
            <View style={s.cardTopRow}>
              <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
              {item.live_location_enabled && <View style={s.liveDot}><Text style={s.liveText}>LIVE</Text></View>}
              {!item.live_location_enabled && <View style={s.recentDot}><Text style={s.recentText}>RECENT</Text></View>}
            </View>
            <View style={s.typeBadge}>
              <Ionicons name={(CATEGORY_ICONS[item.contractor_type] || 'construct') as any} size={13} color={colors.primary} />
              <Text style={s.typeText}>{item.contractor_type}</Text>
            </View>
            <View style={s.cardBottom}>
              <View style={s.ratingRow}>
                <Ionicons name="star" size={14} color="#FFB700" />
                <Text style={s.ratingText}>{item.rating || 0}</Text>
                <Text style={s.reviewCount}>({item.review_count || 0})</Text>
              </View>
              <Text style={s.rateText}>${item.hourly_rate}/hr</Text>
              {item.distance && item.distance < 999 && (
                <Text style={s.distText}>{item.distance} mi</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>miPropertyGuru</Text>
          <Text style={s.headerSub}>Find contractors near you in real time</Text>
        </View>
        <TouchableOpacity testID="toggle-map-btn" style={s.mapToggle} onPress={() => setShowMap(!showMap)}>
          <Ionicons name={showMap ? 'list' : 'map'} size={22} color={colors.paper} />
        </TouchableOpacity>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput testID="search-input" style={s.searchInput} placeholder="Search contractors..."
          placeholderTextColor={colors.placeholder} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catContent}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} testID={`cat-${cat.toLowerCase().replace(/\s/g, '-')}`}
            style={[s.catChip, category === cat && s.catChipActive]} onPress={() => setCategory(cat)}>
            <Ionicons name={(CATEGORY_ICONS[cat] || 'construct') as any} size={16}
              color={category === cat ? colors.paper : colors.textSecondary} />
            <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showMap && userLoc && filtered.length > 0 && Platform.OS !== 'web' && (
        <View style={s.mapContainer}>
          <WebView source={{ html: getMapHTML() }} style={s.mapView}
            onMessage={handleMapMessage} scrollEnabled={false} />
        </View>
      )}
      {showMap && Platform.OS === 'web' && (
        <View style={s.mapPlaceholder}>
          <Ionicons name="map" size={28} color={colors.primary} />
          <Text style={s.mapPlaceholderText}>Map view available on mobile app</Text>
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderContractorCard}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.center}><Text style={s.emptyText}>No contractors found</Text></View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.m, paddingVertical: spacing.m,
    backgroundColor: colors.primary,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.paper },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  mapToggle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper,
    marginHorizontal: spacing.m, marginTop: spacing.m, paddingHorizontal: spacing.m,
    borderRadius: radius.m, gap: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  catScroll: { maxHeight: 48, marginTop: spacing.s },
  catContent: { paddingHorizontal: spacing.m, gap: spacing.s },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.round, backgroundColor: colors.paper, gap: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catTextActive: { color: colors.paper },
  mapContainer: {
    height: 220, marginHorizontal: spacing.m, marginTop: spacing.m,
    borderRadius: radius.m, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  mapView: { flex: 1 },
  mapPlaceholder: {
    height: 80, marginHorizontal: spacing.m, marginTop: spacing.m,
    borderRadius: radius.m, backgroundColor: colors.paper,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.s,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  mapPlaceholderText: { fontSize: 14, color: colors.textSecondary },
  listContent: { padding: spacing.m, paddingBottom: 100 },
  card: {
    backgroundColor: colors.paper, borderRadius: radius.m, padding: spacing.m,
    marginBottom: spacing.s,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  cardRow: { flexDirection: 'row', gap: spacing.m },
  avatar: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.paper },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 17, fontWeight: '600', color: colors.secondary, flex: 1 },
  liveDot: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F9EE',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.round,
  },
  liveText: { fontSize: 10, fontWeight: '700', color: colors.success },
  recentDot: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8EC',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.round,
  },
  recentText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: '#FFF8EC', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.round,
  },
  typeText: { fontSize: 12, fontWeight: '500', color: colors.primaryDark },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: spacing.m },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  reviewCount: { fontSize: 12, color: colors.textSecondary },
  rateText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  distText: { fontSize: 12, color: colors.textSecondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 16, color: colors.textSecondary },
});
