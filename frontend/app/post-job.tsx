import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../src/api';
import { useAuth } from '../src/auth-context';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  red: '#EF4444',
  border: '#E5E7EB',
};

const CATEGORIES = [
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
  { name: 'Flooring Specialist', icon: '🪵' },
  { name: 'Mason', icon: '🧱' },
];

const URGENCY_OPTIONS = [
  { id: 'urgent', label: 'Urgent', sublabel: 'Need help ASAP', icon: '🔥' },
  { id: 'normal', label: 'Normal', sublabel: 'Within a few days', icon: '📅' },
  { id: 'flexible', label: 'Flexible', sublabel: 'No rush', icon: '🕐' },
];

export default function PostJobScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [urgency, setUrgency] = useState('normal');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (address) {
          setLocationAddress(`${address.street || ''} ${address.city || ''}, ${address.region || ''}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit reached', 'You can add up to 5 photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhotos([...photos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your job');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Location is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/jobs', {
        category,
        description: description.trim(),
        photos,
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: locationAddress,
        urgency,
      });
      
      Alert.alert(
        'Job Posted! 🎉',
        'Your job has been sent to nearby contractors. You\'ll be notified when they respond.',
        [{ text: 'OK', onPress: () => router.push('/my-jobs') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What do you need help with?</Text>
      <Text style={styles.stepSubtitle}>Select a category</Text>
      
      <View style={styles.categoriesGrid}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.name}
            style={[styles.categoryCard, category === cat.name && styles.categoryCardActive]}
            onPress={() => setCategory(cat.name)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text style={[styles.categoryName, category === cat.name && styles.categoryNameActive]}>
              {cat.name}
            </Text>
            {category === cat.name && (
              <View style={styles.checkMark}>
                <Ionicons name="checkmark" size={14} color={colors.paper} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Describe the job</Text>
      <Text style={styles.stepSubtitle}>Be specific so contractors understand what you need</Text>
      
      <TextInput
        style={styles.descriptionInput}
        placeholder="Example: I need to fix a leaky faucet in my kitchen. The faucet drips constantly and I think the washer needs to be replaced..."
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
      />
      
      <Text style={styles.photoLabel}>Add photos (optional)</Text>
      <View style={styles.photosRow}>
        {photos.map((photo, index) => (
          <View key={index} style={styles.photoContainer}>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(index)}>
              <Ionicons name="close" size={16} color={colors.paper} />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 5 && (
          <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
            <Ionicons name="camera" size={24} color={colors.textSecondary} />
            <Text style={styles.addPhotoText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How urgent is this?</Text>
      <Text style={styles.stepSubtitle}>Let contractors know your timeline</Text>
      
      {URGENCY_OPTIONS.map(option => (
        <TouchableOpacity
          key={option.id}
          style={[styles.urgencyOption, urgency === option.id && styles.urgencyOptionActive]}
          onPress={() => setUrgency(option.id)}
        >
          <Text style={styles.urgencyIcon}>{option.icon}</Text>
          <View style={styles.urgencyInfo}>
            <Text style={[styles.urgencyLabel, urgency === option.id && styles.urgencyLabelActive]}>
              {option.label}
            </Text>
            <Text style={styles.urgencySublabel}>{option.sublabel}</Text>
          </View>
          {urgency === option.id && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
      ))}
      
      <View style={styles.locationSection}>
        <Text style={styles.locationLabel}>Job Location</Text>
        <View style={styles.locationBox}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={styles.locationText} numberOfLines={2}>
            {locationAddress || 'Detecting your location...'}
          </Text>
          <TouchableOpacity onPress={getLocation}>
            <Ionicons name="refresh" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review your job</Text>
      <Text style={styles.stepSubtitle}>Make sure everything looks good</Text>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Category</Text>
          <Text style={styles.reviewValue}>{category}</Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Urgency</Text>
          <Text style={styles.reviewValue}>
            {URGENCY_OPTIONS.find(o => o.id === urgency)?.label}
          </Text>
        </View>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Location</Text>
          <Text style={styles.reviewValue} numberOfLines={2}>{locationAddress}</Text>
        </View>
        <View style={styles.reviewDescSection}>
          <Text style={styles.reviewLabel}>Description</Text>
          <Text style={styles.reviewDescription}>{description}</Text>
        </View>
        {photos.length > 0 && (
          <View style={styles.reviewPhotos}>
            <Text style={styles.reviewLabel}>Photos ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo, i) => (
                <Image key={i} source={{ uri: photo }} style={styles.reviewPhoto} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Your job will be sent to nearby contractors who match your category. 
          You'll receive notifications when they respond.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={styles.headerRight}>
            <Text style={styles.stepIndicator}>Step {step} of 4</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step < 4 ? (
            <TouchableOpacity
              style={[styles.nextBtn, (!category && step === 1) && styles.btnDisabled]}
              onPress={() => setStep(step + 1)}
              disabled={(!category && step === 1) || (!description.trim() && step === 2)}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.paper} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.paper} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Post Job</Text>
                  <Ionicons name="checkmark" size={20} color={colors.paper} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  stepIndicator: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: colors.primary,
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionInput: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhoto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  urgencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  urgencyOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  urgencyIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  urgencyInfo: {
    flex: 1,
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  urgencyLabelActive: {
    color: colors.primary,
  },
  urgencySublabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationSection: {
    marginTop: 24,
  },
  locationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  reviewCard: {
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  reviewDescSection: {
    paddingTop: 12,
  },
  reviewDescription: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    lineHeight: 20,
  },
  reviewPhotos: {
    marginTop: 16,
  },
  reviewPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.green,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.paper,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
