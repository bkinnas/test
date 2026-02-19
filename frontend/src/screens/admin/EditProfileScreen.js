import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { StarRating } from '../../components/common/StarRating';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState(null);
  const [bio, setBio] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getMyProfile();
        setProfile(data);
        setBio(data.bio || '');
        setTagline(data.tagline || '');
        setCity(data.city || '');
        setLocationText(data.location_text || '');
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.updateMyProfile({
        bio: bio.trim() || null,
        tagline: tagline.trim() || null,
        city: city.trim(),
        location_text: locationText.trim() || null,
      });
      setProfile(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickCoverPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploadingPhoto(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('photo', {
          uri: asset.uri,
          name: 'cover.jpg',
          type: 'image/jpeg',
        });

        const token = await SecureStore.getItemAsync('auth_token');
        const response = await fetch(`${BASE_URL}/locals/my/cover-photo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const data = await response.json();
        if (response.ok) {
          setProfile((prev) => ({ ...prev, cover_photo_url: data.cover_photo_url }));
          Alert.alert('Uploaded', 'Cover photo updated.');
        } else {
          Alert.alert('Upload Failed', data.error || 'Please try again.');
        }
      } catch (err) {
        Alert.alert('Error', err.message || 'Upload failed.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  }

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.textMuted }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>My Profile</Text>
            <TouchableOpacity onPress={() => useAuthStore.getState().logout()}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Cover photo */}
          <TouchableOpacity
            style={styles.coverContainer}
            onPress={handlePickCoverPhoto}
            disabled={uploadingPhoto}
            activeOpacity={0.85}
          >
            {profile.cover_photo_url ? (
              <Image source={{ uri: profile.cover_photo_url }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverPlaceholderText}>🌆</Text>
              </View>
            )}
            <View style={styles.coverOverlay}>
              <Text style={styles.coverOverlayText}>
                {uploadingPhoto ? 'Uploading...' : '📷 Change Cover Photo'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Profile summary */}
          <View style={styles.profileMeta}>
            <Avatar uri={user?.avatar_url} name={user?.name} size={64} />
            <View style={styles.profileMetaText}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <StarRating
                rating={profile.avg_rating || 0}
                size={14}
                showCount
                count={profile.total_reviews}
              />
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="City *"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Austin, TX"
            />
            <Input
              label="Neighborhood / Area"
              value={locationText}
              onChangeText={setLocationText}
              placeholder="e.g. South Congress, Downtown"
            />
            <Input
              label="Tagline"
              value={tagline}
              onChangeText={setTagline}
              placeholder="e.g. Born and raised Austinite — I know every hidden gem."
              maxLength={120}
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell visitors about yourself, your interests, and what makes you the perfect local guide..."
              multiline
              numberOfLines={6}
              maxLength={1000}
            />

            <Button
              title="Save Profile"
              onPress={handleSave}
              loading={saving}
              size="lg"
            />
          </View>

          <View style={{ height: Spacing['2xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  logoutText: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm },
  coverContainer: {
    position: 'relative',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 160, borderRadius: Radius.xl },
  coverPlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: { fontSize: 48 },
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.overlay,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  coverOverlayText: {
    color: '#fff',
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  profileMetaText: { flex: 1 },
  profileName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  form: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
});
