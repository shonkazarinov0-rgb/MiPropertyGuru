import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, ScrollView, RefreshControl, Platform, Dimensions,
  Image, Linking, Animated, Modal, Alert, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModeToggle from '../../src/components/ModeToggle';

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
  { name: 'Aluminum Capping', icon: '🏢', color: '#90A4AE' },
  { name: 'Appliance Repair', icon: '🔌', color: '#673AB7' },
  { name: 'Cabinet Maker', icon: '🪑', color: '#A1887F' },
  { name: 'Carpenter', icon: '🪚', color: '#8D6E63' },
  { name: 'Caulker', icon: '🔗', color: '#7E57C2' },
  { name: 'Concrete', icon: '🪨', color: '#757575' },
  { name: 'Deck Builder', icon: '🌲', color: '#33691E' },
  { name: 'Demolition', icon: '💥', color: '#D32F2F' },
  { name: 'Door Installer', icon: '🚪', color: '#5D4037' },
  { name: 'Drywall', icon: '🏗️', color: '#9E9E9E' },
  { name: 'Electrician', icon: '⚡', color: '#FFC107' },
  { name: 'Fence', icon: '🚧', color: '#8BC34A' },
  { name: 'Flooring', icon: '🪵', color: '#6D4C41' },
  { name: 'Garage Door', icon: '🚗', color: '#546E7A' },
  { name: 'General Contractor', icon: '👷', color: '#FF9800' },
  { name: 'Glazier', icon: '🪟', color: '#81D4FA' },
  { name: 'Handyman', icon: '🔨', color: '#795548' },
  { name: 'HVAC Technician', icon: '❄️', color: '#00BCD4' },
  { name: 'Insulation', icon: '🧤', color: '#E91E63' },
  { name: 'Landscaper', icon: '🌳', color: '#4CAF50' },
  { name: 'Locksmith', icon: '🔐', color: '#FFC107' },
  { name: 'Mason', icon: '🧱', color: '#BF360C' },
  { name: 'Painter', icon: '🎨', color: '#9C27B0' },
  { name: 'Plumber', icon: '🔧', color: '#2196F3' },
  { name: 'Pool Service', icon: '🏊', color: '#00ACC1' },
  { name: 'Roofer', icon: '🏠', color: '#607D8B' },
  { name: 'Siding', icon: '🏘️', color: '#78909C' },
  { name: 'Tiler', icon: '🔲', color: '#3F51B5' },
  { name: 'Welder', icon: '🔥', color: '#FF5722' },
  { name: 'Window Installer', icon: '🖼️', color: '#42A5F5' },
];

