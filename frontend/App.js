import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={STRIPE_KEY}
        merchantIdentifier="merchant.com.locals.communityapp"
        urlScheme="locals"
      >
        <StatusBar style="dark" />
        <AppNavigator />
      </StripeProvider>
    </SafeAreaProvider>
  );
}
