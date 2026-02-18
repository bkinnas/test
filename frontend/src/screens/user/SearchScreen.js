import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState('');
  const [usingLocation, setUsingLocation] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Track if the initial auto-load has run so it doesn't repeat on re-focus
  const autoLoaded = useRef(false);

  const loadLocals = useCallback(async (params, label) => {
    setLoading(true);
    setHasSearched(true);
    try {
      const { locals: results } = await api.searchLocals(params);
      setLocals(results);
      if (label) setLocationLabel(label);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: auto-detect location and show top locals nearby
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;

    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUsingLocation(true);

          // Reverse-geocode to get a city name for the label
          let cityLabel = 'your area';
          try {
            const [place] = await Location.reverseGeocodeAsync({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
            if (place) {
              cityLabel = place.city || place.subregion || place.region || 'your area';
            }
          } catch (_) {}

          await loadLocals(
            { lat: loc.coords.latitude, lng: loc.coords.longitude, limit: 20 },
            cityLabel,
          );
        } else {
          // Location denied — fall through to empty state; user can search manually
          setUsingLocation(false);
        }
      } catch (_) {
        // Silently fall through; user can search manually
      } finally {
        setLocationLoading(false);
      }
    })();
  }, [loadLocals]);

  function handleTextSearch() {
    if (!query.trim()) return;
    setUsingLocation(false);
    loadLocals({ city: query.trim() }, query.trim());
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
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let cityLabel = 'your area';
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) cityLabel = place.city || place.subregion || place.region || 'your area';
      } catch (_) {}
      await loadLocals({ lat: loc.coords.latitude, lng: loc.coords.longitude, limit: 20 }, cityLabel);
    } catch (err) {
      Alert.alert('Location Error', 'Could not get your location. Please try again.');
      setLoading(false);
    }
  }

  function handleLogout() {
    useAuthStore.getState().logout();
  }

  // Section header shown above results
  function SectionHeader() {
    if (!hasSearched) return null;
    const label = usingLocation
      ? `Top guides near ${locationLabel || 'you'}`
      : `Results in ${locationLabel || query}`;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <Text style={styles.resultCount}>
          {locals.length} guide{locals.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  }

  const showSpinner = loading || locationLoading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {isAuthenticated ? (
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          ) : (
            <Text style={styles.greeting}>Welcome to LOCALS</Text>
          )}
          <Text style={styles.headerTitle}>Find a Local Guide</Text>
        </View>

        {isAuthenticated ? (
          <TouchableOpacity onPress={handleLogout} style={styles.authButton}>
            <Text style={styles.authButtonText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.guestButtons}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.joinText}>Join</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Results / states */}
      {showSpinner ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {locationLoading && !loading
              ? 'Detecting your location...'
              : usingLocation
              ? `Finding top guides near ${locationLabel || 'you'}...`
              : `Searching in ${query}...`}
          </Text>
        </View>
      ) : hasSearched && locals.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏙</Text>
          <Text style={styles.emptyTitle}>No guides found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different city or tap "Find locals near me".
          </Text>
        </View>
      ) : !hasSearched ? (
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
          ListHeaderComponent={<SectionHeader />}
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
  authButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  authButtonText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },
  guestButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signInButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  signInText: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  joinText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textPrimary,
  },
  resultCount: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeights.medium,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
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
    textAlign: 'center',
  },
});
