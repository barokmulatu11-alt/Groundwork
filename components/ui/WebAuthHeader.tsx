import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';
import { useTheme } from '@/lib/ThemeContext';
import { AppText as Text } from '@/components/ui/AppText';

/**
 * Web-only, desktop-friendly auth header.
 * - Visible only on web (PWA)
 * - Shows "Log in" / "Sign up" when the user is not authenticated
 */
export function WebAuthHeader() {
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();
  const { session } = useAuthStore();

  if (Platform.OS !== 'web') return null;

  // Don't show on auth screens (welcome/login/signup) — they already have CTAs.
  const inAuth =
    segments[0] === 'welcome' ||
    segments[0] === 'login' ||
    segments[0] === 'signup' ||
    segments[0] === 'forgot-password';
  if (inAuth) return null;

  const isAuthed = Boolean(session?.user?.id);
  if (isAuthed) return null;

  return (
    <View style={[styles.container, { borderBottomColor: theme.cardBorder }]}>
      <View style={styles.inner}>
        <Text style={[styles.brand, { color: theme.primaryText }]}>Groundwork</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/login' as any)}
            style={[styles.secondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.card }]}
          >
            <Text style={[styles.secondaryText, { color: theme.primaryText }]}>Log in</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/signup' as any)}
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.primaryText}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  inner: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.2,
  },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
});

