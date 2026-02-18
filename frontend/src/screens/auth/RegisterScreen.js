import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const ROLE_OPTIONS = [
  {
    key: 'user',
    label: 'Traveler / Explorer',
    emoji: '🧳',
    description: "I'm looking to discover locals and book experiences.",
  },
  {
    key: 'local',
    label: 'I\'m a Local',
    emoji: '🏡',
    description: 'I want to share my city and offer experiences to visitors.',
  },
];

export function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (role === 'local' && !city.trim()) {
      Alert.alert('City required', 'Please enter your city so users can find you.');
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password, role, city: city.trim() });
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join the LOCALS community</Text>

          {/* Role selector */}
          <Text style={styles.sectionLabel}>I am a...</Text>
          <View style={styles.roleRow}>
            {ROLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.roleCard, role === opt.key && styles.roleCardActive]}
                onPress={() => setRole(opt.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>{opt.emoji}</Text>
                <Text style={[styles.roleLabel, role === opt.key && styles.roleLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.roleDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
            />
            {role === 'local' && (
              <Input
                label="Your City"
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Austin, TX"
              />
            )}

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              size="lg"
              style={{ marginTop: Spacing.sm }}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.footerLink}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: Spacing.lg },
  title: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.extrabold,
    color: Colors.textPrimary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#EBF2FA',
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  roleLabel: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  roleLabelActive: {
    color: Colors.primary,
  },
  roleDesc: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  footerText: { color: Colors.textSecondary, fontSize: Typography.fontSizes.md },
  footerLink: { color: Colors.primary, fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.bold },
});
