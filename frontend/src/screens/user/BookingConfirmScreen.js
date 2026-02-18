import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import { format, addDays } from 'date-fns';

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

export function BookingConfirmScreen({ route, navigation }) {
  const { service, localId } = route.params;
  const needsSchedule = service.type === 'tour';

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    if (needsSchedule) {
      loadAvailability(currentMonth);
    }
  }, [currentMonth]);

  async function loadAvailability(month) {
    try {
      const slots = await api.getAvailability(localId, month);
      setAvailability(slots);
    } catch {
      // Non-critical: allow date selection regardless
    }
  }

  // Build marked dates from availability slots
  const markedDates = {};
  const today = format(new Date(), 'yyyy-MM-dd');

  availability.forEach((slot) => {
    const d = slot.date.split('T')[0];
    if (!slot.is_blocked) {
      markedDates[d] = {
        marked: true,
        dotColor: Colors.success,
        selectedColor: Colors.primary,
      };
    } else {
      markedDates[d] = {
        marked: true,
        dotColor: Colors.error,
        disabled: true,
        disableTouchEvent: true,
      };
    }
  });

  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: Colors.primary,
    };
  }

  // Available times for selected date
  const availableSlot = availability.find(
    (s) => s.date.split('T')[0] === selectedDate && !s.is_blocked
  );
  const availableTimes = availableSlot
    ? TIME_SLOTS.filter((t) => {
        if (!availableSlot.start_time || !availableSlot.end_time) return true;
        return t >= availableSlot.start_time.slice(0, 5) && t <= availableSlot.end_time.slice(0, 5);
      })
    : TIME_SLOTS;

  async function handleProceed() {
    if (needsSchedule && !selectedDate) {
      Alert.alert('Select a date', 'Please pick a date for your tour.');
      return;
    }
    if (needsSchedule && !selectedTime) {
      Alert.alert('Select a time', 'Please pick a time slot.');
      return;
    }

    setLoading(true);
    try {
      const booking = await api.createBooking(
        service.id,
        selectedDate,
        selectedTime,
        notes
      );
      navigation.replace('Payment', { booking, service });
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create booking.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>You are booking</Text>
          <Text style={styles.summaryTitle}>{service.title}</Text>
          <Text style={styles.summaryMeta}>
            {service.local_name} · {service.type === 'tour' ? `⏱ ${service.duration_minutes} min` : service.type}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.price}>${Number(service.price).toFixed(2)}</Text>
          </View>
        </View>

        {/* Date/time picker for tours */}
        {needsSchedule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <Text style={styles.sectionHint}>
              Green dots indicate available dates from the local's calendar.
            </Text>
            <Calendar
              minDate={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              markedDates={markedDates}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setSelectedTime(null);
              }}
              onMonthChange={(month) => setCurrentMonth(month.dateString.slice(0, 7))}
              theme={{
                todayTextColor: Colors.primary,
                selectedDayBackgroundColor: Colors.primary,
                arrowColor: Colors.primary,
                dotColor: Colors.success,
                textDayFontWeight: Typography.fontWeights.medium,
                textMonthFontWeight: Typography.fontWeights.bold,
                textDayHeaderFontWeight: Typography.fontWeights.semibold,
              }}
            />
          </View>
        )}

        {/* Time picker */}
        {needsSchedule && selectedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Time</Text>
            <View style={styles.timeGrid}>
              {availableTimes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.timeSlot,
                    selectedTime === t && styles.timeSlotSelected,
                  ]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === t && styles.timeSlotTextSelected,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Input
            label="Notes for the local (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requests, questions, or info they should know..."
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Continue to Payment"
          onPress={handleProceed}
          loading={loading}
          size="lg"
          style={{ flex: 1 }}
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
  summaryCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSizes.sm,
    marginBottom: 4,
  },
  summaryTitle: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 4,
  },
  summaryMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSizes.md,
    marginBottom: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: Spacing.sm,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSizes.md,
  },
  price: {
    color: Colors.accentLight,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.extrabold,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  timeSlotSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeSlotText: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  timeSlotTextSelected: {
    color: Colors.textOnPrimary,
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.md,
  },
});
