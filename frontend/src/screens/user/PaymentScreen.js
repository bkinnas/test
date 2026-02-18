import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStripe,
  CardField,
  ApplePayButton,
  isPlatformPaySupported,
  PlatformPayButton,
  PlatformPay,
} from '@stripe/stripe-react-native';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export function PaymentScreen({ route, navigation }) {
  const { booking, service } = route.params;
  const { confirmPayment, isPlatformPaySupported: checkPlatformPay } = useStripe();

  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [platformPayAvailable, setPlatformPayAvailable] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        const { client_secret } = await api.createPaymentIntent(booking.id);
        setClientSecret(client_secret);

        const supported = await isPlatformPaySupported();
        setPlatformPayAvailable(supported);
      } catch (err) {
        Alert.alert('Payment Setup Error', err.message || 'Could not initialize payment.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    setup();
  }, [booking.id]);

  async function handleCardPayment() {
    if (!clientSecret) return;
    setPaying(true);
    try {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else if (paymentIntent) {
        handleSuccess();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  }

  async function handlePlatformPay() {
    if (!clientSecret) return;
    setPaying(true);
    try {
      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'ApplePay',
        paymentMethodData: {
          cartItems: [
            {
              label: service.title,
              amount: Number(service.price).toFixed(2),
              paymentType: PlatformPay.PaymentType.Final,
            },
          ],
          country: 'US',
          currency: 'USD',
        },
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else {
        handleSuccess();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  }

  function handleSuccess() {
    Alert.alert(
      'Booking Confirmed!',
      `Your booking for "${service.title}" has been confirmed. You can message the local through the app.`,
      [
        {
          text: 'View My Bookings',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'UserHome' }] }),
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Setting up payment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.orderSummary}>
        <Text style={styles.orderLabel}>Order Summary</Text>
        <View style={styles.orderRow}>
          <Text style={styles.orderItem}>{service.title}</Text>
          <Text style={styles.orderPrice}>${Number(service.price).toFixed(2)}</Text>
        </View>
        <View style={styles.orderDivider} />
        <View style={styles.orderRow}>
          <Text style={styles.orderTotal}>Total</Text>
          <Text style={styles.orderTotalPrice}>${Number(booking.total_amount).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Pay with Card</Text>
        <CardField
          postalCodeEnabled={true}
          placeholders={{ number: '4242 4242 4242 4242' }}
          style={styles.cardField}
          cardStyle={{
            backgroundColor: Colors.surface,
            textColor: Colors.textPrimary,
            borderColor: Colors.border,
            borderWidth: 1.5,
            borderRadius: Radius.md,
          }}
        />

        <Button
          title={paying ? 'Processing...' : `Pay $${Number(booking.total_amount).toFixed(2)}`}
          onPress={handleCardPayment}
          loading={paying}
          size="lg"
          style={styles.payButton}
        />

        {platformPayAvailable && (
          <>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>
            <ApplePayButton
              onPress={handlePlatformPay}
              type="plain"
              buttonStyle="black"
              borderRadius={Radius.md}
              style={styles.applePayButton}
            />
          </>
        )}
      </View>

      <View style={styles.secureNote}>
        <Text style={styles.secureText}>🔒 Payments are secured by Stripe</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.md,
  },
  orderSummary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  orderLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  orderItem: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  orderPrice: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeights.medium,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  orderTotal: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  orderTotalPrice: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  paymentSection: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  cardField: {
    height: 56,
    marginBottom: Spacing.md,
  },
  payButton: {
    marginTop: Spacing.sm,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  orText: {
    marginHorizontal: Spacing.md,
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeights.medium,
  },
  applePayButton: {
    height: 50,
    width: '100%',
  },
  secureNote: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  secureText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },
});
