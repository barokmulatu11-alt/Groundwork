import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  ChevronLeft, 
  FolderDown, 
  HardDrive, 
  DownloadCloud, 
  ExternalLink,
  FileText,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function DownloadsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const accentColor = theme.accent;

  return (
    <BackgroundGradient>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 16, 24) }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={accentColor} />
          <Text style={[styles.backText, { color: accentColor }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Downloads & Storage</Text>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(500)} style={styles.heroSection}>
          <View style={[styles.heroIconBox, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
            <FolderDown size={36} color={accentColor} />
          </View>
          <Text style={[styles.heroTitle, { color: theme.primaryText }]}>
            Offline Files & Downloads
          </Text>
          <Text style={[styles.heroDesc, { color: theme.secondaryText }]}>
            How Groundwork manages your content and files across offline storage and your device.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          {/* Card 1: In-App Offline Data */}
          <AnimatedCard style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                <HardDrive size={20} color="#34C759" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>App-Managed Offline Data</Text>
                <Text style={[styles.cardBadge, { color: '#34C759' }]}>SECURE LOCAL DATABASE</Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: theme.secondaryText }]}>
              All your notes, drawings, audio recordings, tasks, habits, and productivity sessions are saved directly to this device's private app storage. They remain fully accessible and interactive offline.
            </Text>
            <TouchableOpacity 
              style={[styles.actionRowBtn, { borderTopColor: theme.separator }]}
              onPress={() => router.push('/(tabs)/notes' as any)}
              activeOpacity={0.7}
            >
              <FileText size={16} color={accentColor} style={{ marginRight: 8 }} />
              <Text style={[styles.actionRowText, { color: accentColor }]}>View Offline Notes</Text>
              <ArrowRight size={14} color={accentColor} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </AnimatedCard>

          {/* Card 2: Exported Downloads */}
          <AnimatedCard style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 16 }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: accentColor + '18' }]}>
                <DownloadCloud size={20} color={accentColor} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Exported Files</Text>
                <Text style={[styles.cardBadge, { color: accentColor }]}>DEVICE DOWNLOADS FOLDER</Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: theme.secondaryText }]}>
              {Platform.OS === 'web' 
                ? "Files exported from Groundwork (such as Markdown notes, CSV reports, or JSON backups) are downloaded directly to your browser's default Downloads folder. For privacy and system security, browsers do not permit web apps to inspect your local Downloads directory."
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
          </AnimatedCard>
        </Animated.View>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 10,
  },
  heroIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
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
  },
  cardBadge: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
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
