import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { Avatar } from '../../components/common/Avatar';
import { StarRating } from '../../components/common/StarRating';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: { bg: '#FEF9C3', color: '#92400E' },
  confirmed: { bg: '#D1FAE5', color: '#065F46' },
  completed: { bg: '#DBEAFE', color: '#1E40AF' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B' },
};

export function LocalDashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const result = await api.getMyDashboard();
      setData(result);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(bookingId) {
    try {
      await api.updateBookingStatus(bookingId, 'confirmed');
      setData((prev) => ({
        ...prev,
        upcoming_bookings: prev.upcoming_bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'confirmed' } : b
        ),
      }));
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => useAuthStore.getState().logout()}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${Number(data?.total_earnings || 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.upcoming_bookings?.length || 0}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{data?.unread_messages || 0}</Text>
            <Text style={styles.statLabel}>Unread Msgs</Text>
          </View>
        </View>

        {/* Upcoming bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
          {!data?.upcoming_bookings || data.upcoming_bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No upcoming bookings — share your profile to get started!</Text>
            </View>
          ) : (
            data.upcoming_bookings.map((booking) => {
              const sc = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingUser}>{booking.user_name}</Text>
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.badgeText, { color: sc.color }]}>
                        {booking.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bookingService}>{booking.service_title}</Text>
                  {booking.scheduled_date && (
                    <Text style={styles.bookingDate}>
                      📅 {format(new Date(booking.scheduled_date), 'MMM d, yyyy')}
                      {booking.scheduled_time ? ` at ${booking.scheduled_time.slice(0, 5)}` : ''}
                    </Text>
                  )}
                  <View style={styles.bookingActions}>
                    {booking.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => handleConfirm(booking.id)}
                      >
                        <Text style={styles.confirmText}>Confirm</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() =>
                        navigation.navigate('Messages', {
                          bookingId: booking.id,
                          localName: booking.user_name,
                        })
                      }
                    >
                      <Text style={styles.messageText}>💬 Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Recent reviews */}
        {data?.recent_reviews && data.recent_reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {data.recent_reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                  <StarRating rating={review.rating} size={13} />
                </View>
                {review.comment ? (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
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
    padding: Spacing.lg,
  },
  greeting: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  name: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  logoutText: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textOnPrimary,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
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
  emptyBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: Typography.fontSizes.md,
    lineHeight: 22,
  },
  bookingCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingUser: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'capitalize',
  },
  bookingService: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  bookingActions: { flexDirection: 'row', gap: Spacing.sm },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
  messageButton: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
  },
  reviewComment: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
