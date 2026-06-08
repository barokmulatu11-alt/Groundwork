import { AppText as Text } from '@/components/ui/AppText';
import { trackProEvent } from '@/lib/subscriptionService';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    BarChart3,
    Bell,
    BookOpen,
    CheckCircle2,
    Crown,
    Flame,
    Lock,
    Moon,
    Sparkles,
    X,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Quick highlight bullets shown in every paywall ─────────────────────────

const HIGHLIGHTS = [
  { icon: CheckCircle2, label: 'Unlimited Tasks & Habits' },
  { icon: BarChart3, label: 'Deep Analytics & Insights' },
  { icon: Moon, label: 'Premium Themes' },
  { icon: Flame, label: 'Habit Heatmaps & Trends' },
  { icon: BookOpen, label: 'Unlimited Study Spaces' },
  { icon: Bell, label: 'Advanced Reminders' },
  { icon: Lock, label: 'Note & Folder Security' },
  { icon: Sparkles, label: 'Pro XP Boost & Profile Flair' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ProPaywallProps {
  visible: boolean;
  onClose: () => void;
  /** Name of the locked feature — shown in the headline */
  featureName?: string;
  /** One-line description of the benefit */
  featureDescription?: string;
  /** Which screen / feature triggered the paywall — used for analytics */
  source?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProPaywall({
  visible,
  onClose,
  featureName,
  featureDescription,
  source,
}: ProPaywallProps) {
  const { theme, isDark } = useTheme();
  const { accentColor } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Track paywall impression once on open
  useEffect(() => {
    if (visible) {
      trackProEvent('paywall_view', { feature: featureName, source });
    }
  }, [visible]);

  const handleUpgrade = () => {
    trackProEvent('upgrade_tap', { feature: featureName, source });
    onClose();
    router.push('/upgrade' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(180)}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#0F1117' : '#FFFFFF',
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Dismiss handle */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.card }]}
            activeOpacity={0.7}
          >
            <X size={16} color={theme.secondaryText} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Hero gradient icon */}
            <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.heroWrap}>
              <LinearGradient
                colors={[accentColor, accentColor + 'AA']}
                style={styles.heroIcon}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Crown size={36} color="#FFF" />
              </LinearGradient>
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeInDown.delay(120).duration(400)}>
              <Text style={[styles.proLabel, { color: accentColor }]}>
                GROUNDWORK PRO
              </Text>
              <Text style={[styles.headline, { color: theme.primaryText }]}>
                {featureName
                  ? `${featureName} is a Pro feature`
                  : 'Unlock your full potential'}
              </Text>
              {featureDescription && (
                <Text style={[styles.featureDesc, { color: theme.secondaryText }]}>
                  {featureDescription}
                </Text>
              )}
            </Animated.View>

            {/* Free vs Pro comparison strip */}
            <Animated.View
              entering={FadeInDown.delay(160).duration(400)}
              style={[styles.comparisonRow, { borderColor: theme.cardBorder }]}
            >
              <View
                style={[
                  styles.comparisonCol,
                  { borderRightWidth: 1, borderRightColor: theme.cardBorder },
                ]}
              >
                <Text style={[styles.compLabel, { color: theme.secondaryText }]}>FREE</Text>
                <Text style={[styles.compValue, { color: theme.primaryText }]}>100 tasks</Text>
                <Text style={[styles.compValue, { color: theme.primaryText }]}>5 habits</Text>
                <Text style={[styles.compValue, { color: theme.primaryText }]}>5 study spaces</Text>
                <Text style={[styles.compValue, { color: theme.primaryText }]}>Basic themes</Text>
              </View>
              <View style={styles.comparisonCol}>
                <Text style={[styles.compLabel, { color: accentColor }]}>PRO ✦</Text>
                <Text style={[styles.compValuePro, { color: accentColor }]}>Unlimited tasks</Text>
                <Text style={[styles.compValuePro, { color: accentColor }]}>Unlimited habits</Text>
                <Text style={[styles.compValuePro, { color: accentColor }]}>Unlimited spaces</Text>
                <Text style={[styles.compValuePro, { color: accentColor }]}>7 premium themes</Text>
              </View>
            </Animated.View>

            {/* Feature highlights */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.highlights}>
              {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
                <View key={i} style={styles.highlightRow}>
                  <View style={[styles.highlightIcon, { backgroundColor: accentColor + '18' }]}>
                    <Icon size={14} color={accentColor} />
                  </View>
                  <Text style={[styles.highlightLabel, { color: theme.primaryText }]}>
                    {label}
                  </Text>
                </View>
              ))}
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInDown.delay(240).duration(400)}>
              <TouchableOpacity
                onPress={handleUpgrade}
                activeOpacity={0.85}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={[accentColor, accentColor + 'CC']}
                  style={styles.cta}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Crown size={18} color="#FFF" />
                  <Text style={styles.ctaText}>View Pro Plans</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.dismissBtn}
              >
                <Text style={[styles.dismissText, { color: theme.secondaryText }]}>
                  Maybe later
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  heroWrap: {
    marginBottom: 20,
    marginTop: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  proLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  headline: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
    opacity: 0.8,
  },
  comparisonRow: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    marginVertical: 20,
    overflow: 'hidden',
  },
  comparisonCol: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  compLabel: {
    fontSize: 11,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  compValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    opacity: 0.7,
  },
  compValuePro: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  highlights: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  ctaWrap: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: 'Inter_800ExtraBold',
    color: '#FFF',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
