import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { api } from '../../services/api';
import { LocalCard } from '../../components/local/LocalCard';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';

export function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [locals, setLocals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [usingLocation, setUsingLocation] = useState(false);
  const user = useAuthStore((s) => s.user);

  const search = useCallback(async (params) => {
    setLoading(true);
    setSearched(true);
    try {
      const { locals: results } = await api.searchLocals(params);
      setLocals(results);
    } catch (err) {
      Alert.alert('Search Error', err.message || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  function handleTextSearch() {
    if (!query.trim()) return;
    setUsingLocation(false);
    search({ city: query.trim() });
  }

  async function handleNearMe() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Please allow location access to find locals near you.',
      );
      return;
    }
    setUsingLocation(true);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    search({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  }

  function handleLogout() {
    useAuthStore.getState().logout();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.headerTitle}>Find a Local</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city (e.g. Austin, TX)"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleTextSearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleTextSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Near me button */}
      <TouchableOpacity style={styles.nearMeButton} onPress={handleNearMe}>
        <Text style={styles.nearMeText}>📍  Find locals near me</Text>
      </TouchableOpacity>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {usingLocation ? 'Finding locals near you...' : `Searching in ${query}...`}
          </Text>
        </View>
      ) : searched && locals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏙</Text>
          <Text style={styles.emptyTitle}>No locals found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different city or search near your location.
          </Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={styles.emptyTitle}>Discover your destination</Text>
          <Text style={styles.emptySubtitle}>
            Search for a city or tap "Find locals near me" to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={locals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LocalCard
              local={item}
              onPress={(local) => navigation.navigate('LocalProfile', { localId: local.id })}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {locals.length} local{locals.length !== 1 ? 's' : ''} found
              {usingLocation ? ' near you' : ` in ${query}`}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
  },
  headerTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.primary,
  },
  logoutButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  logoutText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizes.md,
    color: Colors.textPrimary,
  },
  clearIcon: {
    color: Colors.textMuted,
    fontSize: 14,
    padding: 4,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.md,
  },
  nearMeButton: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nearMeText: {
    color: Colors.primary,
    fontWeight: Typography.fontWeights.semibold,
    fontSize: Typography.fontSizes.md,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  resultCount: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeights.medium,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.md,
  },
});
