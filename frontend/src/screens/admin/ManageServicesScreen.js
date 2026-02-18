import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

const TYPE_ICONS = { email: '✉', message: '💬', tour: '🗺' };
const TYPE_LABELS = { email: 'Email Consultation', message: 'In-App Message', tour: 'Guided Tour' };

export function ManageServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      const data = await api.getMyServices();
      setServices(data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load services.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(service) {
    try {
      const updated = await api.updateService(service.id, { is_active: !service.is_active });
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Deactivate Service', 'This will hide the service from users. You can reactivate it later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteService(id);
            setServices((prev) => prev.filter((s) => s.id !== id));
          } catch (err) {
            Alert.alert('Error', err.message);
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
        <Text style={styles.title}>My Services</Text>
        <Button
          title="+ Add"
          onPress={() => navigation.navigate('ServiceForm', {})}
          size="sm"
          variant="secondary"
        />
      </View>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>⚙️</Text>
          <Text style={styles.emptyTitle}>No services yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first service to start receiving bookings.
          </Text>
          <Button
            title="Create a Service"
            onPress={() => navigation.navigate('ServiceForm', {})}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, !item.is_active && styles.cardInactive]}>
              <View style={styles.cardTop}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>{TYPE_ICONS[item.type] || '🔹'}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.typeLabel}>{TYPE_LABELS[item.type] || item.type}</Text>
                  <Text style={styles.serviceTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
                    {item.duration_minutes ? (
                      <Text style={styles.duration}> · {item.duration_minutes} min</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.activeToggle}>
                  <Text style={styles.activeLabel}>{item.is_active ? 'Live' : 'Off'}</Text>
                  <Switch
                    value={item.is_active}
                    onValueChange={() => toggleActive(item)}
                    trackColor={{ false: Colors.border, true: Colors.success }}
                    thumbColor={Colors.surface}
                  />
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => navigation.navigate('ServiceForm', { service: item })}
                >
                  <Text style={styles.editText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteText}>🗑 Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardInactive: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: { fontSize: 20 },
  cardContent: { flex: 1 },
  typeLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  serviceTitle: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  price: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.primary,
  },
  duration: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  activeToggle: { alignItems: 'center', marginLeft: Spacing.sm },
  activeLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  editButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: Colors.divider,
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  editText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
  deleteText: {
    color: Colors.error,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
});
