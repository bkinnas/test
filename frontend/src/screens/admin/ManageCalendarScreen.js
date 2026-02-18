import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format, addDays } from 'date-fns';

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

export function ManageCalendarScreen() {
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Form state for new slot
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isBlocked, setIsBlocked] = useState(false);

  // We need the local profile id — fetch from profile
  const [localId, setLocalId] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const profile = await api.getMyProfile();
        setLocalId(profile.id);
        const data = await api.getAvailability(profile.id, currentMonth);
        setSlots(data);
      } catch (err) {
        Alert.alert('Error', err.message || 'Failed to load calendar.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (localId) {
      api.getAvailability(localId, currentMonth)
        .then(setSlots)
        .catch(() => {});
    }
  }, [currentMonth, localId]);

  // Build marked dates
  const markedDates = {};
  const today = format(new Date(), 'yyyy-MM-dd');

  slots.forEach((slot) => {
    const d = slot.date.split('T')[0];
    markedDates[d] = {
      marked: true,
      dotColor: slot.is_blocked ? Colors.error : Colors.success,
    };
  });

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
    };
  }

  // Get slot for selected date
  const selectedSlot = slots.find((s) => s.date.split('T')[0] === selectedDate);

  async function handleAddSlot() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const newSlot = await api.addAvailability({
        date: selectedDate,
        start_time: isBlocked ? null : startTime,
        end_time: isBlocked ? null : endTime,
        is_blocked: isBlocked,
      });
      setSlots((prev) => {
        const existing = prev.findIndex((s) => s.date.split('T')[0] === selectedDate);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newSlot;
          return updated;
        }
        return [...prev, newSlot];
      });
      Alert.alert('Saved', isBlocked ? 'Date blocked successfully.' : 'Availability saved.');
      setSelectedDate(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(id) {
    try {
      await api.deleteAvailability(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
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
        <View style={styles.header}>
          <Text style={styles.title}>Availability Calendar</Text>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.error }]} />
            <Text style={styles.legendText}>Blocked</Text>
          </View>
        </View>

        <Calendar
          minDate={format(new Date(), 'yyyy-MM-dd')}
          markedDates={markedDates}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          onMonthChange={(month) => setCurrentMonth(month.dateString.slice(0, 7))}
          theme={{
            todayTextColor: Colors.primary,
            selectedDayBackgroundColor: Colors.primary,
            arrowColor: Colors.primary,
            textDayFontWeight: Typography.fontWeights.medium,
            textMonthFontWeight: Typography.fontWeights.bold,
          }}
        />

        {/* Add slot form */}
        {selectedDate && (
          <View style={styles.slotForm}>
            <Text style={styles.slotFormTitle}>
              {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            </Text>

            {selectedSlot && (
              <View style={styles.existingSlot}>
                <Text style={styles.existingSlotText}>
                  {selectedSlot.is_blocked
                    ? '🚫 Blocked'
                    : `✅ Available ${selectedSlot.start_time?.slice(0, 5) || ''} – ${selectedSlot.end_time?.slice(0, 5) || ''}`}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteSlot(selectedSlot.id)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.blockToggle}>
              <Text style={styles.blockLabel}>Block this date (unavailable)</Text>
              <Switch
                value={isBlocked}
                onValueChange={setIsBlocked}
                trackColor={{ false: Colors.border, true: Colors.error }}
                thumbColor={Colors.surface}
              />
            </View>

            {!isBlocked && (
              <>
                <Text style={styles.timeLabel}>Available from</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, startTime === t && styles.timeChipActive]}
                        onPress={() => setStartTime(t)}
                      >
                        <Text style={[styles.timeChipText, startTime === t && styles.timeChipTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.timeLabel}>Until</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.timeRow}>
                    {TIME_OPTIONS.filter((t) => t > startTime).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, endTime === t && styles.timeChipActive]}
                        onPress={() => setEndTime(t)}
                      >
                        <Text style={[styles.timeChipText, endTime === t && styles.timeChipTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}

            <Button
              title={isBlocked ? 'Block This Date' : 'Save Availability'}
              onPress={handleAddSlot}
              loading={saving}
              variant={isBlocked ? 'danger' : 'primary'}
              style={{ marginTop: Spacing.md }}
            />
            <Button
              title="Cancel"
              onPress={() => setSelectedDate(null)}
              variant="ghost"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {/* Upcoming slots list */}
        {slots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Availability</Text>
            {slots
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 10)
              .map((slot) => (
                <View key={slot.id} style={styles.slotRow}>
                  <Text style={styles.slotDate}>
                    {format(new Date(slot.date.split('T')[0] + 'T12:00:00'), 'EEE, MMM d')}
                  </Text>
                  <Text style={styles.slotTime}>
                    {slot.is_blocked
                      ? '🚫 Blocked'
                      : slot.start_time
                      ? `✅ ${slot.start_time.slice(0, 5)} – ${slot.end_time?.slice(0, 5)}`
                      : '✅ All day'}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteSlot(slot.id)}>
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        )}

        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  legend: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: Typography.fontSizes.sm, color: Colors.textSecondary },
  slotForm: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  slotFormTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  existingSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  existingSlotText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  removeText: {
    color: Colors.error,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.sm,
  },
  blockToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  blockLabel: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  timeLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  timeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  timeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  timeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeChipText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  timeChipTextActive: { color: Colors.textOnPrimary },
  section: { paddingHorizontal: Spacing.lg },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  slotDate: {
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    width: 110,
  },
  slotTime: {
    flex: 1,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
});
