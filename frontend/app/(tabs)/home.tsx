import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform, Dimensions,
  Image, Linking, Animated, Modal, Alert, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModeToggle from '../../src/components/ModeToggle';
import NativeMapView from '../../src/components/MapView';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#FF6A00',
  primaryDark: '#E55A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  red: '#EF4444',
  border: '#E5E7EB',
};

const CATEGORY_DATA = [
  { name: 'Aluminum Capping', iconName: 'business-outline', color: '#90A4AE' },
  { name: 'Appliance Repair', iconName: 'hardware-chip-outline', color: '#673AB7' },
  { name: 'Blinds & Curtains', iconName: 'grid-outline', color: '#7E57C2' },
  { name: 'Cabinet Maker', iconName: 'cube-outline', color: '#A1887F' },
  { name: 'Carpenter', iconName: 'construct-outline', color: '#8D6E63' },
  { name: 'Caulker', iconName: 'link-outline', color: '#7E57C2' },
  { name: 'Cleaning', iconName: 'brush-outline', color: '#26A69A' },
  { name: 'Concrete', iconName: 'layers-outline', color: '#757575' },
  { name: 'Deck Builder', iconName: 'leaf-outline', color: '#33691E' },
  { name: 'Demolition', iconName: 'flame-outline', color: '#D32F2F' },
  { name: 'Door Installer', iconName: 'exit-outline', color: '#5D4037' },
  { name: 'Drywall', iconName: 'hammer-outline', color: '#9E9E9E' },
  { name: 'Electrician', iconName: 'flash-outline', color: '#FFC107' },
  { name: 'Fence', iconName: 'warning-outline', color: '#8BC34A' },
  { name: 'Flooring', iconName: 'home-outline', color: '#6D4C41' },
  { name: 'Garage Door', iconName: 'car-outline', color: '#546E7A' },
  { name: 'General Contractor', iconName: 'person-outline', color: '#FF9800' },
  { name: 'Glazier', iconName: 'grid-outline', color: '#81D4FA' },
  { name: 'Handyman', iconName: 'hammer-outline', color: '#795548' },
  { name: 'HVAC Technician', iconName: 'snow-outline', color: '#00BCD4' },
  { name: 'Insulation', iconName: 'shield-outline', color: '#E91E63' },
  { name: 'Landscaper', iconName: 'leaf-outline', color: '#4CAF50' },
  { name: 'Locksmith', iconName: 'lock-closed-outline', color: '#FFC107' },
  { name: 'Mason', iconName: 'square-outline', color: '#BF360C' },
  { name: 'Moving', iconName: 'cube-outline', color: '#FF7043' },
  { name: 'Painter', iconName: 'color-palette-outline', color: '#9C27B0' },
  { name: 'Plumber', iconName: 'settings-outline', color: '#2196F3' },
  { name: 'Pool Service', iconName: 'water-outline', color: '#00ACC1' },
  { name: 'Roofer', iconName: 'home-outline', color: '#607D8B' },
  { name: 'Siding', iconName: 'business-outline', color: '#78909C' },
  { name: 'Tiler', iconName: 'grid-outline', color: '#3F51B5' },
  { name: 'Welder', iconName: 'flame-outline', color: '#FF5722' },
  { name: 'Window Installer', iconName: 'image-outline', color: '#42A5F5' },
];

