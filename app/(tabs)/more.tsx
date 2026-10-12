import { BackgroundGradient } from '@/components/BackgroundGradient';
import { ReportSheet } from '@/components/ReportSheet';
import { AppText as Text } from '@/components/ui/AppText';
import { SettingRow } from '@/components/ui/SettingRow';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import {
  Award,
  BarChart2,
  Compass,
  FileText,
  Heart,
  HelpCircle,
  Info,
  MessageSquare,
  ReceiptText,
  Settings,
  Shield,
  Trophy,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MoreScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session } = useAuthStore();
  const [reportVisible, setReportVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  return (
    <BackgroundGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: isDesktop ? 32 : 18,
          maxWidth: isDesktop ? 760 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>More</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            Directory & Utilities
          </Text>
        </View>

        {/* PROGRESS */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>PROGRESS</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={Compass}
            title="Journey"
            subtitle="Milestone path and historical progress"
            theme={theme}
            onPress={() => router.push('/journey')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={BarChart2}
            title="Analytics & Insights"
            subtitle="Productivity trends, focus, and habits"
            theme={theme}
            onPress={() => router.push('/analytics' as any)}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Award}
            title="Milestone Rewards"
            subtitle="Earned feature unlocks through usage"
            theme={theme}
            onPress={() => router.push('/rewards')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Trophy}
            title="Achievements"
            subtitle="Badge catalog and milestones"
            theme={theme}
            onPress={() => router.push('/achievements')}
          />
        </View>

        {/* ACCOUNT */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>ACCOUNT</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={User}
            title="Personal Profile"
            subtitle={profile?.full_name || profile?.username || 'Guest account'}
            theme={theme}
            onPress={() => router.push('/profile')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Settings}
            title="Settings"
            subtitle="Appearance, notifications, data & privacy"
            theme={theme}
            onPress={() => router.push('/settings')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={ReceiptText}
            title="Payment History"
            subtitle="Historical transaction and purchase records"
            theme={theme}
            onPress={() => router.push('/payment-history' as any)}
          />
        </View>

        {/* HELP & SUPPORT */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>HELP & SUPPORT</Text>
        <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <SettingRow
            icon={HelpCircle}
            title="Support & FAQ"
            subtitle="Answers, guides, and contact options"
            theme={theme}
            onPress={() => router.push('/support-settings')}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={MessageSquare}
            title="Report an Issue"
            subtitle="Send feedback or report bugs"
            theme={theme}
            onPress={() => setReportVisible(true)}
          />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow
            icon={Info}
            title="About groundwork."
            subtitle={`Version ${Constants.expoConfig?.version || '1.3.0'} · Privacy & Terms`}
            theme={theme}
            onPress={() => router.push('/about' as any)}
          />
        </View>

        {/* Brand Footer */}
        <View style={styles.brandingContainer}>
          <Text style={[styles.logoText, { color: theme.secondaryText }]}>
            <Text style={{ color: theme.accent, fontFamily: 'Inter_800ExtraBold' }}>g</Text>
            roundwork.
          </Text>
          <Text style={[styles.version, { color: theme.tertiaryText }]}>
            v{Constants.expoConfig?.version || '1.3.0'}
          </Text>
        </View>

        <ReportSheet visible={reportVisible} onClose={() => setReportVisible(false)} />
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 20 },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  groupCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 12,
  },
  separator: {
    height: 1,
    marginLeft: 44,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  logoText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  version: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
});
