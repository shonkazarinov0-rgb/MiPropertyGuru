import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';
import { TRADES, getTradeIcon } from '../../src/constants/trades';

const colors = {
  primary: '#FF6A00',
  primaryLight: '#FFF3EB',
  background: '#F7F7F7',
  paper: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  green: '#22C55E',
  greenLight: '#DCFCE7',
  blue: '#3B82F6',
  blueLight: '#DBEAFE',
  red: '#EF4444',
  redLight: '#FEE2E2',
  border: '#E5E7EB',
};

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editTradeRequired, setEditTradeRequired] = useState('');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.job);
      setEditDescription(res.job?.description || '');
      setEditLocation(res.job?.location || '');
      setEditBudget(res.job?.budget || '');
      setEditTradeRequired(res.job?.trade_required || res.job?.category || '');
      setEditPhotos(res.job?.photos || []);
    } catch (e) {
      console.error('Error fetching job:', e);
      Alert.alert('Error', 'Could not load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editDescription.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.put(`/jobs/${id}`, {
        description: editDescription.trim(),
        location: editLocation.trim(),
        budget: editBudget.trim(),
        trade_required: editTradeRequired,
        photos: editPhotos,
      });
      setJob({ 
        ...job, 
        description: editDescription.trim(), 
        location: editLocation.trim(),
        budget: editBudget.trim(),
        trade_required: editTradeRequired,
        photos: editPhotos,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Job updated');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update job');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/jobs/${id}`);
              router.back();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete job');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    if (editPhotos.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 photos');
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
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setEditPhotos([...editPhotos, base64Image]);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...editPhotos];
            newPhotos.splice(index, 1);
            setEditPhotos(newPhotos);
          }
        }
      ]
    );
  };

  const getTimestamp = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    if (job?.status === 'completed') {
      return (
        <View style={s.completedBadge}>
          <Ionicons name="checkmark-done" size={14} color={colors.blue} />
          <Text style={s.completedBadgeText}>Completed</Text>
        </View>
      );
    }
    if (job?.status === 'confirmed') {
      return (
        <View style={s.confirmedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.green} />
          <Text style={s.confirmedBadgeText}>In Progress</Text>
        </View>
      );
    }
    return (
      <View style={s.pendingBadge}>
        <Ionicons name="time-outline" size={14} color={colors.primary} />
        <Text style={s.pendingBadgeText}>Pending</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <Text style={s.errorText}>Job not found</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tradeRequired = job.trade_required || job.category || 'General';
  const tradeEmoji = getTradeIcon(tradeRequired);
  const photos = isEditing ? editPhotos : (job.photos || []);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBackBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Job Details</Text>
          <View style={s.headerActions}>
            {!isEditing && job.status !== 'completed' && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={s.editBtn}>
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={s.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* Trade Required Section */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Trade Required</Text>
            {isEditing ? (
              <TouchableOpacity 
                style={s.tradeSelector}
                onPress={() => setShowTradeModal(true)}
              >
                <View style={s.tradeSelectorContent}>
                  <Text style={s.tradeEmojiSmall}>{getTradeIcon(editTradeRequired)}</Text>
                  <Text style={s.tradeSelectorText}>
                    {editTradeRequired || 'Select trade...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View style={s.tradeCard}>
                <View style={s.tradeIconBig}>
                  <Text style={s.tradeEmojiBig}>{tradeEmoji}</Text>
                </View>
                <View>
                  <Text style={s.tradeText}>{tradeRequired}</Text>
                  <Text style={s.tradeSubtext}>Looking for this trade</Text>
                </View>
                {getStatusBadge()}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Description</Text>
            {isEditing ? (
              <TextInput
                style={s.textArea}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={5}
                placeholder="Describe your job..."
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={s.card}>
                <Text style={s.descriptionText}>{job.description}</Text>
              </View>
            )}
          </View>

          {/* Photos Section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Photos</Text>
              <Text style={s.photoCount}>{photos.length}/10</Text>
            </View>
            
            {photos.length > 0 ? (
              <View style={s.photoGrid}>
                {photos.map((photo: string, index: number) => (
                  <TouchableOpacity 
                    key={index} 
                    style={s.photoItem}
                    onPress={() => setPreviewImage(photo)}
                  >
                    <Image source={{ uri: photo }} style={s.photo} />
                    {isEditing && (
                      <TouchableOpacity 
                        style={s.removePhotoBtn}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color={colors.red} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
                {isEditing && photos.length < 10 && (
                  <TouchableOpacity style={s.addPhotoBtn} onPress={pickImage}>
                    <Ionicons name="add" size={28} color={colors.primary} />
                    <Text style={s.addPhotoText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              isEditing ? (
                <TouchableOpacity style={s.noPhotosAdd} onPress={pickImage}>
                  <Ionicons name="images-outline" size={40} color={colors.textSecondary} />
                  <Text style={s.noPhotosText}>Add photos to help contractors understand the job</Text>
                  <View style={s.addPhotoBtnLarge}>
                    <Ionicons name="add" size={18} color={colors.paper} />
                    <Text style={s.addPhotoBtnLargeText}>Add Photos</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={s.noPhotos}>
                  <Ionicons name="images-outline" size={32} color={colors.textSecondary} />
                  <Text style={s.noPhotosTextSmall}>No photos attached</Text>
                </View>
              )
            )}
          </View>

          {/* Location */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Location</Text>
            {isEditing ? (
              <TextInput
                style={s.input}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Enter location..."
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={s.card}>
                <View style={s.locationRow}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <Text style={s.locationText}>{job.location || 'Not specified'}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Budget */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Budget</Text>
            {isEditing ? (
              <TextInput
                style={s.input}
                value={editBudget}
                onChangeText={setEditBudget}
                placeholder="Enter budget (e.g., 500)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            ) : (
              <View style={s.card}>
                <View style={s.budgetRow}>
                  <Ionicons name="cash" size={18} color={colors.green} />
                  <Text style={s.budgetText}>
                    {job.budget ? `$${job.budget}` : 'Not specified'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Meta Info */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Posted</Text>
            <View style={s.card}>
              <Text style={s.metaText}>{getTimestamp(job.created_at)}</Text>
            </View>
          </View>

          {/* Responses count */}
          {job.responses && job.responses.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Responses</Text>
              <View style={s.card}>
                <Text style={s.responseCount}>{job.responses.length} contractor(s) interested</Text>
              </View>
            </View>
          )}

          {/* Edit Actions */}
          {isEditing && (
            <View style={s.editActions}>
              <TouchableOpacity 
                style={s.cancelBtn} 
                onPress={() => {
                  setIsEditing(false);
                  setEditDescription(job.description || '');
                  setEditLocation(job.location || '');
                  setEditBudget(job.budget || '');
                  setEditTradeRequired(job.trade_required || job.category || '');
                  setEditPhotos(job.photos || []);
                }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.saveBtn, saving && s.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.paper} />
                ) : (
                  <Text style={s.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Button */}
          {!isEditing && job.status !== 'confirmed' && job.status !== 'completed' && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.red} />
              <Text style={s.deleteBtnText}>Delete Job</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Trade Selection Modal */}
        <Modal
          visible={showTradeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTradeModal(false)}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Select Trade</Text>
                <TouchableOpacity onPress={() => setShowTradeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.tradeList}>
                {TRADES.map((trade) => (
                  <TouchableOpacity
                    key={trade.name}
                    style={[
                      s.tradeOption,
                      editTradeRequired === trade.name && s.tradeOptionSelected
                    ]}
                    onPress={() => {
                      setEditTradeRequired(trade.name);
                      setShowTradeModal(false);
                    }}
                  >
                    <Text style={s.tradeEmojiIcon}>{trade.icon}</Text>
                    <Text style={[
                      s.tradeOptionText,
                      editTradeRequired === trade.name && s.tradeOptionTextSelected
                    ]}>
                      {trade.name}
                    </Text>
                    {editTradeRequired === trade.name && (
                      <Ionicons name="checkmark" size={20} color={colors.paper} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={!!previewImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={s.previewOverlay}>
            <TouchableOpacity 
              style={s.previewClose}
              onPress={() => setPreviewImage(null)}
            >
              <Ionicons name="close-circle" size={36} color={colors.paper} />
            </TouchableOpacity>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={s.previewImage} resizeMode="contain" />
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: colors.paper,
    fontWeight: '600',
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
  headerBackBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerActions: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
  },
  tradeCard: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeIconBig: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tradeSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tradeSelector: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tradeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  textArea: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    color: colors.text,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.green,
  },
  tradeEmojiIcon: {
    fontSize: 24,
  },
  tradeEmojiBig: {
    fontSize: 28,
  },
  tradeEmojiSmall: {
    fontSize: 20,
  },
  metaText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  responseCount: {
    fontSize: 15,
    color: colors.green,
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  confirmedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },
  // Photo styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.paper,
    borderRadius: 12,
  },
  addPhotoBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
  },
  addPhotoText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 4,
  },
  noPhotosAdd: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  noPhotosText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  addPhotoBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addPhotoBtnLargeText: {
    color: colors.paper,
    fontWeight: '600',
    fontSize: 14,
  },
  noPhotos: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noPhotosTextSmall: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.paper,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.redLight,
    marginTop: 20,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.red,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tradeList: {
    padding: 8,
  },
  tradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  tradeOptionSelected: {
    backgroundColor: colors.primary,
  },
  tradeOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tradeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  tradeOptionTextSelected: {
    color: colors.paper,
  },
  // Preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
