import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { 
  ChevronRight, 
  Award,
  Camera,
  Code,
  Download,
  Globe,
  Heart,
  Info,
  MessageSquare,
  Send,
  Share2,
  CreditCard,
  Crown as CrownIcon,
  Zap
} from 'lucide-react-native';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuthStore } from '@/store/useAuthStore';
import React, { useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View, TouchableOpacity, Image, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportSheet } from '@/components/ReportSheet';


const Card = ({ children, theme }: { children: React.ReactNode; theme: any }) => (
  <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
    {children}
  </View>
);

function SettingRow({ icon: Icon, title, subtitle, theme, onPress, destructive, rightElement }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.rowWrapper}>
      <View style={styles.rowContent}>
        <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
          <Icon size={18} color={destructive ? theme.danger : theme.accent} />
        </View>
        <View style={styles.infoBox}>
          <Text style={[styles.rowTitle, { color: destructive ? theme.danger : theme.primaryText }]}>{title}</Text>
          {subtitle && <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>{subtitle}</Text>}
        </View>
        {rightElement || <ChevronRight size={18} color={theme.tertiaryText} />}
      </View>
    </TouchableOpacity>
  );
}


export default function MoreScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, session } = useAuthStore();
  const [reportVisible, setReportVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on groundwork.! The ultimate daily focus companion. Download it now at https://v0-barok-labs.vercel.app/',
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:barok.m.lakew@gmail.com?subject=groundwork. Feedback');
  };

  return (
    <BackgroundGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
          maxWidth: isDesktop ? 800 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: isDesktop ? '100%' : undefined,
        }}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>More</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Tools and utilities</Text>
        </View>

        {/* PROFILE SECTION */}
        {profile && (
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => router.push('/edit-profile')}
            style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Image 
              source={{ uri: profile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Barok' }} 
              style={styles.profileAvatar} 
            />
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: theme.primaryText }]}>{profile.full_name || profile.username || 'Groundwork User'}</Text>
                <RoleBadge role={profile.role} isPro={profile.pro_status} />
              </View>
              <Text style={[styles.profileEmail, { color: theme.tertiaryText }]}>{session?.user?.email}</Text>
            </View>
            <ChevronRight size={18} color={theme.tertiaryText} />
          </TouchableOpacity>
        )}

        {/* SUBSCRIPTION */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>SUBSCRIPTION</Text>
        <View style={styles.utilitiesStack}>
          <Card theme={theme}>
            <SettingRow 
              icon={CrownIcon} 
              title="Groundwork Pro" 
              subtitle="Manage your premium subscription" 
              theme={theme} 
              onPress={() => router.push('/subscription-settings' as any)} 
            />
          </Card>
        </View>

        {/* UTILITIES */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>UTILITIES</Text>
        <View style={styles.utilitiesStack}>
          <Card theme={theme}>
            <SettingRow icon={Download} title="Downloads" subtitle="Manage offline content" theme={theme} onPress={() => router.push('/downloads')} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={Award} title="Achievements" subtitle="View your earned badges" theme={theme} onPress={() => router.push('/achievements')} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={Share2} title="Invite Friends" subtitle="Earn rewards for referrals" theme={theme} onPress={handleInvite} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={MessageSquare} title="Report an Issue" subtitle="Bug reports or suggestions" theme={theme} onPress={() => setReportVisible(true)} />
          </Card>
        </View>

        <ReportSheet visible={reportVisible} onClose={() => setReportVisible(false)} />

        {/* SUPPORT */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>SUPPORT & CONTACT</Text>
        <View style={styles.utilitiesStack}>
          <Card theme={theme}>
          <SettingRow icon={Heart} title="Support Developer" subtitle="Support the creator of groundwork." theme={theme} onPress={() => router.push('/support-settings')} />
          <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          <SettingRow icon={Info} title="About groundwork." subtitle="Version, terms and information" theme={theme} onPress={() => router.push('/about' as any)} />
        </Card>
        </View>

        {/* CONNECT */}
        <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>CONNECT</Text>
        <View style={styles.utilitiesStack}>
          <Card theme={theme}>
            <SettingRow icon={Send} title="Telegram" subtitle="Need some improvements? DM" theme={theme} onPress={() => Linking.openURL('https://t.me/b_rey123')} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={Camera} title="Instagram" subtitle="Follow our page" theme={theme} onPress={() => Linking.openURL('https://instagram.com/b_rey123')} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={Globe} title="LinkedIn" subtitle="Connect on LinkedIn" theme={theme} onPress={() => Linking.openURL('https://linkedin.com/in/barok-labs')} />
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <SettingRow icon={Code} title="Github" subtitle="Checkout my other stuff too" theme={theme} onPress={() => Linking.openURL('https://github.com/barokmulatu11-alt')} />
          </Card>
        </View>

        {/* BRANDING */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoFull}>
            <Text style={[styles.logoGSmall, { color: theme.accent }]}>g</Text>
            <Text style={[styles.logoText, { color: theme.primaryText }]}>roundwork.</Text>
          </View>
          <Text style={[styles.tagline, { color: theme.secondaryText }]}>Your daily focus companion.</Text>
          <Text style={[styles.version, { color: theme.tertiaryText }]}>v{require('expo-constants').default.expoConfig?.version || '1.2.1'}</Text>
        </View>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 24,
  },
  rowWrapper: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  separator: {
    height: 1,
    marginLeft: 46,
    opacity: 0.5,
  },

  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 32,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  utilitiesStack: {
    marginBottom: 32,
  },
  brandingContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    gap: 8,
  },
  logoG: {
    fontSize: 40,
    fontWeight: '800',
  },
  logoFull: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoGSmall: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
  },
  version: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
