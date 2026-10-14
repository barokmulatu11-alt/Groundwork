import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
        <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
          <Text style={styles.brandMarkText}>G</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>This page isn't available</Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          The link you followed may be broken or the page may have been moved.
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            testID="not-found-back-btn"
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.outlineBtn, { borderColor: theme.separator }]}
          >
            <ArrowLeft size={16} color={theme.text} style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: theme.text }]}>Go back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="not-found-home-btn"
            accessibilityRole="button"
            accessibilityLabel="Go home"
            onPress={() => router.replace('/' as any)}
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          >
            <Home size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: '#ffffff' }]}>Go home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
