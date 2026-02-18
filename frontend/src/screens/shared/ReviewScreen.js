import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { StarRating } from '../../components/common/StarRating';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export function ReviewScreen({ route, navigation }) {
  const { bookingId, localProfileId } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Please tap the stars to rate your experience.');
      return;
    }
    setLoading(true);
    try {
      await api.submitReview({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      Alert.alert(
        'Thank you!',
        'Your review has been submitted and helps other travelers.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      if (err.status === 409) {
        Alert.alert('Already reviewed', 'You have already submitted a review for this booking.');
        navigation.goBack();
      } else {
        Alert.alert('Error', err.message || 'Failed to submit review.');
      }
    } finally {
      setLoading(false);
    }
  }

  const RATING_LABELS = {
    0: 'Tap to rate',
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent!',
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroTitle}>How was your experience?</Text>
          <Text style={styles.heroSubtitle}>
            Your honest review helps other travelers and rewards great locals.
          </Text>
        </View>

        {/* Star rating */}
        <View style={styles.ratingContainer}>
          <StarRating rating={rating} size={44} onRate={setRating} />
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
        </View>

        {/* Comment */}
        <View style={styles.commentContainer}>
          <Input
            label="Tell us more (optional)"
            value={comment}
            onChangeText={setComment}
            placeholder="What did you love? What could be better? What tips would you give other travelers?"
            multiline
            numberOfLines={6}
            maxLength={1000}
          />
          {comment.length > 0 && (
            <Text style={styles.charCount}>{comment.length}/1000</Text>
          )}
        </View>

        <Button
          title="Submit Review"
          onPress={handleSubmit}
          loading={loading}
          disabled={rating === 0}
          size="lg"
        />

        <Button
          title="Skip"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="md"
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  ratingContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  ratingLabel: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  commentContainer: {
    marginBottom: Spacing.md,
  },
  charCount: {
    textAlign: 'right',
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
});
