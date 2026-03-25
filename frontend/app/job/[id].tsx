import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { useAuth } from '../../src/auth-context';

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

// Trade icons mapping
const tradeIcons: Record<string, string> = {
  'Electrician': 'flash',
  'Plumber': 'water',
  'Carpenter': 'construct',
  'Painter': 'color-palette',
  'HVAC': 'thermometer',
  'Roofer': 'home',
  'Landscaper': 'leaf',
  'General Contractor': 'build',
  'Handyman': 'hammer',
  'Cleaner': 'sparkles',
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

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.job);
      setEditDescription(res.job?.description || '');
      setEditLocation(res.job?.location || '');
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
      });
      setJob({ ...job, description: editDescription.trim(), location: editLocation.trim() });
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

  const iconName = tradeIcons[job.category] || 'build';

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
          {/* Job Icon & Category */}
          <View style={s.categoryCard}>
            <View style={s.categoryIcon}>
              <Ionicons name={iconName as any} size={32} color={colors.primary} />
            </View>
            <Text style={s.categoryText}>{job.category}</Text>
            {getStatusBadge()}
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
    borderRadius: 20,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  categoryCard: {
    backgroundColor: colors.paper,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
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
  metaText: {
    fontSize: 15,
    color: colors.text,
  },
  responseCount: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.paper,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.redLight,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.red,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  confirmedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.green,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.blue,
  },
});
