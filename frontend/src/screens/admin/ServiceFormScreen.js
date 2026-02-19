import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const SERVICE_TYPES = [
  { key: 'email', label: 'Email Consultation', emoji: '✉', desc: 'Answer questions via email' },
  { key: 'message', label: 'In-App Message', emoji: '💬', desc: 'Real-time chat through the app' },
  { key: 'tour', label: 'Guided Tour', emoji: '🗺', desc: 'In-person experience with a set date & time' },
];

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000/api`;
  return 'http://localhost:3000/api';
}

export function ServiceFormScreen({ route, navigation }) {
  const existing = route.params?.service;

  const [type, setType] = useState(existing?.type || 'tour');
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [duration, setDuration] = useState(existing?.duration_minutes ? String(existing.duration_minutes) : '');
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState(existing?.photos || []);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for your service.');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        duration_minutes: duration ? Number(duration) : null,
      };

      if (existing) {
        await api.updateService(existing.id, payload);
      } else {
        await api.createService(payload);
      }

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save service.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploadingPhotos(true);
      try {
        const formData = new FormData();
        result.assets.forEach((asset, i) => {
          formData.append('photos', {
            uri: asset.uri,
            name: `photo_${i}.jpg`,
            type: 'image/jpeg',
          });
        });

        const token = await SecureStore.getItemAsync('auth_token');
        const BASE_URL = getBaseUrl();
        const response = await fetch(`${BASE_URL}/services/${existing.id}/photos`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setPhotos(data.photos || []);
          Alert.alert('Uploaded', 'Photos added successfully.');
        } else {
          Alert.alert('Upload Failed', data.error || 'Please try again.');
        }
      } catch (err) {
        Alert.alert('Error', err.message || 'Upload failed.');
      } finally {
        setUploadingPhotos(false);
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service type */}
        <Text style={styles.sectionLabel}>Service Type</Text>
        <View style={styles.typeGrid}>
          {SERVICE_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeCard, type === t.key && styles.typeCardActive]}
              onPress={() => setType(t.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.key && styles.typeLabelActive]}>
                {t.label}
              </Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <Input
          label="Title *"
          value={title}
          onChangeText={setTitle}
          placeholder={
            type === 'tour'
              ? 'e.g. Hidden Gems Tour of Downtown Austin'
              : type === 'email'
              ? 'e.g. Local Insider Tips via Email'
              : 'e.g. 30-minute Local Advice Chat'
          }
          maxLength={100}
        />

        {/* Description */}
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder={
            type === 'tour'
              ? 'Describe the places you will visit, what users will see and do, meeting point, etc.'
              : 'Describe what users will get from this service.'
          }
          multiline
          numberOfLines={6}
          maxLength={2000}
        />

        {/* Price + Duration row */}
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: Spacing.sm }}>
            <Input
              label="Price (USD) *"
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 45"
              keyboardType="decimal-pad"
              autoCapitalize="none"
            />
          </View>
          {type === 'tour' || type === 'message' ? (
            <View style={{ flex: 1 }}>
              <Input
                label="Duration (minutes)"
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g. 120"
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </View>

        {/* Photos section — only shown when editing an existing service */}
        {existing ? (
          <View style={styles.photosSection}>
            <Text style={styles.sectionLabel}>Service Photos</Text>
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosScroll}
              >
                {photos.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.addPhotosButton}
              onPress={handleAddPhotos}
              disabled={uploadingPhotos}
              activeOpacity={0.8}
            >
              <Text style={styles.addPhotosText}>
                {uploadingPhotos ? '⏳ Uploading...' : '📷 Add Photos'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.photosHint}>
              Up to 8 photos total. Great photos help attract more bookings.
            </Text>
          </View>
        ) : (
          /* Tips box — only shown for new services */
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>
              {type === 'tour'
                ? '📸 Tour Tips'
                : type === 'email'
                ? '✉ Email Tips'
                : '💡 Message Tips'}
            </Text>
            <Text style={styles.tipText}>
              {type === 'tour'
                ? 'After creating, come back to edit this service to upload tour photos.'
                : type === 'email'
                ? 'Users will provide their email on purchase. Include your typical response time in the description.'
                : 'Once booked, users can message you directly through the app. Set a clear expectation for your availability.'}
            </Text>
          </View>
        )}

        <Button
          title={existing ? 'Save Changes' : 'Create Service'}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  sectionLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  typeGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  typeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF2FA',
  },
  typeEmoji: { fontSize: 24, marginBottom: Spacing.xs },
  typeLabel: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  typeLabelActive: { color: Colors.primary },
  typeDesc: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  row: { flexDirection: 'row' },
  tipBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  tipTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tipText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  photosSection: {
    marginBottom: Spacing.md,
  },
  photosScroll: {
    marginBottom: Spacing.sm,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
  },
  addPhotosButton: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  addPhotosText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.md,
  },
  photosHint: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
