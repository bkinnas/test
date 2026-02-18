import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { StarRating } from '../../components/common/StarRating';
import { Avatar } from '../../components/common/Avatar';
import { ServiceCard } from '../../components/booking/ServiceCard';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format } from 'date-fns';

export function LocalProfileScreen({ route, navigation }) {
  const { localId } = route.params;
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getLocal(localId);
        setProfile(data.profile);
        setServices(data.services);
        setReviews(data.reviews);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [localId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Cover photo */}
      {profile.cover_photo_url ? (
        <Image source={{ uri: profile.cover_photo_url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverEmoji}>🌆</Text>
        </View>
      )}

      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Avatar uri={profile.avatar_url} name={profile.name} size={72} />
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.city}>📍 {profile.city}{profile.location_text ? ` · ${profile.location_text}` : ''}</Text>

        {/* Rating summary */}
        <View style={styles.ratingRow}>
          <StarRating
            rating={profile.avg_rating || 0}
            size={20}
            showCount
            count={profile.total_reviews}
          />
        </View>

        {profile.tagline ? <Text style={styles.tagline}>{profile.tagline}</Text> : null}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      </View>

      {/* Services section */}
      {services.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          {services.map((svc) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onPress={(s) => navigation.navigate('ServiceDetail', { serviceId: s.id, localId })}
            />
          ))}
        </View>
      )}

      {/* Reviews section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Reviews ({reviews.length})
        </Text>
        {reviews.length === 0 ? (
          <Text style={styles.noReviews}>No reviews yet — be the first!</Text>
        ) : (
          reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))
        )}
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

function ReviewItem({ review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar uri={review.reviewer_avatar} name={review.reviewer_name} size={36} />
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
          <Text style={styles.reviewDate}>
            {format(new Date(review.created_at), 'MMM d, yyyy')}
          </Text>
        </View>
        <StarRating rating={review.rating} size={14} />
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  cover: {
    width: '100%',
    height: 220,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 64,
  },
  profileHeader: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    marginTop: -36,
    borderWidth: 4,
    borderColor: Colors.surface,
    borderRadius: 9999,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  name: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  city: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  bio: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  noReviews: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.md,
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewMeta: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  reviewerName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
