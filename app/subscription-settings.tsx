import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Crown, 
  Zap, 
  CheckCircle2, 
  Moon, 
  Palette, 
  Bell, 
  Tag, 
  BarChart3, 
  Cloud, 
  LayoutGrid,
  Info
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { 
  Dimensions, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PRO_FEATURES = [
  { icon: CheckCircle2, title: 'Unlimited Tasks', desc: 'No limits on your productivity' },
  { icon: Moon, title: 'AMOLED Dark Theme', desc: 'Pure black for OLED screens' },
  { icon: Palette, title: 'Custom App Icons', desc: 'Personalize your home screen' },
  { icon: Bell, title: 'Advanced Reminders', desc: 'Custom sounds and repeating alerts' },
  { icon: Tag, title: 'Categories & Labels', desc: 'Organize tasks with custom tags' },
  { icon: BarChart3, title: 'Productivity Stats', desc: 'Simple insights into your focus' },
  { icon: Cloud, title: 'Backup & Restore', desc: 'Your data, always safe and synced' },
  { icon: LayoutGrid, title: 'Home Screen Widgets', desc: 'Access tasks without opening the app' },
  { icon: Zap, title: 'Early Access', desc: 'Be the first to try new features' },
];

function FeatureCard({ icon: Icon, title, desc, theme, index }: any) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(400 + index * 50).duration(500)}
      style={[styles.featureCardContainer, animatedStyle]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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

  const accentColor = '#007AFF';

  return (
    <BackgroundGradient>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      {/* Immersive Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtnRow}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={theme.accent} />
          <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40, paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Animated.View 
          entering={FadeInDown.duration(600)}
          style={styles.heroCardContainer}
        >
          <LinearGradient
            colors={isDark ? ['#1C1C1E', '#2C2C2E'] : ['#FFFFFF', '#F2F2F7']}
            style={[styles.heroCard, { borderColor: theme.cardBorder }]}
          >
            <LinearGradient
              colors={['#007AFF', '#00C6FF']}
              style={styles.heroIconContainer}
            >
              <Crown size={32} color="white" />
            </LinearGradient>
            
            <View style={styles.heroSoonBadge}>
              <Text style={styles.heroSoonText}>COMING SOON</Text>
            </View>
            
            <Text style={[styles.heroTitle, { color: theme.primaryText }]}>Groundwork Pro</Text>
            <Text style={[styles.heroSubtitle, { color: theme.secondaryText }]}>
              Master your time with advanced tools designed for deep focus.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Info Box */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.04)', borderColor: 'rgba(0,122,255,0.15)' }]}
        >
          <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <Info size={18} color={accentColor} />
          </View>
          <Text style={[styles.infoText, { color: theme.primaryText }]}>
            Groundwork Pro is currently under development and will arrive in a future update. Until then, <Text style={{ fontFamily: 'Inter_700Bold', color: accentColor }}>all users continue to have full access</Text> to the current app experience for free.
          </Text>
        </Animated.View>

        {/* Features Title */}
        <Animated.View entering={FadeInRight.delay(300).duration(500)}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>WHAT'S INCLUDED</Text>
        </Animated.View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {PRO_FEATURES.map((feature, index) => (
            <FeatureCard 
              key={index} 
              index={index} 
              {...feature} 
              theme={theme} 
            />
          ))}
        </View>

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
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 16,
    marginLeft: -4,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_800ExtraBold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  heroCardContainer: {
    width: '100%',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroCard: {
    width: '100%',
    padding: 32,
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroSoonBadge: {
    backgroundColor: 'rgba(0,122,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 50,
    marginBottom: 16,
  },
  heroSoonText: {
    color: '#007AFF',
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.7,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 24,
    marginBottom: 32,
    borderWidth: 1,
    gap: 16,
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  featuresList: {
    gap: 12,
  },
  featureCardContainer: {
    width: '100%',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  soonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soonText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 40,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 18,
    opacity: 0.6,
  },
});
