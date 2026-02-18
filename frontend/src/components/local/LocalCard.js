import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { StarRating } from '../common/StarRating';
import { Avatar } from '../common/Avatar';

const SERVICE_TYPE_LABELS = {
  email: '✉ Email',
  message: '💬 Message',
  tour: '🗺 Tour',
};

export function LocalCard({ local, onPress }) {
  const services = local.services_preview || [];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(local)}
      activeOpacity={0.88}
    >
      {/* Cover photo */}
      <View style={styles.imageContainer}>
        {local.cover_photo_url ? (
          <Image source={{ uri: local.cover_photo_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>📍</Text>
          </View>
        )}
        {/* Distance badge */}
        {local.distance_miles != null && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>
              {Number(local.distance_miles).toFixed(1)} mi
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Header row: avatar + name + city */}
        <View style={styles.header}>
          <Avatar uri={local.avatar_url} name={local.name} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{local.name}</Text>
            <Text style={styles.city} numberOfLines={1}>
              📍 {local.city}
              {local.location_text ? ` · ${local.location_text}` : ''}
            </Text>
          </View>
        </View>

        {/* Tagline */}
        {local.tagline ? (
          <Text style={styles.tagline} numberOfLines={2}>{local.tagline}</Text>
        ) : null}

        {/* Services chips */}
        {services.length > 0 && (
          <View style={styles.services}>
            {services.map((svc, i) => (
              <View key={i} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>
                  {SERVICE_TYPE_LABELS[svc.type] || svc.type}
                </Text>
                <Text style={styles.servicePrice}> ${Number(svc.price).toFixed(0)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Rating row */}
        <View style={styles.ratingRow}>
          <StarRating
            rating={local.avg_rating || 0}
            size={14}
            showCount
            count={local.total_reviews}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 40,
  },
  distanceBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.overlay,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  distanceText: {
    color: '#FFF',
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  name: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  city: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tagline: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  serviceChipText: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  servicePrice: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeights.bold,
  },
  ratingRow: {
    marginTop: Spacing.xs,
  },
});
