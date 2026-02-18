import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { Colors, Typography } from '../theme';

// Auth screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// User screens
import { SearchScreen } from '../screens/user/SearchScreen';
import { LocalProfileScreen } from '../screens/user/LocalProfileScreen';
import { ServiceDetailScreen } from '../screens/user/ServiceDetailScreen';
import { BookingConfirmScreen } from '../screens/user/BookingConfirmScreen';
import { PaymentScreen } from '../screens/user/PaymentScreen';
import { MyBookingsScreen } from '../screens/user/MyBookingsScreen';

// Shared screens
import { MessagesScreen } from '../screens/shared/MessagesScreen';
import { ReviewScreen } from '../screens/shared/ReviewScreen';

// Local admin screens
import { LocalDashboardScreen } from '../screens/admin/LocalDashboardScreen';
import { ManageServicesScreen } from '../screens/admin/ManageServicesScreen';
import { ServiceFormScreen } from '../screens/admin/ServiceFormScreen';
import { ManageCalendarScreen } from '../screens/admin/ManageCalendarScreen';
import { EditProfileScreen } from '../screens/admin/EditProfileScreen';

import { LoadingScreen } from '../components/common/LoadingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.surface },
  headerTitleStyle: {
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
  },
  headerTintColor: Colors.primary,
  headerShadowVisible: false,
};

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

// User bottom tabs
function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { borderTopColor: Colors.border, paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: Typography.fontWeights.medium },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Explore"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="My Bookings"
        component={MyBookingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Local admin bottom tabs
function LocalTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { borderTopColor: Colors.border, paddingBottom: 4 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: Typography.fontWeights.medium },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={LocalDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Services"
        component={ManageServicesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={ManageCalendarScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={EditProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </Stack.Navigator>
  );
}

function AppStack({ role }) {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {role === 'local' ? (
        <Stack.Screen name="LocalHome" component={LocalTabs} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="UserHome" component={UserTabs} options={{ headerShown: false }} />
      )}
      <Stack.Screen
        name="LocalProfile"
        component={LocalProfileScreen}
        options={{ title: 'Local Profile' }}
      />
      <Stack.Screen
        name="ServiceDetail"
        component={ServiceDetailScreen}
        options={{ title: 'Service Details' }}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ title: 'Confirm Booking' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: 'Leave a Review' }}
      />
      <Stack.Screen
        name="ServiceForm"
        component={ServiceFormScreen}
        options={({ route }) => ({
          title: route.params?.service ? 'Edit Service' : 'New Service',
        })}
      />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  if (isLoading) return <LoadingScreen message="Loading LOCALS..." />;

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack role={user?.role} /> : <AuthStack />}
    </NavigationContainer>
  );
}
