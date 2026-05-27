import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { Avatar } from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format } from 'date-fns';

const STATUS_STYLES = {
  pending:   { bg: '#FEF9C3', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#D1FAE5', color: '#065F46', label: 'Confirmed' },
  completed: { bg: '#DBEAFE', color: '#1E40AF', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
};

export function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.updateBookingStatus(id, 'cancelled');
            setBookings((prev) =>
              prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b))
            );
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to cancel.');
          }
        },
      },
    ]);
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
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={() => useAuthStore.getState().logout()}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>
            Find a local and book an experience to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Avatar uri={item.local_avatar} name={item.local_name} size={40} />
                  <View style={styles.cardMeta}>
                    <Text style={styles.localName}>{item.local_name}</Text>
                    <Text style={styles.serviceTitle} numberOfLines={1}>{item.service_title}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                      {statusStyle.label}
                    </Text>
                  </View>
                </View>

                {item.scheduled_date && (
                  <Text style={styles.dateText}>
                    📅 {format(new Date(item.scheduled_date), 'MMM d, yyyy')}
                    {item.scheduled_time ? ` at ${item.scheduled_time.slice(0, 5)}` : ''}
                  </Text>
                )}

                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total paid</Text>
                  <Text style={styles.price}>${Number(item.total_amount).toFixed(2)}</Text>
                </View>

                <View style={styles.actions}>
                  {item.status === 'confirmed' || item.status === 'completed' ? (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('Messages', { bookingId: item.id, localName: item.local_name })}
                    >
                      <Text style={styles.actionText}>💬 Message</Text>
                    </TouchableOpacity>
                  ) : null}

                  {item.status === 'completed' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.reviewButton]}
                      onPress={() => navigation.navigate('Review', { bookingId: item.id, localProfileId: item.local_profile_id })}
                    >
                      <Text style={[styles.actionText, { color: Colors.accent }]}>⭐ Review</Text>
                    </TouchableOpacity>
                  ) : null}

                  {item.status === 'pending' || item.status === 'confirmed' ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancel(item.id)}
                    >
                      <Text style={[styles.actionText, { color: Colors.error }]}>Cancel</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
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
  list: { padding: Spacing.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardMeta: { flex: 1, marginLeft: Spacing.sm },
  localName: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  serviceTitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },
  dateText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  priceLabel: { fontSize: Typography.fontSizes.sm, color: Colors.textMuted },
  price: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  reviewButton: { backgroundColor: '#FEF9C3' },
  cancelButton: { backgroundColor: '#FEE2E2' },
  actionText: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
  },
});
