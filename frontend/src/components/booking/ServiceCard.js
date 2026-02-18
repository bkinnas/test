import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const TYPE_ICONS = {
  email: '✉',
  message: '💬',
  tour: '🗺',
};

const TYPE_LABELS = {
  email: 'Email Consultation',
  message: 'In-App Message',
  tour: 'Guided Tour',
};

export function ServiceCard({ service, onPress }) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(service)}
      activeOpacity={0.88}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{TYPE_ICONS[service.type] || '🔹'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.typeLabel}>{TYPE_LABELS[service.type] || service.type}</Text>
        <Text style={styles.title} numberOfLines={2}>{service.title}</Text>
        {service.description ? (
          <Text style={styles.description} numberOfLines={2}>{service.description}</Text>
        ) : null}
        <View style={styles.meta}>
          {service.duration_minutes ? (
            <Text style={styles.duration}>⏱ {service.duration_minutes} min</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>${Number(service.price).toFixed(0)}</Text>
        <Text style={styles.book}>Book</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  typeLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  duration: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  price: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  book: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.accent,
    fontWeight: Typography.fontWeights.semibold,
    marginTop: 4,
  },
});
