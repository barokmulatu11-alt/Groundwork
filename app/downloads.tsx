import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  HardDrive, 
  DownloadCloud, 
  ShieldCheck, 
  ArrowRight,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BrandHeader } from '@/components/ui/BrandHeader';

export default function DownloadsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <BrandHeader title="groundwork." onBack={() => router.back()} />

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 36, fontFamily: 'Inter_700Bold', color: theme.text, letterSpacing: -1 }}>
            Storage.
          </Text>
          <Text style={{ fontSize: 16, fontFamily: 'PlayfairDisplay_600SemiBold_Italic', color: theme.textSecondary, marginTop: 4 }}>
            Content saved on this device.
          </Text>
        </View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* Card 1: In-App Offline Data */}
          <View style={[styles.infoCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                <HardDrive size={20} color="#34C759" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>App-Managed Offline Data</Text>
                <Text style={[styles.cardBadge, { color: '#34C759' }]}>SECURE LOCAL DATABASE</Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
              All your tasks, habits, and productivity sessions are saved directly to this device's private app storage. They remain fully accessible and interactive offline.
            </Text>
            <TouchableOpacity 
              style={[styles.actionRowBtn, { borderTopColor: theme.separator }]}
              onPress={() => router.push('/data-settings' as any)}
              activeOpacity={0.7}
            >
              <ShieldCheck size={16} color={accentColor} style={{ marginRight: 8 }} />
              <Text style={[styles.actionRowText, { color: accentColor }]}>Manage Data & Backups</Text>
              <ArrowRight size={14} color={accentColor} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>

          {/* Card 2: Exported Downloads */}
          <View style={[styles.infoCard, { backgroundColor: theme.cardSolid, borderColor: theme.separator, marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: accentColor + '18' }]}>
                <DownloadCloud size={20} color={accentColor} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Exported Files</Text>
                <Text style={[styles.cardBadge, { color: accentColor }]}>DEVICE DOWNLOADS FOLDER</Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
              {Platform.OS === 'web' 
                ? "Files exported from Groundwork (such as CSV reports or JSON backups) are downloaded directly to your browser's default Downloads folder. For privacy and system security, browsers do not permit web apps to inspect your local Downloads directory."
                : "Files exported from Groundwork are saved to your device's storage and can be accessed anytime through your system File Manager."}
            </Text>
            <TouchableOpacity 
              style={[styles.actionRowBtn, { borderTopColor: theme.separator }]}
              onPress={() => router.push('/data-settings' as any)}
              activeOpacity={0.7}
            >
              <ShieldCheck size={16} color={accentColor} style={{ marginRight: 8 }} />
              <Text style={[styles.actionRowText, { color: accentColor }]}>Manage Data & Backups</Text>
              <ArrowRight size={14} color={accentColor} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  cardBadge: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  cardBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  actionRowText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