// Search keyword mapping for smart suggestions
const SEARCH_KEYWORDS: { [key: string]: string } = {
  // Electrician related
  'lamp': 'Electrician', 'light': 'Electrician', 'lighting': 'Electrician', 'wire': 'Electrician',
  'wiring': 'Electrician', 'outlet': 'Electrician', 'socket': 'Electrician', 'switch': 'Electrician',
  'electrical': 'Electrician', 'power': 'Electrician', 'circuit': 'Electrician', 'fuse': 'Electrician',
  'breaker': 'Electrician', 'fan': 'Electrician', 'ceiling fan': 'Electrician',
  // Plumber related
  'pipe': 'Plumber', 'pipes': 'Plumber', 'drain': 'Plumber', 'toilet': 'Plumber', 'sink': 'Plumber',
  'faucet': 'Plumber', 'water': 'Plumber', 'leak': 'Plumber', 'leaking': 'Plumber', 'tap': 'Plumber',
  'bathroom': 'Plumber', 'shower': 'Plumber', 'bathtub': 'Plumber', 'sewer': 'Plumber',
  // HVAC related
  'ac': 'HVAC Technician', 'air conditioning': 'HVAC Technician', 'heating': 'HVAC Technician',
  'furnace': 'HVAC Technician', 'heat': 'HVAC Technician', 'cooling': 'HVAC Technician',
  'ventilation': 'HVAC Technician', 'thermostat': 'HVAC Technician', 'duct': 'HVAC Technician',
  // Carpenter related
  'wood': 'Carpenter', 'cabinet': 'Cabinet Maker', 'shelf': 'Carpenter', 'shelves': 'Carpenter',
  'furniture': 'Carpenter', 'closet': 'Carpenter', 'trim': 'Carpenter', 'molding': 'Carpenter',
  // Painter related
  'paint': 'Painter', 'painting': 'Painter', 'wall': 'Painter', 'stain': 'Painter',
  // Roofer related
  'roof': 'Roofer', 'roofing': 'Roofer', 'shingle': 'Roofer', 'gutter': 'Roofer', 'eaves': 'Roofer',
  // Landscaper related
  'lawn': 'Landscaper', 'garden': 'Landscaper', 'tree': 'Landscaper', 'grass': 'Landscaper',
  'yard': 'Landscaper', 'hedge': 'Landscaper', 'bush': 'Landscaper', 'plant': 'Landscaper',
  // Tiler related
  'tile': 'Tiler', 'tiles': 'Tiler', 'backsplash': 'Tiler', 'grout': 'Tiler',
  // Flooring related
  'floor': 'Flooring', 'hardwood': 'Flooring', 'laminate': 'Flooring', 'vinyl': 'Flooring', 'carpet': 'Flooring',
  // Door related
  'door': 'Door Installer', 'doors': 'Door Installer', 'entry': 'Door Installer', 'entrance': 'Door Installer',
  // Window related
  'window': 'Window Installer', 'windows': 'Window Installer', 'glass': 'Glazier',
  // Locksmith related
  'lock': 'Locksmith', 'key': 'Locksmith', 'deadbolt': 'Locksmith', 'security': 'Locksmith',
  // Handyman related
  'fix': 'Handyman', 'repair': 'Handyman', 'install': 'Handyman', 'mount': 'Handyman', 'hang': 'Handyman',
  // Drywall related
  'drywall': 'Drywall', 'sheetrock': 'Drywall', 'plaster': 'Drywall', 'hole': 'Drywall',
  // Concrete related
  'concrete': 'Concrete', 'cement': 'Concrete', 'driveway': 'Concrete', 'sidewalk': 'Concrete', 'patio': 'Concrete',
  // Fence related
  'fence': 'Fence', 'fencing': 'Fence', 'gate': 'Fence',
  // Deck related
  'deck': 'Deck Builder', 'porch': 'Deck Builder', 'pergola': 'Deck Builder',
  // Pool related
  'pool': 'Pool Service', 'spa': 'Pool Service', 'hot tub': 'Pool Service',
  // Welder related
  'weld': 'Welder', 'welding': 'Welder', 'metal': 'Welder', 'iron': 'Welder', 'steel': 'Welder',
  // Mason related
  'brick': 'Mason', 'stone': 'Mason', 'masonry': 'Mason', 'chimney': 'Mason', 'fireplace': 'Mason',
  // Appliance related
  'appliance': 'Appliance Repair', 'washer': 'Appliance Repair', 'dryer': 'Appliance Repair',
  'refrigerator': 'Appliance Repair', 'fridge': 'Appliance Repair', 'dishwasher': 'Appliance Repair',
  'stove': 'Appliance Repair', 'oven': 'Appliance Repair', 'microwave': 'Appliance Repair',
  // Caulker related
  'caulk': 'Caulker', 'seal': 'Caulker', 'sealing': 'Caulker', 'weatherproof': 'Caulker',
  // Aluminum related
  'aluminum': 'Aluminum Capping', 'capping': 'Aluminum Capping', 'soffit': 'Aluminum Capping', 'fascia': 'Aluminum Capping',
  // Siding related
  'siding': 'Siding', 'exterior': 'Siding',
  // Garage related
  'garage': 'Garage Door', 'garage door': 'Garage Door',
  // Insulation related
  'insulation': 'Insulation', 'insulate': 'Insulation', 'attic': 'Insulation',
  // Demolition related
  'demolition': 'Demolition', 'demo': 'Demolition', 'tear down': 'Demolition', 'remove': 'Demolition',
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user, switchMode, isClientMode, isContractorMode: authIsContractorMode } = useAuth();
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);  // Multi-select categories
  const [category, setCategory] = useState('All');  // Keep for backwards compatibility
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Detecting location...');
  const [onlineCount, setOnlineCount] = useState(0);
  const [showFullMap, setShowFullMap] = useState(false);
  const [showFullMapServiceMenu, setShowFullMapServiceMenu] = useState(false);
  
  // Guest prompt modal state
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  
  // "What do you need?" modal state - shows on app open for clients
  const [showNeedPrompt, setShowNeedPrompt] = useState(false);
  
  // Filter toggle states - removed for client simplicity, always show online only
  // Contractors are always sorted by nearest distance
  
  // Distance radius filter (in km) - 0 means no limit
  const [radiusKm, setRadiusKm] = useState<number>(50);
  
  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterLicenseOnly, setFilterLicenseOnly] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0); // 0 = no filter
  const [filterLanguages, setFilterLanguages] = useState<string[]>([]); // Multi-select languages
  const [filterLanguage, setFilterLanguage] = useState('All'); // Keep for backwards compatibility
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomLanguageInput, setShowCustomLanguageInput] = useState(false);
  
  // Filter popup modals
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  
  // Rating options
  const RATING_OPTIONS = [
    { value: 0, label: 'All Ratings' },
    { value: 1, label: '1+ Stars' },
    { value: 2, label: '2+ Stars' },
    { value: 3, label: '3+ Stars' },
    { value: 4, label: '4+ Stars' },
    { value: 5, label: '5 Stars' },
  ];
  
  // Language options (alphabetical)
  const LANGUAGE_OPTIONS = [
    'Arabic', 'Bengali', 'Chinese (Cantonese)', 'Chinese (Mandarin)', 
    'English', 'French', 'German', 'Greek', 'Gujarati', 'Hindi', 
    'Italian', 'Japanese', 'Korean', 'Pashto', 'Persian (Farsi)', 
    'Polish', 'Portuguese', 'Punjabi', 'Russian', 'Spanish', 
    'Tagalog', 'Tamil', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese'
  ].sort();
  
  // FAB Menu State - Click to open
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.8)).current;
  
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Check if contractor is in client mode (browsing as client)
  const isContractorInClientMode = user?.role === 'contractor' && isClientMode;
  
  // Show "What do you need?" modal on app open for clients/guests
  useEffect(() => {
    const checkShowIntentModal = async () => {
      // Only show for clients or guests (not contractors in contractor mode)
      const isClientOrGuest = !user || user.role === 'client' || (user.role === 'contractor' && isClientMode);
      if (isClientOrGuest) {
        // Show the modal every time the app opens for clients/guests
        setShowNeedPrompt(true);
      }
    };
    checkShowIntentModal();
  }, [user, isClientMode]);
  
  // Contractor types with emojis for dynamic stat
  const CONTRACTOR_STATS = [
    { type: 'Electricians', icon: '⚡' },
    { type: 'Plumbers', icon: '🔧' },
    { type: 'Handymen', icon: '🔨' },
    { type: 'Painters', icon: '🎨' },
    { type: 'Carpenters', icon: '🪚' },
    { type: 'Roofers', icon: '🏠' },
    { type: 'HVAC Techs', icon: '❄️' },
    { type: 'Landscapers', icon: '🌳' },
    { type: 'Masons', icon: '🧱' },
    { type: 'Tilers', icon: '🔲' },
  ];
  
  // Dynamic engagement stat - rotates every 30 seconds
  const [engagementStat, setEngagementStat] = useState({ count: 7, type: 'Electricians', icon: '⚡' });

  // Calculate Jobs Today based on time of day (resets at midnight, increases throughout day)
  const getJobsToday = () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Calculate total 30-minute intervals since midnight
    const intervals = (hour * 2) + Math.floor(minute / 30);
    
    // Base calculation: starts at 0 at midnight
    let jobs = 0;
    
    for (let i = 0; i < intervals; i++) {
      const intervalHour = Math.floor(i / 2);
      
      // AM hours (0-11): slower growth
      if (intervalHour < 6) {
        // Very early morning (12am-6am): minimal activity
        jobs += Math.floor(Math.random() * 3) + 1; // 1-3 per interval
      } else if (intervalHour < 12) {
        // Morning (6am-12pm): moderate activity
        jobs += Math.floor(Math.random() * 5) + 6; // 6-10 per interval
      } else if (intervalHour < 18) {
        // Afternoon (12pm-6pm): peak activity
        jobs += Math.floor(Math.random() * 5) + 9; // 9-13 per interval
      } else {
        // Evening (6pm-12am): declining activity
        jobs += Math.floor(Math.random() * 4) + 4; // 4-7 per interval
      }
    }
    
    // Add some randomness based on day of week
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekends: slightly more activity
      jobs = Math.floor(jobs * 1.1);
    }
    
    return jobs;
  };
  
  const [jobsToday, setJobsToday] = useState(getJobsToday());

  // Update jobs count every 30 minutes
  useEffect(() => {
    const updateJobs = () => setJobsToday(getJobsToday());
    updateJobs();
    const interval = setInterval(updateJobs, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, []);

  // Rotate engagement stats every 30 seconds
  useEffect(() => {
    const updateEngagement = () => {
      const stat = CONTRACTOR_STATS[Math.floor(Math.random() * CONTRACTOR_STATS.length)];
      const now = new Date();
      const hour = now.getHours();
      
      // Count based on time of day - more realistic numbers (20-49 range)
      let baseCount;
      if (hour < 6) baseCount = Math.floor(Math.random() * 10) + 20;      // 20-29 (early morning)
      else if (hour < 12) baseCount = Math.floor(Math.random() * 15) + 28; // 28-42 (morning)
      else if (hour < 18) baseCount = Math.floor(Math.random() * 15) + 35; // 35-49 (afternoon peak)
      else baseCount = Math.floor(Math.random() * 12) + 25;                // 25-36 (evening)
      
      setEngagementStat({ count: baseCount, type: stat.type, icon: stat.icon });
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

  // Check notification status on mount
  useEffect(() => {
    checkNotificationStatus();
  }, []);

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
        // Turn off notifications
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('notificationsEnabled', 'false');
        Alert.alert(
          'Notifications Disabled',
          'You will no longer receive notifications for new jobs or messages.'
        );
      } else {
        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          setNotificationsEnabled(true);
          await AsyncStorage.setItem('notificationsEnabled', 'true');
          
          // Get push token (for future backend integration)
          const token = await Notifications.getExpoPushTokenAsync();
          console.log('Push token:', token.data);
          
          // Save token to backend if user is logged in
          if (user) {
            try {
              await api.post('/users/push-token', { token: token.data });
            } catch (e) {
              console.log('Could not save push token');
            }
          }
          
          Alert.alert(
            'Notifications Enabled! 🔔',
            'You will now receive notifications when:\n\n• New jobs are posted in your trade\n• Someone sends you a message',
            [{ text: 'Great!' }]
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive job alerts and messages.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.log('Error toggling notifications:', error);
      Alert.alert('Error', 'Could not update notification settings');
    }
  };

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
      let filteredContractors = (res.contractors || []).filter(
        (contractor: any) => contractor.id !== user?.id
      );
      
      // Apply client-side filters
      if (filterLicenseOnly) {
        filteredContractors = filteredContractors.filter((c: any) => c.has_license);
      }
      if (filterMinRating > 0) {
        filteredContractors = filteredContractors.filter((c: any) => (c.rating || 0) >= filterMinRating);
      }
      // Multi-language filter
      if (filterLanguages.length > 0) {
        filteredContractors = filteredContractors.filter((c: any) => {
          const contractorLangs = c.languages || ['English'];
          return filterLanguages.some(filterLang => {
            // Handle "Chinese" variants
            if (filterLang.toLowerCase().includes('chinese')) {
              return contractorLangs.some((l: string) => 
                l.toLowerCase().includes('chinese') || l.toLowerCase().includes('mandarin') || l.toLowerCase().includes('cantonese')
              );
            }
            return contractorLangs.some((l: string) => l.toLowerCase().includes(filterLang.toLowerCase()));
          });
        });
      }
      
      setContractors(filteredContractors);
      if (res.online_count !== undefined) setOnlineCount(res.online_count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Toggle category selection (multi-select)
  const toggleCategory = (cat: string) => {
    if (cat === 'All') {
      setSelectedCategories([]);
      setCategory('All');
    } else {
      setSelectedCategories(prev => {
        if (prev.includes(cat)) {
          // Remove category
          const newCats = prev.filter(c => c !== cat);
          setCategory(newCats.length === 0 ? 'All' : newCats[0]);
          return newCats;
        } else {
          // Add category (max 5)
          if (prev.length >= 5) return prev;
          const newCats = [...prev, cat];
          setCategory(newCats[0]);
          return newCats;
        }
      });
    }
  };

  // Sort and filter contractors - ALWAYS show only online contractors for clients
  const sortedContractors = React.useMemo(() => {
    // Always filter for online contractors only
    let filtered = contractors.filter(c => c.is_online);
    
    // Filter by radius - only include contractors within the selected distance
    filtered = filtered.filter(c => {
      const distance = c.distance_km || c.distance;
      if (!distance) return true;
      if (radiusKm >= 200) return true;
      return distance <= radiusKm;
    });
    
    // Filter by selected categories (if any selected)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(c => {
        const contractorType = c.contractor_type?.toLowerCase() || '';
        const trades = c.trades?.map((t: string) => t.toLowerCase()) || [];
        return selectedCategories.some(cat => 
          contractorType.includes(cat.toLowerCase()) || 
          trades.some((t: string) => t.includes(cat.toLowerCase()))
        );
      });
    }
    
    // Always sort by distance (nearest first)
    filtered.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    
    return filtered;
  }, [contractors, radiusKm, selectedCategories]);

  // Get counts per selected category
  const getCategoryCountsText = React.useMemo(() => {
    if (selectedCategories.length === 0) {
      return `${sortedContractors.length} online contractor${sortedContractors.length !== 1 ? 's' : ''} nearby`;
    }
    
    // Count contractors per category
    const categoryCounts: { [key: string]: number } = {};
    selectedCategories.forEach(cat => {
      categoryCounts[cat] = contractors.filter(c => {
        if (!c.is_online) return false;
        // Check radius
        const distance = c.distance_km || c.distance;
        if (distance && radiusKm < 200 && distance > radiusKm) return false;
        // Check category match
        const contractorType = c.contractor_type?.toLowerCase() || '';
        const trades = c.trades?.map((t: string) => t.toLowerCase()) || [];
        return contractorType.includes(cat.toLowerCase()) || 
          trades.some((t: string) => t.includes(cat.toLowerCase()));
      }).length;
    });
    
    // Build the display text
    const parts = selectedCategories.map(cat => {
      const count = categoryCounts[cat];
      const catLower = cat.toLowerCase();
      const plural = count !== 1 ? 's' : '';
      return `${count} ${catLower}${plural}`;
    });
    
    if (parts.length === 1) {
      return `${parts[0]} online`;
    } else if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]} online`;
    } else {
      const lastPart = parts.pop();
      return `${parts.join(', ')}, and ${lastPart} online`;
    }
  }, [selectedCategories, contractors, radiusKm, sortedContractors]);

  // Get empty state message
  const getEmptyStateMessage = React.useMemo(() => {
    if (selectedCategories.length === 0) {
      return `No online contractors within ${radiusKm} km`;
    }
    
    if (selectedCategories.length === 1) {
      return `No online ${selectedCategories[0].toLowerCase()}s within ${radiusKm} km`;
    }
    
    const catNames = selectedCategories.map(c => c.toLowerCase() + 's');
    if (catNames.length === 2) {
      return `No online ${catNames[0]} or ${catNames[1]} within ${radiusKm} km`;
    }
    
    const lastCat = catNames.pop();
    return `No online ${catNames.join(', ')}, or ${lastCat} within ${radiusKm} km`;
  }, [selectedCategories, radiusKm]);

  // Re-fetch when filters change
  useEffect(() => {
    if (userLoc) {
      fetchContractors();
    }
  }, [filterLicenseOnly, filterMinRating, filterLanguages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContractors();
  }, [category, userLoc]);

  const handleCall = (phone: string, e?: any) => {
    if (e) e.stopPropagation();
    // Check if user is logged in
    if (!user) {
      setShowGuestPrompt(true);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string, e?: any) => {
    if (e) e.stopPropagation();
    // Check if user is logged in
    if (!user) {
      setShowGuestPrompt(true);
      return;
    }
    Linking.openURL(`mailto:${email}`);
  };

  const handleMessage = async (contractorId: string, e?: any) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowGuestPrompt(true);
      return;
    }
    try {
      const conv = await api.post('/conversations', { participant_id: contractorId });
      router.push(`/chat/${conv.id}`);
    } catch (err) {
      console.error('Error creating conversation:', err);
      router.push(`/chat/${contractorId}`);
    }
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
    // Use toggleCategory for multi-select support
    toggleCategory(categoryName);
    // Don't close menu - let user select multiple
  };

  const getMapHTML = () => {
    if (!userLoc) return '';
    
    // Only show online contractors with their live location on the map
    const onlineContractors = sortedContractors.filter(c => c.is_online && c.current_location);
    const markers = onlineContractors.slice(0, 15).map(c => ({
      id: c.id,
      name: c.name,
      type: c.contractor_type,
      lat: c.current_location.lat,
      lng: c.current_location.lng,
      online: true
    }));
    
    const mJSON = JSON.stringify(markers);
    // Calculate zoom level based on radius (larger radius = lower zoom)
    let zoomLevel = 13;
    if (radiusKm <= 5) zoomLevel = 14;
    else if (radiusKm <= 25) zoomLevel = 12;
    else if (radiusKm <= 50) zoomLevel = 11;
    else if (radiusKm <= 100) zoomLevel = 10;
    else if (radiusKm <= 200) zoomLevel = 9;
    else zoomLevel = 8;
    
    // Convert km to meters for the circle radius
    const radiusMeters = radiusKm >= 200 ? 200000 : radiusKm * 1000;
    
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh}</style></head>
<body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false}).setView([${userLoc.lat},${userLoc.lng}],${zoomLevel});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:''}).addTo(map);
// Draw search radius circle - transparent blue to show search area
L.circle([${userLoc.lat},${userLoc.lng}],{radius:${radiusMeters},fillColor:'#007AFF',fillOpacity:0.15,color:'#007AFF',weight:2,opacity:0.6}).addTo(map);
// User marker - solid blue circle
L.circleMarker([${userLoc.lat},${userLoc.lng}],{radius:12,fillColor:'#007AFF',color:'#fff',weight:4,fillOpacity:1}).addTo(map).bindPopup('<b>You are here</b>');
var ms=${mJSON};
ms.forEach(function(m){
// All markers are green (online only)
var icon=L.divIcon({className:'',html:'<div style="background:#22C55E;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>',iconSize:[14,14],iconAnchor:[7,7]});
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
            {/* License Badge */}
            {item.has_license && (
              <View style={styles.licenseBadge}>
                <Text style={styles.licenseBadgeText}>🪪 License on file</Text>
              </View>
            )}
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
            {/* Languages Badge */}
            {item.languages && item.languages.length > 0 && (
              <View style={styles.languagesBadge}>
                <Ionicons name="globe-outline" size={12} color={colors.textSecondary} />
                <Text style={styles.languagesBadgeText}>
                  {item.languages.slice(0, 3).join(', ')}{item.languages.length > 3 ? '...' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {item.bio && (
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        )}
        
        {/* Action Buttons - Styled like the reference image */}
        <View style={styles.contactButtonsRow}>
          <TouchableOpacity 
            style={styles.contactActionBtn}
            onPress={(e) => handleCall(item.phone, e)}
          >
            <View style={[styles.contactActionIcon, { backgroundColor: '#E8F9EE' }]}>
              <Ionicons name="call" size={20} color="#22C55E" />
            </View>
            <Text style={styles.contactActionLabel}>Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactActionBtn}
            onPress={(e) => handleEmail(item.email, e)}
          >
            <View style={[styles.contactActionIcon, { backgroundColor: '#E8F0FF' }]}>
              <Ionicons name="mail" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.contactActionLabel}>Email</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactActionBtn}
            onPress={(e) => handleMessage(item.id, e)}
          >
            <View style={[styles.contactActionIcon, { backgroundColor: '#FFF8EC' }]}>
              <Ionicons name="chatbubble" size={20} color="#FF6A00" />
            </View>
            <Text style={styles.contactActionLabel}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Guest sign-in prompt - shows if user not logged in */}
        {!user && (
          <View style={styles.guestPromptBanner}>
            <View style={styles.guestPromptLeft}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={styles.guestPromptText}>
                <Text 
                  style={styles.guestPromptLink} 
                  onPress={(e) => { e.stopPropagation(); router.push('/?mode=login'); }}
                >
                  Sign in
                </Text>
                {' or '}
                <Text 
                  style={styles.guestPromptLink}
                  onPress={(e) => { e.stopPropagation(); router.push('/?mode=register'); }}
                >
                  Register
                </Text>
                {' to contact'}
              </Text>
            </View>
          </View>
        )}
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

  // Check if user is contractor in contractor mode - use authIsContractorMode from context
  const isContractorMode = authIsContractorMode;

  const handleSwitchToContractorMode = async () => {
    await switchMode('contractor');
    // Stay on current page - no navigation
  };

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
            {/* Mode Toggle and Bell in same column on right */}
            <View style={styles.headerRightColumn}>
              <ModeToggle />
              <TouchableOpacity 
                style={[
                  styles.notificationBtn, 
                  notificationsEnabled && styles.notificationBtnActive
                ]}
                onPress={handleNotificationToggle}
              >
                <Ionicons 
                  name={notificationsEnabled ? "notifications" : "notifications-outline"} 
                  size={22} 
                  color={notificationsEnabled ? '#FFD700' : colors.paper} 
                />
              </TouchableOpacity>
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
                <Text style={styles.statNumber}>{jobsToday}</Text>
                <Text style={styles.statLabel}>Jobs completed today</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={{ fontSize: 18 }}>{engagementStat.icon}</Text>
                </View>
                <Text style={styles.statNumber}>{engagementStat.count}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>{engagementStat.type} hired in your area today</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Show switch prompt for contractors in contractor mode */}
        {isContractorMode && (
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

        {/* Content area - only show when in client mode or for clients/guests */}
        {(isClientMode || user?.role === 'client' || !user) && (
          <>
            {/* Mini Map with Urgent Label */}
            {userLoc && contractors.length > 0 && Platform.OS !== 'web' && (
              <View style={styles.urgentMapSection}>
                <View style={styles.urgentMapHeader}>
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeEmoji}>⚡</Text>
                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                  </View>
                  <Text style={styles.urgentMapSubtitle}>Online contractors near you</Text>
                </View>
                
                {/* Distance Radius Slider */}
                <View style={styles.radiusSliderSection}>
                  <View style={styles.radiusSliderHeader}>
                    <Ionicons name="locate" size={18} color={colors.primary} />
                    <Text style={styles.radiusSliderLabel}>Search Radius</Text>
                    <View style={styles.radiusValueBadge}>
                      <Text style={styles.radiusValueText}>
                        {radiusKm >= 200 ? '200+ km' : `${radiusKm} km`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderMinLabel}>0</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={200}
                      step={5}
                      value={radiusKm > 200 ? 200 : radiusKm}
                      onValueChange={(value) => setRadiusKm(Math.round(value))}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor="#E5E7EB"
                      thumbTintColor={colors.primary}
                    />
                    <Text style={styles.sliderMaxLabel}>200+</Text>
                  </View>
                  
                  <Text style={styles.radiusHint}>
                    {sortedContractors.length} online contractor{sortedContractors.length !== 1 ? 's' : ''} within {radiusKm >= 200 ? 'all distances' : `${radiusKm} km`}
                  </Text>
                </View>
                
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
              </View>
            )}
            {Platform.OS === 'web' && (
              <View style={styles.urgentMapSection}>
                <View style={styles.urgentMapHeader}>
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentBadgeEmoji}>⚡</Text>
                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                  </View>
                  <Text style={styles.urgentMapSubtitle}>Online contractors near you</Text>
                </View>
                
                {/* Distance Radius Slider */}
                <View style={styles.radiusSliderSection}>
                  <View style={styles.radiusSliderHeader}>
                    <Ionicons name="locate" size={18} color={colors.primary} />
                    <Text style={styles.radiusSliderLabel}>Search Radius</Text>
                    <View style={styles.radiusValueBadge}>
                      <Text style={styles.radiusValueText}>
                        {radiusKm >= 200 ? '200+ km' : `${radiusKm} km`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderMinLabel}>0</Text>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={200}
                      step={5}
                      value={radiusKm > 200 ? 200 : radiusKm}
                      onValueChange={(value) => setRadiusKm(Math.round(value))}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor="#E5E7EB"
                      thumbTintColor={colors.primary}
                    />
                    <Text style={styles.sliderMaxLabel}>200+</Text>
                  </View>
                  
                  <Text style={styles.radiusHint}>
                    {sortedContractors.length} online contractor{sortedContractors.length !== 1 ? 's' : ''} within {radiusKm >= 200 ? 'all distances' : `${radiusKm} km`}
                  </Text>
                </View>
                
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map" size={32} color={colors.primary} />
                  <Text style={styles.mapPlaceholderText}>Map view on mobile app</Text>
                </View>
              </View>
            )}

            {/* Post a Job - PLANNED Section - Professional Box Design */}
            <View style={styles.plannedSection}>
              <View style={styles.plannedCard}>
                <View style={styles.plannedCardHeader}>
                  <View style={styles.plannedBadge}>
                    <Text style={styles.plannedBadgeEmoji}>📋</Text>
                    <Text style={styles.plannedBadgeText}>PLANNED</Text>
                  </View>
                </View>
                
                <View style={styles.plannedCardContent}>
                  <View style={styles.plannedIconContainer}>
                    <Ionicons name="document-text-outline" size={32} color={colors.primary} />
                  </View>
                  <View style={styles.plannedTextContent}>
                    <Text style={styles.plannedTitle}>Post a Job for Quotes</Text>
                    <Text style={styles.plannedDescription}>
                      Not urgent? Describe your project and receive quotes from multiple contractors.
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.plannedActionBtn}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Sign In Required',
                        'You need to sign in or create an account to post a job.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Register', onPress: () => router.push('/?mode=register') },
                          { text: 'Sign In', onPress: () => router.push('/?mode=login'), style: 'default' },
                        ]
                      );
                    } else {
                      router.push('/post-job');
                    }
                  }}
                >
                  <Ionicons name="add-circle" size={20} color={colors.paper} />
                  <Text style={styles.plannedActionBtnText}>Post a Job</Text>
                </TouchableOpacity>
              </View>
            </View>

          {/* Categories - Multi-select */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse Categories</Text>
                {selectedCategories.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedCategories([])}>
                    <Text style={styles.clearCategoriesText}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                horizontal
                data={[{ name: 'All', icon: '🔍', color: '#666' }, ...CATEGORY_DATA]}
                renderItem={({ item }) => {
                  const isSelected = item.name === 'All' 
                    ? selectedCategories.length === 0 
                    : selectedCategories.includes(item.name);
                  return (
                    <TouchableOpacity 
                      style={[
                        item.name === 'All' ? styles.allCategoryChip : styles.categoryChip, 
                        isSelected && styles.categoryChipActive
                      ]}
                      onPress={() => {
                        if (item.name === 'All') {
                          setSelectedCategories([]);
                          setCategory('All');
                        } else {
                          toggleCategory(item.name);
                        }
                      }}
                    >
                      {item.name === 'All' ? (
                        <Text style={[styles.allCategoryText, isSelected && styles.categoryTextActive]}>All</Text>
                      ) : (
                        <>
                          <Text style={styles.categoryIcon}>{item.icon}</Text>
                          <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                            {item.name}
                          </Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={14} color={colors.green} style={{ marginLeft: 4 }} />}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                }}
                keyExtractor={item => item.name}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              />
              {selectedCategories.length > 0 && (
                <Text style={styles.selectedCategoriesCount}>{selectedCategories.length}/5 categories selected</Text>
              )}
            </View>

            {/* Available Contractors */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedCategories.length === 0 
                    ? 'Available Contractors' 
                    : selectedCategories.length === 1 
                      ? `${selectedCategories[0]}s` 
                      : selectedCategories.length === 2
                        ? `${selectedCategories[0]}s & ${selectedCategories[1]}s`
                        : `${selectedCategories.slice(0, -1).map(c => c + 's').join(', ')} & ${selectedCategories[selectedCategories.length - 1]}s`}
                </Text>
                <TouchableOpacity 
                  style={styles.filterBtn}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Ionicons name="options-outline" size={18} color={colors.primary} />
                  <Text style={styles.filterBtnText}>Filters</Text>
                  {(filterLicenseOnly || filterMinRating > 0 || filterLanguages.length > 0) && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {[filterLicenseOnly, filterMinRating > 0, filterLanguages.length > 0].filter(Boolean).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Filter Panel */}
              {showFilters && (
                <View style={styles.filterPanel}>
                  {/* License Filter */}
                  <TouchableOpacity 
                    style={styles.filterOption}
                    onPress={() => setFilterLicenseOnly(!filterLicenseOnly)}
                  >
                    <View style={[styles.filterCheckbox, filterLicenseOnly && styles.filterCheckboxActive]}>
                      {filterLicenseOnly && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.filterOptionText}>🪪 License on file only</Text>
                  </TouchableOpacity>
                  
                  {/* Rating Filter - Button that opens popup */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Minimum Rating</Text>
                    <TouchableOpacity 
                      style={styles.filterSelectBtn}
                      onPress={() => setShowRatingPopup(true)}
                    >
                      <View style={styles.filterSelectContent}>
                        {filterMinRating === 0 ? (
                          <Text style={styles.filterSelectText}>All Ratings</Text>
                        ) : (
                          <View style={styles.filterSelectRow}>
                            <Ionicons name="star" size={16} color="#FFB800" />
                            <Text style={styles.filterSelectText}>{filterMinRating}+ Stars</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Language Filter - Button that opens popup */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Language</Text>
                    <TouchableOpacity 
                      style={styles.filterSelectBtn}
                      onPress={() => setShowLanguagePopup(true)}
                    >
                      <View style={styles.filterSelectContent}>
                        {filterLanguages.length === 0 ? (
                          <Text style={styles.filterSelectText}>All Languages</Text>
                        ) : filterLanguages.length === 1 ? (
                          <Text style={styles.filterSelectText}>{filterLanguages[0]}</Text>
                        ) : (
                          <Text style={styles.filterSelectText}>{filterLanguages.length} Languages</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Clear Filters */}
                  {(filterLicenseOnly || filterMinRating > 0 || filterLanguages.length > 0) && (
                    <TouchableOpacity 
                      style={styles.clearFiltersBtn}
                      onPress={() => {
                        setFilterLicenseOnly(false);
                        setFilterMinRating(0);
                        setFilterLanguages([]);
                        setCustomLanguage('');
                      }}
                    >
                      <Text style={styles.clearFiltersBtnText}>Clear all filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <Text style={styles.resultCount}>{getCategoryCountsText}</Text>
              
              {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              ) : sortedContractors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>{getEmptyStateMessage}</Text>
                  <Text style={styles.emptySubtext}>Try adjusting your search radius or categories</Text>
                </View>
              ) : (
                sortedContractors.slice(0, 10).map(contractor => (
                  <View key={contractor.id}>
                    {renderContractorCard({ item: contractor })}
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Welcome Intent Modal - Professional design */}
      <Modal
        visible={showNeedPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNeedPrompt(false)}
      >
        <View style={styles.intentModalOverlay}>
          <View style={styles.intentModalContainer}>
            {/* Header with gradient accent */}
            <View style={styles.intentModalHeaderAccent} />
            
            <View style={styles.intentModalContent}>
              {/* Welcome Text */}
              <View style={styles.intentWelcomeSection}>
                <Text style={styles.intentWelcomeTitle}>Hi there! 👋</Text>
                <Text style={styles.intentWelcomeSubtitle}>How can we help you today?</Text>
              </View>
              
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.intentCloseBtn}
                onPress={() => setShowNeedPrompt(false)}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
              
              {/* Options */}
              <View style={styles.intentOptionsNew}>
                {/* Urgent Option - Green theme */}
                <TouchableOpacity 
                  style={styles.intentOptionCardNew}
                  onPress={() => {
                    setShowNeedPrompt(false);
                    router.push('/(tabs)/home');
                    setTimeout(() => setShowFullMap(true), 300);
                  }}
                >
                  <LinearGradient
                    colors={['#22C55E', '#16A34A']}
                    style={styles.intentOptionIconNew}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="flash" size={26} color="#fff" />
                  </LinearGradient>
                  <View style={styles.intentOptionTextNew}>
                    <Text style={styles.intentOptionTitleNew}>Need Help Now</Text>
                    <Text style={styles.intentOptionDescNew}>Find available contractors nearby</Text>
                  </View>
                  <View style={styles.intentOptionArrow}>
                    <Ionicons name="arrow-forward" size={18} color={colors.green} />
                  </View>
                </TouchableOpacity>
                
                {/* Planned Option - Orange theme */}
                <TouchableOpacity 
                  style={styles.intentOptionCardNew}
                  onPress={() => {
                    setShowNeedPrompt(false);
                    if (!user) {
                      Alert.alert(
                        'Sign In Required',
                        'You need to sign in or create an account to post a job.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Register', onPress: () => router.push('/?mode=register') },
                          { text: 'Sign In', onPress: () => router.push('/?mode=login'), style: 'default' },
                        ]
                      );
                    } else {
                      router.push('/post-job');
                    }
                  }}
                >
                  <LinearGradient
                    colors={['#FF6A00', '#FF8C33']}
                    style={styles.intentOptionIconNew}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="calendar" size={26} color="#fff" />
                  </LinearGradient>
                  <View style={styles.intentOptionTextNew}>
                    <Text style={styles.intentOptionTitleNew}>Plan a Project</Text>
                    <Text style={styles.intentOptionDescNew}>Post a job and compare quotes</Text>
                  </View>
                  <View style={styles.intentOptionArrow}>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>
              
              {/* Browse Option */}
              <TouchableOpacity 
                style={styles.intentBrowseBtn}
                onPress={() => setShowNeedPrompt(false)}
              >
                <Text style={styles.intentBrowseBtnText}>Just browsing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Guest Prompt Modal */}
      <Modal
        visible={showGuestPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestPrompt(false)}
      >
        <View style={styles.intentModalOverlay}>
          <View style={styles.intentModalContainer}>
            <View style={styles.intentModalHeader}>
              <Text style={styles.intentModalTitle}>Sign In Required</Text>
              <TouchableOpacity 
                style={styles.intentModalClose}
                onPress={() => setShowGuestPrompt(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.guestModalText}>
              You need to sign in or create an account to contact contractors.
            </Text>
            <View style={styles.guestModalButtons}>
              <TouchableOpacity 
                style={styles.guestModalBtnOutline}
                onPress={() => { setShowGuestPrompt(false); router.push('/?mode=register'); }}
              >
                <Text style={styles.guestModalBtnOutlineText}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.guestModalBtnPrimary}
                onPress={() => { setShowGuestPrompt(false); router.push('/?mode=login'); }}
              >
                <Text style={styles.guestModalBtnPrimaryText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Popup Modal */}
      <Modal
        visible={showRatingPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingPopup(false)}
      >
        <TouchableOpacity 
          style={styles.filterPopupOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRatingPopup(false)}
        >
          <View style={styles.filterPopupContainer}>
            <View style={styles.filterPopupHeader}>
              <Text style={styles.filterPopupTitle}>Minimum Rating</Text>
              <TouchableOpacity onPress={() => setShowRatingPopup(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterPopupList}>
              {RATING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterPopupItem,
                    filterMinRating === option.value && styles.filterPopupItemActive
                  ]}
                  onPress={() => {
                    setFilterMinRating(option.value);
                    setShowRatingPopup(false);
                  }}
                >
                  <View style={styles.filterPopupItemRow}>
                    {option.value > 0 && (
                      <View style={styles.filterPopupStars}>
                        {[...Array(option.value)].map((_, i) => (
                          <Ionicons key={i} name="star" size={16} color="#FFB800" />
                        ))}
                      </View>
                    )}
                    <Text style={[
                      styles.filterPopupItemText,
                      filterMinRating === option.value && styles.filterPopupItemTextActive
                    ]}>{option.label}</Text>
                  </View>
                  {filterMinRating === option.value && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Popup Modal - Multi-select */}
      <Modal
        visible={showLanguagePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePopup(false)}
      >
        <TouchableOpacity 
          style={styles.filterPopupOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLanguagePopup(false)}
        >
          <View style={[styles.filterPopupContainer, { maxHeight: 450 }]}>
            <View style={styles.filterPopupHeader}>
              <Text style={styles.filterPopupTitle}>Languages</Text>
              <View style={styles.filterPopupHeaderRight}>
                {filterLanguages.length > 0 && (
                  <TouchableOpacity onPress={() => setFilterLanguages([])}>
                    <Text style={styles.filterPopupClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowLanguagePopup(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.filterPopupList} showsVerticalScrollIndicator={true}>
              {LANGUAGE_OPTIONS.map((lang) => {
                const isSelected = filterLanguages.includes(lang);
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.filterPopupItem,
                      isSelected && styles.filterPopupItemActive
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setFilterLanguages(prev => prev.filter(l => l !== lang));
                      } else {
                        setFilterLanguages(prev => [...prev, lang]);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterPopupItemText,
                      isSelected && styles.filterPopupItemTextActive
                    ]}>{lang}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {filterLanguages.length > 0 && (
              <TouchableOpacity 
                style={styles.filterPopupDoneBtn}
                onPress={() => setShowLanguagePopup(false)}
              >
                <Text style={styles.filterPopupDoneBtnText}>Done ({filterLanguages.length} selected)</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen Map Modal - Complete Map Experience */}
      <Modal
        visible={showFullMap}
        animationType="slide"
        onRequestClose={() => setShowFullMap(false)}
      >
        <SafeAreaView style={styles.fullMapContainer}>
          {/* Header */}
          <View style={styles.fullMapHeader}>
            <TouchableOpacity 
              style={styles.fullMapBackBtn}
              onPress={() => setShowFullMap(false)}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.fullMapHeaderRow}>
              <View style={styles.urgentBadgeSmall}>
                <Text style={styles.urgentBadgeEmoji}>⚡</Text>
              </View>
              <Text style={styles.fullMapTitle}>Online Contractors</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          
          {/* Full Map */}
          <View style={styles.fullMapWebViewContainer}>
            {userLoc ? (
              <WebView 
                source={{ html: getMapHTML() }} 
                style={styles.fullMapWebView}
                onMessage={handleMapMessage}
                scrollEnabled={true}
              />
            ) : (
              <View style={styles.fullMapLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.fullMapLoadingText}>Getting your location...</Text>
              </View>
            )}
            
            {/* FAB - Show Select Service Menu */}
            <TouchableOpacity 
              style={styles.fullMapFab}
              onPress={() => setShowFullMapServiceMenu(!showFullMapServiceMenu)}
            >
              <Ionicons name={showFullMapServiceMenu ? "close" : "people"} size={24} color={colors.paper} />
            </TouchableOpacity>
            
            {/* Service Menu Popup - Multi-select */}
            {showFullMapServiceMenu && (
              <View style={styles.fullMapServiceMenu}>
                <View style={styles.fullMapServiceMenuHeader}>
                  <Text style={styles.fullMapServiceMenuTitle}>Select Services</Text>
                  {selectedCategories.length > 0 && (
                    <TouchableOpacity onPress={() => { setSelectedCategories([]); setShowFullMapServiceMenu(false); }}>
                      <Text style={styles.fullMapServiceMenuClear}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView style={styles.fullMapServiceMenuScroll} showsVerticalScrollIndicator={false}>
                  {CATEGORY_DATA.filter(c => c.name !== 'All').map((cat) => {
                    const isSelected = selectedCategories.includes(cat.name);
                    return (
                      <TouchableOpacity
                        key={cat.name}
                        style={[styles.fullMapServiceMenuItem, isSelected && styles.fullMapServiceMenuItemActive]}
                        onPress={() => toggleCategory(cat.name)}
                      >
                        <View style={styles.fullMapServiceMenuIconBg}>
                          <Text style={styles.fullMapServiceMenuIcon}>{cat.icon}</Text>
                        </View>
                        <Text style={[styles.fullMapServiceMenuItemText, isSelected && styles.fullMapServiceMenuItemTextActive]}>{cat.name}</Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.green} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {selectedCategories.length > 0 && (
                  <TouchableOpacity 
                    style={styles.fullMapServiceMenuDoneBtn}
                    onPress={() => setShowFullMapServiceMenu(false)}
                  >
                    <Text style={styles.fullMapServiceMenuDoneBtnText}>Done ({selectedCategories.length} selected)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          {/* Bottom Panel - Categories, Slider & Contractors */}
          <View style={styles.fullMapBottomPanel}>
            {/* Browse Categories - Multi-select up to 5 */}
            <View style={styles.fullMapCategoriesSection}>
              <View style={styles.fullMapCategoriesTitleRow}>
                <Text style={styles.fullMapCategoriesTitle}>Browse Categories</Text>
                {selectedCategories.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedCategories([])}>
                    <Text style={styles.fullMapCategoriesClear}>Clear all</Text>
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              >
                {CATEGORY_DATA.filter(c => c.name !== 'All').map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[
                        styles.fullMapCategoryChip,
                        isSelected && styles.fullMapCategoryChipActive
                      ]}
                      onPress={() => toggleCategory(cat.name)}
                    >
                      <Text style={styles.fullMapCategoryIcon}>{cat.icon}</Text>
                      <Text style={[
                        styles.fullMapCategoryText,
                        isSelected && styles.fullMapCategoryTextActive
                      ]}>{cat.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.green} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {selectedCategories.length > 0 && (
                <Text style={styles.fullMapSelectedCount}>{selectedCategories.length}/5 selected</Text>
              )}
            </View>
            
            {/* Radius Slider */}
            <View style={styles.fullMapSliderSection}>
              <View style={styles.radiusSliderHeader}>
                <Ionicons name="locate" size={18} color={colors.primary} />
                <Text style={styles.radiusSliderLabel}>Search Radius</Text>
                <View style={styles.radiusValueBadge}>
                  <Text style={styles.radiusValueText}>
                    {radiusKm >= 200 ? '200+ km' : `${radiusKm} km`}
                  </Text>
                </View>
              </View>
              
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderMinLabel}>0</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={200}
                  step={5}
                  value={radiusKm > 200 ? 200 : radiusKm}
                  onValueChange={(value) => setRadiusKm(Math.round(value))}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor={colors.primary}
                />
                <Text style={styles.sliderMaxLabel}>200+</Text>
              </View>
              
              <Text style={styles.fullMapContractorCount}>
                {getCategoryCountsText}
              </Text>
            </View>
            
            {/* Contractor List */}
            <ScrollView 
              style={styles.fullMapContractorList}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={sortedContractors.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingHorizontal: 16, gap: 12 }}
            >
              {sortedContractors.length === 0 ? (
                <View style={styles.fullMapEmptyState}>
                  <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
                  <Text style={styles.fullMapEmptyText}>{getEmptyStateMessage}</Text>
                </View>
              ) : (
                sortedContractors.slice(0, 10).map((contractor) => {
                  const initials = contractor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  return (
                    <TouchableOpacity 
                      key={contractor.id}
                      style={styles.fullMapContractorCard}
                      onPress={() => {
                        setShowFullMap(false);
                        router.push(`/contractor/${contractor.id}`);
                      }}
                    >
                      {contractor.profile_photo ? (
                        <Image source={{ uri: contractor.profile_photo }} style={styles.fullMapCardAvatar} />
                      ) : (
                        <View style={styles.fullMapCardAvatarPlaceholder}>
                          <Text style={styles.fullMapCardAvatarText}>{initials}</Text>
                        </View>
                      )}
                      <View style={styles.fullMapCardOnlineDot} />
                      <Text style={styles.fullMapCardName} numberOfLines={1}>{contractor.name}</Text>
                      <Text style={styles.fullMapCardType} numberOfLines={1}>{contractor.contractor_type}</Text>
                      {contractor.distance_km && (
                        <Text style={styles.fullMapCardDistance}>{contractor.distance_km.toFixed(1)} km</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

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
              <Text style={styles.serviceMenuTitle}>Select Services</Text>
              <View style={styles.serviceMenuHeaderRight}>
                {selectedCategories.length > 0 && (
                  <TouchableOpacity onPress={() => setSelectedCategories([])}>
                    <Text style={styles.serviceMenuClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeServiceMenu}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.serviceMenuList} showsVerticalScrollIndicator={false}>
              {CATEGORY_DATA.filter(c => c.name !== 'All').map((cat) => {
                const isSelected = selectedCategories.includes(cat.name);
                return (
                  <TouchableOpacity 
                    key={cat.name}
                    style={[
                      styles.serviceMenuItem,
                      isSelected && styles.serviceMenuItemSelected
                    ]}
                    onPress={() => selectCategory(cat.name)}
                  >
                    <Text style={styles.serviceMenuIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.serviceMenuText,
                      isSelected && styles.serviceMenuTextSelected
                    ]}>{cat.name}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedCategories.length > 0 && (
              <TouchableOpacity 
                style={styles.serviceMenuDoneBtn}
                onPress={closeServiceMenu}
              >
                <Text style={styles.serviceMenuDoneBtnText}>Done ({selectedCategories.length} selected)</Text>
              </TouchableOpacity>
            )}
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
            <Ionicons name={showServiceMenu ? "close" : "people"} size={28} color={colors.paper} />
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerRightColumn: {
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 16,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeToggleRow: {
    alignItems: 'flex-end',
    marginTop: -2,
    marginBottom: 8,
  },
  notificationBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBtnActive: {
    backgroundColor: 'rgba(255,215,0,0.3)',
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
  clearCategoriesText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedCategoriesCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: -8,
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
  // New contact action button styles (matching the reference image)
  contactButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    marginTop: 14,
  },
  contactActionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contactActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Guest prompt banner inside contractor card
  guestPromptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  guestPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  guestPromptText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  guestPromptLink: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    maxHeight: height * 0.55,
    paddingBottom: 30,
  },
  serviceMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceMenuHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  serviceMenuClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  serviceMenuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  serviceMenuList: {
    paddingHorizontal: 12,
  },
  serviceMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 6,
    gap: 10,
  },
  serviceMenuItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  serviceMenuIcon: {
    fontSize: 22,
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
  serviceMenuDoneBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  serviceMenuDoneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
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
  // Filter Styles
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  filterPanel: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  filterCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  filterGroup: {
    marginTop: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  ratingChipActive: {
    backgroundColor: colors.primary,
  },
  ratingChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  ratingChipTextActive: {
    color: '#fff',
  },
  languageOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  langChipActive: {
    backgroundColor: colors.primary,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  langChipTextActive: {
    color: '#fff',
  },
  customLanguageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  customLanguageInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.text,
  },
  clearCustomBtn: {
    padding: 4,
  },
  clearFiltersBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  // License & Language badges for contractor cards
  licenseBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  licenseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  languagesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  languagesBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Switch Mode Banner for contractors in client mode
  switchModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4C4',
  },
  switchModeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchModeBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#C45500',
  },
  switchModeBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C45500',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 3,
  },
  switchModeBannerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.paper,
  },
  // Post Job Button - Compact inline style
  postJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  postJobContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postJobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  postJobSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Switch mode prompt for contractors
  switchModePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  switchModePromptText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  switchModeLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  // Professional Intent Modal Styles
  intentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  intentModalContainer: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  intentModalHeaderAccent: {
    height: 6,
    backgroundColor: colors.primary,
  },
  intentModalContent: {
    padding: 24,
    paddingTop: 20,
  },
  intentWelcomeSection: {
    marginBottom: 24,
  },
  intentWelcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  intentWelcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  intentCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentOptionsNew: {
    gap: 14,
    marginBottom: 20,
  },
  intentOptionCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  intentOptionIconNew: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentOptionTextNew: {
    flex: 1,
    marginLeft: 14,
  },
  intentOptionTitleNew: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  intentOptionDescNew: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  intentOptionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentBrowseBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  intentBrowseBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Guest Modal Styles
  guestModalText: {
    fontSize: 15,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  guestModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  guestModalBtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  guestModalBtnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  guestModalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  guestModalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.paper,
  },
  // Urgent Map Section Styles
  urgentMapSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  urgentMapHeader: {
    marginBottom: 12,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  urgentBadgeEmoji: {
    fontSize: 14,
  },
  urgentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: 0.5,
  },
  urgentMapSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Sort Toggle Styles
  sortToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  sortChipActive: {
    backgroundColor: colors.green,
  },
  sortChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.paper,
  },
  // Map Legend Styles
  mapLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  mapLegendText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.paper,
  },
  // Post Job (Planned) Section Styles
  postJobSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  plannedBadgeRow: {
    marginBottom: 8,
  },
  plannedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  plannedBadgeEmoji: {
    fontSize: 14,
  },
  plannedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  postJobHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginLeft: 4,
  },
  // Distance Radius Filter Styles
  radiusFilterSection: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  radiusValueBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  radiusValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  radiusPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radiusPresetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    minWidth: 48,
    alignItems: 'center',
  },
  radiusPresetBtnActive: {
    backgroundColor: colors.primary,
  },
  radiusPresetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  radiusPresetTextActive: {
    color: colors.paper,
  },
  radiusHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
  // Radius Slider Styles
  radiusSliderSection: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusSliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  radiusSliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderMinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 24,
    textAlign: 'center',
  },
  sliderMaxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  // Professional Planned Section Styles
  plannedSection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  plannedCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FFE4D6',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  plannedCardHeader: {
    marginBottom: 16,
  },
  plannedCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  plannedIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF3EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plannedTextContent: {
    flex: 1,
  },
  plannedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  plannedDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  plannedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  plannedActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.paper,
  },
  // Full-Screen Map Modal Styles
  fullMapContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fullMapBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMapHeaderCenter: {
    alignItems: 'center',
  },
  fullMapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  fullMapWebViewContainer: {
    flex: 1,
  },
  fullMapWebView: {
    flex: 1,
  },
  fullMapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  fullMapLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fullMapBottomPanel: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  fullMapSliderSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  fullMapContractorCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
    textAlign: 'center',
    marginTop: 8,
  },
  fullMapContractorList: {
    maxHeight: 140,
  },
  fullMapEmptyState: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  fullMapEmptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fullMapContractorCard: {
    width: 110,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullMapCardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  fullMapCardAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fullMapCardAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  fullMapCardOnlineDot: {
    position: 'absolute',
    top: 50,
    right: 30,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.paper,
  },
  fullMapCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  fullMapCardType: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  fullMapCardDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  // Updated header styles for inline Urgent badge
  fullMapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // FAB Button styles
  fullMapFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Categories section in full map
  fullMapCategoriesSection: {
    marginBottom: 12,
  },
  fullMapCategoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  fullMapCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fullMapCategoryChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  fullMapCategoryIcon: {
    fontSize: 16,
  },
  fullMapCategoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  fullMapCategoryTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  // Service Menu in Full Map
  fullMapServiceMenu: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: colors.paper,
    borderRadius: 14,
    width: 240,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  fullMapServiceMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  fullMapServiceMenuScroll: {
    maxHeight: 200,
  },
  fullMapServiceMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fullMapServiceMenuItemActive: {
    backgroundColor: colors.primaryLight,
  },
  fullMapServiceMenuIconBg: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullMapServiceMenuIcon: {
    fontSize: 16,
  },
  fullMapServiceMenuItemText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  fullMapServiceMenuItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  // Additional multi-select styles
  fullMapCategoriesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  fullMapCategoriesClear: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  fullMapSelectedCount: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  fullMapServiceMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fullMapServiceMenuClear: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  fullMapServiceMenuDoneBtn: {
    backgroundColor: colors.primary,
    margin: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullMapServiceMenuDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.paper,
  },
  // Filter Popup Modal Styles
  filterPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterPopupContainer: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    maxHeight: 380,
    overflow: 'hidden',
  },
  filterPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPopupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filterPopupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  filterPopupClearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  filterPopupList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterPopupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  filterPopupItemActive: {
    backgroundColor: colors.primaryLight,
  },
  filterPopupItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterPopupStars: {
    flexDirection: 'row',
    gap: 2,
  },
  filterPopupItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  filterPopupItemTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  filterPopupDoneBtn: {
    backgroundColor: colors.primary,
    margin: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterPopupDoneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.paper,
  },
  // Filter Select Button styles
  filterSelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSelectContent: {
    flex: 1,
  },
  filterSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterSelectText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
});
