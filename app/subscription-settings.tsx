import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Cloud,
  Crown,
  FileOutput,
  Flame,
  Headphones,
  Info,
  LayoutGrid,
  Link2,
  Lock,
  Mic,
  Moon,
  Palette,
  Sparkles,
  Tag,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';

const PRO_SECTIONS: { title: string; features: { icon: LucideIcon; title: string; desc: string }[] }[] = [
  {
    title: 'PRODUCTIVITY',
    features: [
      { icon: CheckCircle2, title: 'Unlimited Tasks', desc: 'No cap on active tasks or projects' },
      { icon: Flame, title: 'Unlimited Habits', desc: 'Track every routine that matters' },
      { icon: Tag, title: 'Categories & Labels', desc: 'Custom tags for tasks and notes' },
      { icon: Bell, title: 'Advanced Reminders', desc: 'Custom sounds, snooze, and repeats' },
      { icon: BarChart3, title: 'Deep Productivity Stats', desc: 'Weekly insights, trends, and recap exports' },
      { icon: Timer, title: 'Custom Focus Presets', desc: 'Beyond pomodoro — your timer rules' },
    ],
  },
  {
    title: 'NOTES & STUDY',
    features: [
      { icon: BookOpen, title: 'Unlimited Study Spaces', desc: 'More folders and subjects' },
      { icon: Mic, title: 'Longer Voice Notes', desc: 'Extended recording limits' },
      { icon: Lock, title: 'Bulk Note Security', desc: 'Lock notes and folders with biometrics' },
      { icon: FileOutput, title: 'Export to PDF & Markdown', desc: 'Share notes outside the app' },
      { icon: TrendingUp, title: 'Revision Analytics', desc: 'Weak topics and review schedules' },
    ],
  },
  {
    title: 'CONNECT & SOCIAL',
    features: [
      { icon: Users, title: 'Extra Social Links', desc: 'More platforms on your profile' },
      { icon: Trophy, title: 'Pro XP Boost', desc: 'Earn more XP from daily actions' },
      { icon: Crown, title: 'Pro Profile Flair', desc: 'Badge, ring, and leaderboard highlight' },
      { icon: Sparkles, title: 'Pro Achievements', desc: 'Exclusive premium badge lane' },
      { icon: Link2, title: 'Referral Rewards', desc: 'Invite friends for Pro perks' },
    ],
  },
  {
    title: 'APPEARANCE & PLATFORM',
    features: [
      { icon: Moon, title: 'AMOLED Dark Theme', desc: 'True black for OLED screens' },
      { icon: Palette, title: 'Custom App Icons', desc: 'Personalize your home screen' },
      { icon: Cloud, title: 'Backup & Restore', desc: 'Scheduled export and cloud safety' },
      { icon: LayoutGrid, title: 'Home Screen Widgets', desc: 'Tasks and habits at a glance' },
      { icon: Headphones, title: 'Focus Soundscapes', desc: 'Ambient audio while you work' },
      { icon: Zap, title: 'Early Access', desc: 'Try new features before everyone else' },
    ],
  },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  theme,
  index,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  theme: ReturnType<typeof useTheme>['theme'] & { isDark?: boolean };
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(400 + index * 40).duration(500)}
      style={[styles.featureCardContainer, animatedStyle]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      >
        <View style={[styles.featureIconContainer, { backgroundColor: theme.accentLight }]}>
          <Icon size={22} color={theme.accent} />
        </View>
        <View style={styles.featureText}>
          <Text style={[styles.featureTitle, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.featureDesc, { color: theme.secondaryText }]}>{desc}</Text>
        </View>
        <View style={[styles.soonBadge, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.soonText, { color: theme.tertiaryText }]}>Soon</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SubscriptionSettingsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const themeWithFlag = { ...theme, isDark };

  let featureIndex = 0;

  return (
    <BackgroundGradient>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnRow} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40, paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroCardContainer}>
          <LinearGradient
            colors={isDark ? ['#1C1C1E', '#2C2C2E'] : ['#FFFFFF', '#F2F2F7']}
            style={[styles.heroCard, { borderColor: theme.cardBorder }]}
          >
            <LinearGradient colors={[theme.accent, theme.accent + 'CC']} style={styles.heroIconContainer}>
              <Crown size={32} color="white" />
            </LinearGradient>
            <View style={styles.heroSoonBadge}>
              <Text style={[styles.heroSoonText, { color: theme.accent }]}>COMING SOON</Text>
            </View>
            <Text style={[styles.heroTitle, { color: theme.primaryText }]}>Groundwork Pro</Text>
            <Text style={[styles.heroSubtitle, { color: theme.secondaryText }]}>
              Master your time with advanced tools designed for deep focus — planned as a{' '}
              <Text style={{ fontFamily: 'Inter_700Bold', color: theme.accent }}>1 year subscription</Text>.
            </Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          style={[styles.infoBox, { backgroundColor: theme.accentLight, borderColor: theme.accentBorder }]}
        >
          <View style={[styles.infoIconCircle, { backgroundColor: theme.accent + '18' }]}>
            <Info size={18} color={theme.accent} />
          </View>
          <Text style={[styles.infoText, { color: theme.primaryText }]}>
            Groundwork Pro is in development. Until launch,{' '}
            <Text style={{ fontFamily: 'Inter_700Bold', color: theme.accent }}>all users have full access</Text>{' '}
            to the current app for free.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInRight.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>WHAT&apos;S INCLUDED</Text>
        </Animated.View>

        {PRO_SECTIONS.map((section) => (
          <View key={section.title} style={styles.featureSection}>
            <Text style={[styles.groupTitle, { color: theme.secondaryText }]}>{section.title}</Text>
            <View style={styles.featuresList}>
              {section.features.map((feature) => {
                const idx = featureIndex++;
                return (
                  <FeatureCard key={feature.title} index={idx} {...feature} theme={themeWithFlag} />
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.tertiaryText }]}>
            Thank you for being part of the Groundwork journey.
          </Text>
        </View>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingRight: 16, marginLeft: -4 },
  backText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  heroCardContainer: {
    width: '100%',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  heroCard: { width: '100%', padding: 32, borderRadius: 32, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  heroIconContainer: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroSoonBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, marginBottom: 16 },
  heroSoonText: { fontSize: 11, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1.5 },
  heroTitle: { fontSize: 32, fontFamily: 'Inter_800ExtraBold', textAlign: 'center', marginBottom: 10 },
  heroSubtitle: { fontSize: 16, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 24, opacity: 0.85 },
  infoBox: { flexDirection: 'row', padding: 18, borderRadius: 24, marginBottom: 32, borderWidth: 1, gap: 16, alignItems: 'center' },
  infoIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 1, marginBottom: 16, marginLeft: 4 },
  featureSection: { marginBottom: 8 },
  groupTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 },
  featuresList: { gap: 12 },
  featureCardContainer: { width: '100%' },
  featureCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  featureIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  featureDesc: { fontSize: 13, fontFamily: 'Inter_500Medium', opacity: 0.75 },
  soonBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  soonText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  footer: { alignItems: 'center', marginTop: 24, paddingHorizontal: 40 },
  footerText: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 18, opacity: 0.6 },
});