const SEARCH_KEYWORDS: { [key: string]: string } = {
  'lamp': 'Electrician', 'light': 'Electrician', 'lighting': 'Electrician', 'wire': 'Electrician',
  'wiring': 'Electrician', 'outlet': 'Electrician', 'socket': 'Electrician', 'switch': 'Electrician',
  'electrical': 'Electrician', 'power': 'Electrician', 'circuit': 'Electrician', 'fuse': 'Electrician',
  'breaker': 'Electrician', 'fan': 'Electrician', 'ceiling fan': 'Electrician',
  'pipe': 'Plumber', 'pipes': 'Plumber', 'drain': 'Plumber', 'toilet': 'Plumber', 'sink': 'Plumber',
  'faucet': 'Plumber', 'water': 'Plumber', 'leak': 'Plumber', 'leaking': 'Plumber', 'tap': 'Plumber',
  'bathroom': 'Plumber', 'shower': 'Plumber', 'bathtub': 'Plumber', 'sewer': 'Plumber',
  'ac': 'HVAC Technician', 'air conditioning': 'HVAC Technician', 'heating': 'HVAC Technician',
  'furnace': 'HVAC Technician', 'heat': 'HVAC Technician', 'cooling': 'HVAC Technician',
  'ventilation': 'HVAC Technician', 'thermostat': 'HVAC Technician', 'duct': 'HVAC Technician',
  'wood': 'Carpenter', 'cabinet': 'Cabinet Maker', 'shelf': 'Carpenter', 'shelves': 'Carpenter',
  'furniture': 'Carpenter', 'closet': 'Carpenter', 'trim': 'Carpenter', 'molding': 'Carpenter',
  'paint': 'Painter', 'painting': 'Painter', 'wall': 'Painter', 'stain': 'Painter',
  'roof': 'Roofer', 'roofing': 'Roofer', 'shingle': 'Roofer', 'gutter': 'Roofer', 'eaves': 'Roofer',
  'lawn': 'Landscaper', 'garden': 'Landscaper', 'tree': 'Landscaper', 'grass': 'Landscaper',
  'yard': 'Landscaper', 'hedge': 'Landscaper', 'bush': 'Landscaper', 'plant': 'Landscaper',
  'tile': 'Tiler', 'tiles': 'Tiler', 'backsplash': 'Tiler', 'grout': 'Tiler',
  'floor': 'Flooring', 'hardwood': 'Flooring', 'laminate': 'Flooring', 'vinyl': 'Flooring', 'carpet': 'Flooring',
  'door': 'Door Installer', 'doors': 'Door Installer', 'entry': 'Door Installer', 'entrance': 'Door Installer',
  'window': 'Window Installer', 'windows': 'Window Installer', 'glass': 'Glazier',
  'lock': 'Locksmith', 'key': 'Locksmith', 'deadbolt': 'Locksmith', 'security': 'Locksmith',
  'fix': 'Handyman', 'repair': 'Handyman', 'install': 'Handyman', 'mount': 'Handyman', 'hang': 'Handyman',
  'drywall': 'Drywall', 'sheetrock': 'Drywall', 'plaster': 'Drywall', 'hole': 'Drywall',
  'concrete': 'Concrete', 'cement': 'Concrete', 'driveway': 'Concrete', 'sidewalk': 'Concrete', 'patio': 'Concrete',
  'fence': 'Fence', 'fencing': 'Fence', 'gate': 'Fence',
  'deck': 'Deck Builder', 'porch': 'Deck Builder', 'pergola': 'Deck Builder',
  'pool': 'Pool Service', 'spa': 'Pool Service', 'hot tub': 'Pool Service',
  'weld': 'Welder', 'welding': 'Welder', 'metal': 'Welder', 'iron': 'Welder', 'steel': 'Welder',
  'brick': 'Mason', 'stone': 'Mason', 'masonry': 'Mason', 'chimney': 'Mason', 'fireplace': 'Mason',
  'appliance': 'Appliance Repair', 'washer': 'Appliance Repair', 'dryer': 'Appliance Repair',
  'refrigerator': 'Appliance Repair', 'fridge': 'Appliance Repair', 'dishwasher': 'Appliance Repair',
  'stove': 'Appliance Repair', 'oven': 'Appliance Repair', 'microwave': 'Appliance Repair',
  'caulk': 'Caulker', 'seal': 'Caulker', 'sealing': 'Caulker', 'weatherproof': 'Caulker',
  'aluminum': 'Aluminum Capping', 'capping': 'Aluminum Capping', 'soffit': 'Aluminum Capping', 'fascia': 'Aluminum Capping',
  'siding': 'Siding', 'exterior': 'Siding',
  'garage': 'Garage Door', 'garage door': 'Garage Door',
  'insulation': 'Insulation', 'insulate': 'Insulation', 'attic': 'Insulation',
  'demolition': 'Demolition', 'demo': 'Demolition', 'tear down': 'Demolition', 'remove': 'Demolition',
};

const RATING_OPTIONS = [
  { value: 0, label: '⭐ All Ratings' },
  { value: 1, label: '⭐ 1 Stars' },
  { value: 2, label: '⭐ 2 Stars' },
  { value: 3, label: '⭐ 3 Stars' },
  { value: 4, label: '⭐ 4 Stars' },
  { value: 5, label: '⭐ 5 Stars' },
];

const LANGUAGE_OPTIONS = [
  'Arabic', 'Bengali', 'Chinese Cantonese', 'Chinese Mandarin',
  'English', 'French', 'German', 'Greek', 'Gujarati', 'Hindi',
  'Italian', 'Japanese', 'Korean', 'Pashto', 'Persian Farsi',
  'Polish', 'Portuguese', 'Punjabi', 'Russian', 'Spanish',
  'Tagalog', 'Tamil', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
];

