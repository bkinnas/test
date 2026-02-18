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
} from 'react-native';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const SERVICE_TYPES = [
  { key: 'email', label: 'Email Consultation', emoji: '✉', desc: 'Answer questions via email' },
  { key: 'message', label: 'In-App Message', emoji: '💬', desc: 'Real-time chat through the app' },
  { key: 'tour', label: 'Guided Tour', emoji: '🗺', desc: 'In-person experience with a set date & time' },
];

export function ServiceFormScreen({ route, navigation }) {
  const existing = route.params?.service;

  const [type, setType] = useState(existing?.type || 'tour');
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [price, setPrice] = useState(existing?.price ? String(existing.price) : '');
  const [duration, setDuration] = useState(existing?.duration_minutes ? String(existing.duration_minutes) : '');
  const [loading, setLoading] = useState(false);

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

        {/* Tips by type */}
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
              ? 'You can upload photos after creating the service. Use the "Services" tab to manage your listings and upload tour photos.'
              : type === 'email'
              ? 'Users will provide their email on purchase. Include your typical response time in the description.'
              : 'Once booked, users can message you directly through the app. Set a clear expectation for your availability.'}
          </Text>
        </View>

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
});
