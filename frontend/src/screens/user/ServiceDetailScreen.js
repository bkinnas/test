import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { StarRating } from '../../components/common/StarRating';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_LABELS = {
  email: 'Email Consultation',
  message: 'In-App Message',
  tour: 'Guided Tour',
};

const TYPE_DESCRIPTIONS = {
  email: 'The local will respond to your questions via email. Perfect for planning before your trip.',
  message: 'Chat directly with the local through the app for real-time advice.',
  tour: 'Join the local for a personalized guided experience of their city.',
};

export function ServiceDetailScreen({ route, navigation }) {
  const { serviceId, localId } = route.params;
  const { isAuthenticated } = useAuthStore();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getService(serviceId)
      .then(setService)
      .catch((err) => Alert.alert('Error', err.message))
      .finally(() => setLoading(false));
  }, [serviceId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!service) return null;

  const photos = Array.isArray(service.photos) ? service.photos : [];

  function handleBook() {
    if (!isAuthenticated) {
      navigation.navigate('Login');
      return;
    }
    navigation.navigate('BookingConfirm', { service, localId });
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo gallery */}
        {photos.length > 0 ? (
          <FlatList
            data={photos}
            keyExtractor={(item, i) => `${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.photo} />
            )}
          />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Text style={styles.photoPlaceholderText}>
              {service.type === 'tour' ? '🗺' : service.type === 'email' ? '✉' : '💬'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Service type chip */}
          <View style={styles.typeChip}>
            <Text style={styles.typeChipText}>
              {TYPE_LABELS[service.type] || service.type}
            </Text>
          </View>

          {/* Title + price */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{service.title}</Text>
            <Text style={styles.price}>${Number(service.price).toFixed(0)}</Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Avatar uri={service.local_avatar} name={service.local_name} size={28} />
            <Text style={styles.localName}>{service.local_name}</Text>
            {service.duration_minutes ? (
              <Text style={styles.duration}>· ⏱ {service.duration_minutes} min</Text>
            ) : null}
            <StarRating rating={service.avg_rating || 0} size={13} />
          </View>

          {/* Type description */}
          <View style={styles.typeDescBox}>
            <Text style={styles.typeDesc}>{TYPE_DESCRIPTIONS[service.type]}</Text>
          </View>

          {/* Service description */}
          {service.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionTitle}>About this experience</Text>
              <Text style={styles.description}>{service.description}</Text>
            </View>
          ) : null}

          {/* Booking notes for tour */}
          {service.type === 'tour' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>📅 How it works</Text>
              <Text style={styles.infoText}>
                1. Select your preferred date and time{'\n'}
                2. Complete payment securely via Stripe{'\n'}
                3. The local will confirm your booking{'\n'}
                4. Message each other through the app to coordinate
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky book button */}
      <View style={styles.footer}>
        <View style={styles.footerPriceBlock}>
          <Text style={styles.footerPrice}>${Number(service.price).toFixed(0)}</Text>
          <Text style={styles.footerPriceLabel}>total</Text>
        </View>
        <Button
          title={service.type === 'tour' ? 'Select Date & Book' : 'Book Now'}
          onPress={handleBook}
          size="lg"
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 260,
  },
  photoPlaceholder: {
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 64,
  },
  content: {
    padding: Spacing.lg,
  },
  typeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF2FA',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginBottom: Spacing.sm,
  },
  typeChipText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textPrimary,
    marginRight: Spacing.md,
  },
  price: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  localName: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  duration: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  typeDescBox: {
    backgroundColor: '#EBF2FA',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  typeDesc: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.md,
    lineHeight: 22,
  },
  descriptionBox: {
    marginBottom: Spacing.md,
  },
  descriptionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
  footerPriceBlock: {
    marginRight: Spacing.md,
  },
  footerPrice: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  footerPriceLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
  },
  bookButton: {
    flex: 1,
  },
});