// ─── Leaflet map HTML generator ─────────────────────────────────────────────
function getMapHTML(
    userLoc: { lat: number; lng: number },
    radiusKm: number,
    sortedContractors: any[]
): string {
  const onlineContractors = sortedContractors.filter(
      (c) => c.isonline && c.currentlocation
  );
  const markers = onlineContractors.slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.contractor_type,
    lat: c.currentlocation.lat,
    lng: c.currentlocation.lng,
    online: true,
  }));

  const mJSON = JSON.stringify(markers);
  const radiusMeters = radiusKm > 200 ? 200000 : radiusKm * 1000;

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  #map { width: 100vw; height: 100vh; }
  .leaflet-control-attribution { display: none !important; }
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false })
    .setView([${userLoc.lat}, ${userLoc.lng}], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // Radius circle — fits view automatically
  var radiusCircle = L.circle([${userLoc.lat}, ${userLoc.lng}], {
    radius: ${radiusMeters},
    fillColor: '#FF6A00',
    fillOpacity: 0.10,
    color: '#FF6A00',
    weight: 2,
    opacity: 0.6
  }).addTo(map);

  // Fit map to circle bounds on load with padding
  map.fitBounds(radiusCircle.getBounds(), { padding: [40, 40] });

  // User marker — solid orange dot at center
  L.circleMarker([${userLoc.lat}, ${userLoc.lng}], {
    radius: 10,
    fillColor: '#FF6A00',
    color: '#fff',
    weight: 3,
    fillOpacity: 1
  }).addTo(map).bindPopup('<b>You are here</b>');

  // Contractor markers
  var ms = ${mJSON};
  ms.forEach(function(m) {
    var icon = L.divIcon({
      className: '',
      html: '<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    L.marker([m.lat, m.lng], { icon: icon })
      .addTo(map)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', id: m.id }));
      });
  });

  // Called from React Native via injectJavaScript — resizes circle AND re-fits view
  window.updateRadius = function(newRadiusMeters) {
    radiusCircle.setRadius(newRadiusMeters);
    map.fitBounds(radiusCircle.getBounds(), { padding: [40, 40] });
  };
</script>
</body></html>`;
}

// ─── Web fallback map (iframe-based for web platform) ───────────────────────
function WebMapFallback({
                          userLoc,
                          radiusKm,
                        }: {
  userLoc: { lat: number; lng: number };
  radiusKm: number;
}) {
  const delta = Math.max(0.01, (radiusKm / 111) * 1.5);
  const bbox = `${userLoc.lng - delta},${userLoc.lat - delta},${userLoc.lng + delta},${userLoc.lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${userLoc.lat},${userLoc.lng}`;

  return (
      <View style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden' }}>
        {/* @ts-ignore — iframe is valid on web */}
        <iframe
            title="map"
            src={src}
            width="100%"
            height="200"
            style={{ border: 'none', borderRadius: 16 }}
        />
      </View>
  );
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user, switchMode, isClientMode, isContractorMode } = useAuth();
  const authIsContractorMode = isContractorMode;

  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [onlineCount, setOnlineCount] = useState(0);
  const [showFullMap, setShowFullMap] = useState(false);
  const [showFullMapServiceMenu, setShowFullMapServiceMenu] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean | null>(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const [showNeedPrompt, setShowNeedPrompt] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [showFilters, setShowFilters] = useState(false);
  const [filterLicenseOnly, setFilterLicenseOnly] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]);
  const [filterLanguage, setFilterLanguage] = useState('All');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomLanguageInput, setShowCustomLanguageInput] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [categorySearchText, setCategorySearchText] = useState('');
  const [showSmartSuggestion, setShowSmartSuggestion] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [showAddMorePrompt, setShowAddMorePrompt] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [jobsToday, setJobsToday] = useState(0);
  const [engagementStat, setEngagementStat] = useState({ count: 0, type: 'Plumber', iconName: 'settings-outline' });
  const [showServiceMenu, setShowServiceMenu] = useState(false);

  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.8)).current;
  const mapPreviewRef = useRef<any>(null);
  const fullMapRef = useRef<any>(null);

  // ─── Location ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermissionGranted(true);
          const loc = await Location.getCurrentPositionAsync({});
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
          try {
            const address = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (address) {
              setLocationName(`${address[0]?.city || address[0]?.district || 'Your area'}`);
            }
          } catch {
            setLocationName('Your area');
          }
        } else {
          setLocationPermissionGranted(false);
          setUserLoc({ lat: 40.7128, lng: -74.0060 });
          setLocationName('New York');
        }
      } catch {
        setLocationPermissionGranted(false);
        setUserLoc({ lat: 40.7128, lng: -74.0060 });
        setLocationName('New York');
      }
    })();
  }, []);

  useEffect(() => {
    if (userLoc) fetchContractors();
  }, [category, userLoc]);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  // ─── Radius update → inject into both WebViews ───────────────────────────
  useEffect(() => {
    if (!userLoc || Platform.OS !== 'web') return;
    const radiusMeters = Math.min(radiusKm, 200) * 1000;
    const iframe = document.querySelector('iframe[title="map"]') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
          JSON.stringify({ type: 'updateRadius', radius: radiusMeters }),
          '*'
      );
    }
  }, [radiusKm, userLoc]);


  const checkNotificationStatus = async () => {
    try {
      const savedStatus = await AsyncStorage.getItem('notificationsEnabled');
      if (savedStatus === 'true') {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
      }
    } catch (error) {
      console.log('Error checking notification status:', error);
    }
  };

  const handleNotificationToggle = async () => {
    try {
      if (notificationsEnabled) {
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('notificationsEnabled', 'false');
        Alert.alert('Notifications Disabled', 'You will no longer receive notifications.');
      } else {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus === 'granted') {
          setNotificationsEnabled(true);
          await AsyncStorage.setItem('notificationsEnabled', 'true');
          if (user) {
            try {
              const token = await Notifications.getExpoPushTokenAsync();
              await api.post('/users/push-token', { token: token.data });
            } catch {}
          }
          Alert.alert('Notifications Enabled!', 'You will now receive job and message alerts.');
        } else {
          Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        }
      }
    } catch (error) {
      console.log('Error toggling notifications', error);
      Alert.alert('Error', 'Could not update notification settings');
    }
  };

  const fetchContractors = async () => {
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
      let filteredContractors = (res.contractors ?? []).filter(
          (contractor: any) => contractor.id !== user?.id
      );
      if (filterLicenseOnly) {
        filteredContractors = filteredContractors.filter((c: any) => c.haslicense);
      }
      if (filterMinRating > 0) {
        filteredContractors = filteredContractors.filter((c: any) => (c.rating || 0) >= filterMinRating);
      }
      if (filterLanguages.length > 0) {
        filteredContractors = filteredContractors.filter((c: any) =>
            filterLanguages.some((lang) => c.languages?.includes(lang))
        );
      }

      const sortedContractors = filteredContractors.sort((a: any, b: any) => {
        if (a.isonline && !b.isonline) return -1;
        if (!a.isonline && b.isonline) return 1;
        const distA = a.distance_km ?? a.distance ?? Infinity;
        const distB = b.distance_km ?? b.distance ?? Infinity;
        return distA - distB;
      });

      setContractors(sortedContractors);
      setOnlineCount(sortedContractors.filter((c: any) => c.isonline).length);

      const topType = CATEGORY_DATA[Math.floor(Math.random() * CATEGORY_DATA.length)];
      setEngagementStat({ count: Math.floor(Math.random() * 8) + 1, type: topType.name, iconName: topType.iconName });
      setJobsToday(Math.floor(Math.random() * 15) + 5);
    } catch (err) {
      console.error('fetchContractors error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sortedContractors = [...contractors].sort((a, b) => {
    if (radiusKm > 0) {
      const distA = a.distance_km ?? a.distance ?? Infinity;
      const distB = b.distance_km ?? b.distance ?? Infinity;
      if (distA > radiusKm && distB <= radiusKm) return 1;
      if (distA <= radiusKm && distB > radiusKm) return -1;
    }
    if (a.isonline && !b.isonline) return -1;
    if (!a.isonline && b.isonline) return 1;
    return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchContractors();
  };

  useFocusEffect(
      useCallback(() => {
        if (userLoc) fetchContractors();
      }, [userLoc, category, filterLicenseOnly, filterMinRating, filterLanguages])
  );

  // ─── Category helpers ─────────────────────────────────────────────────────
  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) return prev.filter((c) => c !== categoryName);
      return [...prev, categoryName];
    });
    setCategory(categoryName);
    fetchContractors();
  };

  // ─── Service Menu ─────────────────────────────────────────────────────────
  const toggleServiceMenu = () => {
    if (showServiceMenu) closeServiceMenu();
    else openServiceMenu();
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
    ]).start(() => setShowServiceMenu(false));
  };

  const selectCategory = (categoryName: string) => {
    toggleCategory(categoryName);
  };

  // ─── Smart search ─────────────────────────────────────────────────────────
  const handleCategorySearch = (text: string) => {
    setCategorySearchText(text);
    if (text.length < 2) {
      setShowSmartSuggestion(false);
      setSuggestedCategory(null);
      return;
    }
    const lower = text.toLowerCase();
    const match = SEARCH_KEYWORDS[lower];
    if (match) {
      setSuggestedCategory(match);
      setShowSmartSuggestion(true);
    } else {
      const partial = Object.keys(SEARCH_KEYWORDS).find((k) => k.startsWith(lower));
      if (partial) {
        setSuggestedCategory(SEARCH_KEYWORDS[partial]);
        setShowSmartSuggestion(true);
      } else {
        setShowSmartSuggestion(false);
        setSuggestedCategory(null);
      }
    }
  };

  // ─── Map ──────────────────────────────────────────────────────────────────
  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap' && data.id) router.push(`/contractor/${data.id}`);
    } catch {}
  };

  const openConversation = async (contractorId: string) => {
    if (!user) {
      setShowGuestPrompt(true);
      return;
    }
    try {
      const conv = await api.post('/conversations', { participantid: contractorId });
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      router.push(`/chat/${contractorId}`);
    }
  };

  // ─── Contractor card ──────────────────────────────────────────────────────
  const renderContractorCard = ({ item }: { item: any }) => {
    const initials = item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
    const distanceKm = item.distance_km || item.distance;

    const handleCardPress = () => {
      if (!user && !useAuth()) {
        setShowGuestPrompt(true);
        return;
      }
      router.push(`/contractor/${item.id}`);
    };

    return (
        <TouchableOpacity style={styles.contractorCard} onPress={() => router.push(`/contractor/${item.id}`)}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: item.isonline ? colors.green : colors.border }]}>
              {item.profile_image ? (
                  <Image source={{ uri: item.profile_image }} style={styles.avatarImage} />
              ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
              )}
              {item.isonline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.contractorName} numberOfLines={1}>{item.name}</Text>
                {item.haslicense && (
                    <View style={styles.licensedBadge}>
                      <Text style={styles.licensedBadgeText}>✓ Licensed</Text>
                    </View>
                )}
              </View>
              <Text style={styles.contractorType} numberOfLines={1}>
                {item.trades?.join(', ') || item.contractor_type || 'General Contractor'}
              </Text>
              <View style={styles.cardMeta}>
                {item.rating > 0 && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
                      {item.review_count > 0 && (
                          <Text style={styles.reviewCountText}>({item.review_count})</Text>
                      )}
                    </View>
                )}
                {distanceKm != null && (
                    <Text style={styles.distanceBadge}> {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
                    </Text>
                )}
                {item.isonline && (
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDotSmall} />
                      <Text style={styles.onlineText}>Online</Text>
                    </View>
                )}
              </View>
            </View>
          </View>

          {item.bio && (
              <Text style={styles.contractorBio} numberOfLines={2}>{item.bio}</Text>
          )}

          {item.languages && item.languages.length > 0 && (
              <View style={styles.languageRow}>
                <Ionicons name="earth" size={14} color={colors.textSecondary} />
                <Text style={styles.languageText}>{item.languages.slice(0, 3).join(', ')}</Text>
              </View>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.messageBtn} onPress={() => openConversation(item.id)}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
            {item.phone_visible && item.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                  <Ionicons name="call-outline" size={16} color={colors.paper} />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.viewBtn} onPress={() => router.push(`/contractor/${item.id}`)}>
              <Text style={styles.viewBtnText}>View Profile</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
    );
  };

  const isGuest = !user;
  const isContractor = user?.role === 'contractor';

  return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>MiPropertyGuru</Text>
              <Text style={styles.headerSubtitle}>Find trusted contractors near you</Text>
            </View>
            <View style={styles.headerRight}>
              {user && (
                  <TouchableOpacity
                      style={[styles.notificationBtn, notificationsEnabled && styles.notificationBtnActive]}
                      onPress={handleNotificationToggle}
                  >
                    <Ionicons
                        name={notificationsEnabled ? 'notifications' : 'notifications-outline'}
                        size={22}
                        color={notificationsEnabled ? '#FFD700' : colors.paper}
                    />
                  </TouchableOpacity>
              )}
              {isGuest && (
                  <View style={styles.headerAuthButtons}>
                    <TouchableOpacity style={styles.headerSignInBtn} onPress={() => router.push('/?mode=login')}>
                      <Text style={styles.headerSignInBtnText}>Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerRegisterBtn} onPress={() => router.push('/?mode=register')}>
                      <Text style={styles.headerRegisterBtnText}>Register</Text>
                    </TouchableOpacity>
                  </View>
              )}
              {user && <ModeToggle />}
            </View>
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
                  <Ionicons name="star" size={16} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{jobsToday}</Text>
                <Text style={styles.statLabel}>Jobs completed today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name={engagementStat.iconName as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{engagementStat.count}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {engagementStat.type} hired in your area today
                </Text>
              </View>
            </View>
          </View>

          {isContractor && isContractorMode && (
              <View style={styles.switchModePrompt}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                <Text style={styles.switchModePromptText}>
                  You&apos;re in Contractor Mode. To browse and hire contractors,{' '}
                  <Text style={styles.switchModeLink} onPress={() => switchMode('client')}>
                    switch to Client Mode
                  </Text>
                </Text>
              </View>
          )}
        </LinearGradient>

        {/* ── Content: Client/Guest mode only ──────────────────────────────── */}
        {(isClientMode || user?.role === 'client' || !user) && (
            <FlatList
                data={sortedContractors}
                keyExtractor={(item) => item.id}
                renderItem={renderContractorCard}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Finding contractors near you...</Text>
                      </View>
                  ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={36} color={colors.textDisabled} />
                        <Text style={styles.emptyTitle}>No contractors found</Text>
                        <Text style={styles.emptySubtitle}>Try adjusting your search radius or category filter</Text>
                      </View>
                  )
                }
                ListHeaderComponent={
                  <View>
                    {/* ── Mini Map ─────────────────────────────────────────────── */}
                    {userLoc && sortedContractors.length > 0 && (
                        <View style={styles.urgentMapSection}>
                          <View style={styles.urgentMapHeader}>
                            <View style={styles.urgentBadge}>
                              <Ionicons name="location" size={12} color={colors.primaryi} />
                              <Text style={styles.urgentBadgeText}>LIVE</Text>
                            </View>

                            <Text style={styles.urgentMapSubtitle}>Online contractors near you</Text>
                            <TouchableOpacity onPress={() => setShowFullMap(true)} style={styles.expandMapBtn}>
                              <Ionicons name="expand-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          </View>

                          {/* Radius Slider */}
                          <View style={styles.radiusSliderSection}>
                            <View style={styles.radiusSliderHeader}>
                              <Text style={styles.radiusSliderLabel}>Search Radius</Text>
                              <Text style={styles.radiusSliderValue}>
                                {radiusKm >= 200 ? '200+ km' : `${radiusKm} km`}
                              </Text>
                            </View>
                            <Slider
                                style={{ width: '100%', height: 36 }}
                                minimumValue={5}
                                maximumValue={200}
                                step={5}
                                value={radiusKm}
                                onValueChange={setRadiusKm}
                                onSlidingComplete={(val) => {
                                  setRadiusKm(val);
                                  fetchContractors();
                                }}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor={colors.border}
                                thumbTintColor={colors.primary}
                            />
                          </View>

                          {/* Map — native uses WebView, web uses iframe */}
                          <NativeMapView
                              userLoc={userLoc}
                              radiusKm={radiusKm}
                              contractors={sortedContractors}
                              height={200}
                              onMarkerPress={(id) => router.push(`/contractor/${id}`)}
                          />
                        </View>
                    )}

                    {/* ── Category search ───────────────────────────────────────── */}
                    <View style={styles.searchSection}>
                      <View style={styles.searchInputRow}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by service (e.g. 'pipe', 'roof')"
                            placeholderTextColor={colors.textSecondary}
                            value={categorySearchText}
                            onChangeText={handleCategorySearch}
                        />
                        {categorySearchText.length > 0 && (
                            <TouchableOpacity onPress={() => {
                              setCategorySearchText('');
                              setShowSmartSuggestion(false);
                              setSuggestedCategory(null);
                            }}>
                              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                      </View>
                      {showSmartSuggestion && suggestedCategory && (
                          <TouchableOpacity
                              style={styles.suggestionBanner}
                              onPress={() => {
                                toggleCategory(suggestedCategory);
                                setCategorySearchText('');
                                setShowSmartSuggestion(false);
                              }}
                          >
                            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                            <Text style={styles.suggestionText}>
                              Did you mean <Text style={styles.suggestionHighlight}>{suggestedCategory}</Text>?
                            </Text>
                          </TouchableOpacity>
                      )}
                    </View>

                    {/* ── Category chips ─────────────────────────────────────────── */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoriesScroll}
                        contentContainerStyle={styles.categoriesContent}
                    >
                      <TouchableOpacity
                          style={[styles.categoryChip, selectedCategories.length === 0 && styles.categoryChipActive]}
                          onPress={() => { setSelectedCategories([]); setCategory('All'); fetchContractors(); }}
                      >
                        <Text style={[styles.categoryChipText, selectedCategories.length === 0 && styles.categoryChipTextActive]}>
                          All
                        </Text>
                      </TouchableOpacity>
                      {CATEGORY_DATA.map((cat) => (
                          <TouchableOpacity
                              key={cat.name}
                              style={[styles.categoryChip, selectedCategories.includes(cat.name) && styles.categoryChipActive]}
                              onPress={() => toggleCategory(cat.name)}
                          >
                            <Ionicons name={cat.iconName as any} size={14} color={cat.color} style={{ marginRight: 4 }} />
                            <Text style={[styles.categoryChipText, selectedCategories.includes(cat.name) && styles.categoryChipTextActive]}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* ── Filter bar ─────────────────────────────────────────────── */}
                    <View style={styles.filterBar}>
                      <Text style={styles.resultsText}>
                        {sortedContractors.length} contractor{sortedContractors.length !== 1 ? 's' : ''} found
                      </Text>
                      <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
                        <Ionicons name="options-outline" size={16} color={colors.primary} />
                        <Text style={styles.filterBtnText}>Filters</Text>
                        {(filterLicenseOnly || filterMinRating > 0 || filterLanguages.length > 0) && (
                            <View style={styles.filterActiveDot} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                }
            />
        )}

        {/* ── Full Map Modal ─────────────────────────────────────────────────── */}
        <Modal visible={showFullMap} animationType="slide" statusBarTranslucent>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
            <View style={styles.fullMapHeader}>
              <TouchableOpacity onPress={() => setShowFullMap(false)} style={styles.fullMapCloseBtn}>
                <Ionicons name="close" size={24} color={colors.paper} />
              </TouchableOpacity>
              <Text style={styles.fullMapTitle}>Contractors Near You</Text>
              <View style={{ width: 40 }} />
            </View>

            {userLoc ? (
                <NativeMapView
                    userLoc={userLoc}
                    radiusKm={radiusKm}
                    contractors={sortedContractors}
                    height={height}
                    onMarkerPress={(id) => { setShowFullMap(false); router.push(`/contractor/${id}`); }}
                />
            ) : (
                <ActivityIndicator size="large" color={colors.primary} />
            )}


            <View style={styles.fullMapRadiusBar}>
              <Text style={styles.fullMapRadiusLabel}>
                Radius: {radiusKm >= 200 ? '200+ km' : `${radiusKm} km`}
              </Text>
              <Slider
                  style={{ flex: 1, marginHorizontal: 12 }}
                  minimumValue={5}
                  maximumValue={200}
                  step={5}
                  value={radiusKm}
                  onValueChange={setRadiusKm}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.border}
                  thumbTintColor={colors.primary}
              />
            </View>
          </SafeAreaView>
        </Modal>

        {/* ── Filters Modal ─────────────────────────────────────────────────── */}
        <Modal visible={showFilters} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.filtersModal}>
              <View style={styles.modalHandle} />
              <Text style={styles.filtersTitle}>Filters</Text>

              <TouchableOpacity
                  style={[styles.filterToggle, filterLicenseOnly && styles.filterToggleActive]}
                  onPress={() => setFilterLicenseOnly(!filterLicenseOnly)}
              >
                <Ionicons name="ribbon-outline" size={18} color={filterLicenseOnly ? colors.paper : colors.primary} />
                <Text style={[styles.filterToggleText, filterLicenseOnly && styles.filterToggleTextActive]}>
                  Licensed Only
                </Text>
              </TouchableOpacity>

              <Text style={styles.filterSectionLabel}>Minimum Rating</Text>
              <View style={styles.ratingOptions}>
                {RATING_OPTIONS.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        style={[styles.ratingOpt, filterMinRating === opt.value && styles.ratingOptActive]}
                        onPress={() => setFilterMinRating(opt.value)}
                    >
                      <Text style={[styles.ratingOptText, filterMinRating === opt.value && styles.ratingOptTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionLabel}>Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
                {LANGUAGE_OPTIONS.map((lang) => (
                    <TouchableOpacity
                        key={lang}
                        style={[styles.langChip, filterLanguages.includes(lang) && styles.langChipActive]}
                        onPress={() => {
                          setFilterLanguages((prev) =>
                              prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
                          );
                        }}
                    >
                      <Text style={[styles.langChipText, filterLanguages.includes(lang) && styles.langChipTextActive]}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.filterActions}>
                <TouchableOpacity
                    style={styles.clearFiltersBtn}
                    onPress={() => {
                      setFilterLicenseOnly(false);
                      setFilterMinRating(0);
                      setFilterLanguages([]);
                    }}
                >
                  <Text style={styles.clearFiltersBtnText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.applyFiltersBtn}
                    onPress={() => { setShowFilters(false); fetchContractors(); }}
                >
                  <Text style={styles.applyFiltersBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Guest Prompt Modal ─────────────────────────────────────────────── */}
        <Modal visible={showGuestPrompt} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.guestModal}>
              <Text style={styles.guestModalTitle}>Sign In Required</Text>
              <Text style={styles.guestModalText}>
                Create an account or sign in to message contractors and manage jobs.
              </Text>
              <TouchableOpacity style={styles.guestSignInBtn} onPress={() => { setShowGuestPrompt(false); router.push('/?mode=login'); }}>
                <Text style={styles.guestSignInBtnText}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guestRegisterBtn} onPress={() => { setShowGuestPrompt(false); router.push('/?mode=register'); }}>
                <Text style={styles.guestRegisterBtnText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowGuestPrompt(false)}>
                <Text style={styles.guestDismissText}>Continue browsing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.paper },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  notificationBtnActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  headerAuthButtons: { flexDirection: 'row', gap: 8 },
  headerSignInBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  headerSignInBtnText: { color: colors.paper, fontSize: 13, fontWeight: '600' },
  headerRegisterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.paper },
  headerRegisterBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  headerContent: { gap: 12 },
  locationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, gap: 10 },
  locationIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' },
  locationInfo: {},
  locationLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  locationValue: { fontSize: 14, color: colors.paper, fontWeight: '700' },
  statsCards: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, alignItems: 'center' },
  statIconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  pulsingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green },
  statNumber: { fontSize: 18, fontWeight: '800', color: colors.paper },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 2 },
  switchModePrompt: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, gap: 10, marginTop: 8 },
  switchModePromptText: { flex: 1, fontSize: 13, color: colors.paper, lineHeight: 18 },
  switchModeLink: { fontWeight: '700', textDecorationLine: 'underline' },
  listContent: { paddingBottom: 32 },
  urgentMapSection: { margin: 16, backgroundColor: colors.paper, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  urgentMapHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  urgentBadgeEmoji: { fontSize: 12 },
  urgentBadgeText: { fontSize: 11, fontWeight: '800', color: colors.red },
  urgentMapSubtitle: { flex: 1, fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  expandMapBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  radiusSliderSection: { paddingHorizontal: 12, paddingBottom: 8 },
  radiusSliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  radiusSliderLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  radiusSliderValue: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  mapContainer: { width: '100%', height: 200, overflow: 'hidden' },
  mapPreview: { width: '100%', height: 200 },
  searchSection: { marginHorizontal: 16, marginBottom: 8 },
  searchInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  suggestionBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, marginTop: 6, gap: 8 },
  suggestionText: { flex: 1, fontSize: 13, color: colors.text },
  suggestionHighlight: { fontWeight: '700', color: colors.primary },
  categoriesScroll: { marginBottom: 8 },
  categoriesContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: colors.border },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  categoryChipTextActive: { color: colors.paper },
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  resultsText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.paper, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  filterBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  filterActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  contractorCard: { backgroundColor: colors.paper, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.paper },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.paper },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  contractorName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  licensedBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  licensedBadgeText: { fontSize: 11, color: colors.green, fontWeight: '600' },
  contractorType: { fontSize: 13, color: colors.textSecondary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: colors.text },
  reviewCountText: { fontSize: 12, color: colors.textSecondary },
  distanceBadge: { fontSize: 12, color: colors.textSecondary },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDotSmall: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  onlineText: { fontSize: 12, color: colors.green, fontWeight: '600' },
  contractorBio: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  languageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  languageText: { fontSize: 12, color: colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: 8 },
  messageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  messageBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.green, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  callBtnText: { fontSize: 13, color: colors.paper, fontWeight: '600' },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  viewBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  fullMapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12 },
  fullMapCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  fullMapTitle: { fontSize: 16, fontWeight: '700', color: colors.paper },
  fullMapRadiusBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 10 },
  fullMapRadiusLabel: { fontSize: 13, color: colors.paper, fontWeight: '600', minWidth: 80 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filtersModal: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  filtersTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  filterToggleActive: { backgroundColor: colors.primary },
  filterToggleText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  filterToggleTextActive: { color: colors.paper },
  filterSectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  ratingOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  ratingOpt: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ratingOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingOptText: { fontSize: 13, color: colors.text },
  ratingOptTextActive: { color: colors.paper, fontWeight: '600' },
  languageScroll: { marginBottom: 20 },
  langChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { fontSize: 13, color: colors.text },
  langChipTextActive: { color: colors.paper, fontWeight: '600' },
  filterActions: { flexDirection: 'row', gap: 12 },
  clearFiltersBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  clearFiltersBtnText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  applyFiltersBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  applyFiltersBtnText: { fontSize: 15, color: colors.paper, fontWeight: '700' },
  guestModal: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, alignItems: 'center', gap: 12 },
  guestModalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  guestModalText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  guestSignInBtn: { width: '100%', backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  guestSignInBtnText: { fontSize: 16, fontWeight: '700', color: colors.paper },
  guestRegisterBtn: { width: '100%', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  guestRegisterBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  guestDismissText: { fontSize: 14, color: colors.textSecondary, padding: 8 },
});