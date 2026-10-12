import { AppText as Text } from '@/components/ui/AppText';
import {
  getMilestoneProgress,
  getMilestoneProgressPercent,
  REWARD_DEFINITIONS,
  RewardDefinition,
} from '@/lib/rewardsService';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
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

export interface ProPaywallProps {
  visible: boolean;
  onClose: () => void;
  featureName?: string;
  featureDescription?: string;
  source?: string;
}

export function MilestoneUnlockModal({
  visible,
  onClose,
  featureName = 'Milestone Feature',
  featureDescription,
  source,
}: ProPaywallProps) {
  const { theme, isDark } = useTheme();
  const { accentColor } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const progress = useMemo(() => getMilestoneProgress(), [visible]);

  // Find matching milestone definition if available
  const matchedReward: RewardDefinition | undefined = useMemo(() => {
    const query = featureName.toLowerCase();
    return REWARD_DEFINITIONS.find((r) => {
      const title = r.title.toLowerCase();
      return (
        title.includes(query) ||
        query.includes(title) ||
        (query.includes('theme') && r.id === 'premium_themes') ||
        (query.includes('analytic') && r.id === 'deep_analytics') ||
        (query.includes('revision') && r.id === 'deep_analytics') ||
        (query.includes('report') && r.id === 'deep_analytics') ||
        (query.includes('preset') && r.id === 'focus_presets') ||
        (query.includes('export') && r.id === 'note_export') ||
        (query.includes('security') && r.id === 'note_security') ||
        (query.includes('lock') && r.id === 'note_security') ||
        (query.includes('heatmap') && r.id === 'habit_heatmaps')
      );
    });
  }, [featureName]);

  const req = matchedReward?.requirement || { completedTasks: 10 };
  const percent = getMilestoneProgressPercent(req, progress);

  const handleViewRewards = () => {
    onClose();
    router.push('/rewards' as any);
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
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? '#111318' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          {/* Dismiss handle */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: isDark ? '#1C1F26' : '#F2F2F7' }]}
            activeOpacity={0.7}
          >
            <X size={16} color={theme.secondaryText} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Minimal Icon Badge */}
            <Animated.View entering={FadeInDown.delay(60).duration(350)} style={styles.heroWrap}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: accentColor + '18', borderColor: accentColor + '30' },
                ]}
              >
                <Trophy size={32} color={accentColor} strokeWidth={2} />
              </View>
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <Text style={[styles.kicker, { color: accentColor }]}>
                MILESTONE REWARD
              </Text>
              <Text style={[styles.headline, { color: theme.primaryText }]}>
                {matchedReward ? matchedReward.title : featureName}
              </Text>
              <Text style={[styles.desc, { color: theme.secondaryText }]}>
                {featureDescription ||
                  matchedReward?.description ||
                  'Earn this capability simply by using Groundwork and building your daily focus.'}
              </Text>
            </Animated.View>

            {/* Progress Card */}
            <Animated.View
              entering={FadeInDown.delay(140).duration(350)}
              style={[
                styles.progressCard,
                {
                  backgroundColor: isDark ? '#171A21' : '#F7F8FA',
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: theme.primaryText }]}>
                  Milestone Progress
                </Text>
                <Text style={[styles.progressPercent, { color: accentColor }]}>
                  {percent}%
                </Text>
              </View>

              {/* Progress track */}
              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(4, percent))}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>

              {/* Requirement Items */}
              <View style={styles.reqList}>
                {req.completedTasks !== undefined && (
                  <View style={styles.reqItem}>
                    <CheckCircle2
                      size={14}
                      color={progress.completedTasks >= req.completedTasks ? '#34C759' : theme.tertiaryText}
                    />
                    <Text style={[styles.reqLabel, { color: theme.secondaryText }]}>
                      Completed Tasks:
                    </Text>
                    <Text style={[styles.reqValue, { color: theme.primaryText }]}>
                      {progress.completedTasks} / {req.completedTasks}
                    </Text>
                  </View>
                )}

                {req.focusSessions !== undefined && (
                  <View style={styles.reqItem}>
                    <Clock
                      size={14}
                      color={progress.focusSessions >= req.focusSessions ? '#34C759' : theme.tertiaryText}
                    />
                    <Text style={[styles.reqLabel, { color: theme.secondaryText }]}>
                      Focus Sessions:
                    </Text>
                    <Text style={[styles.reqValue, { color: theme.primaryText }]}>
                      {progress.focusSessions} / {req.focusSessions}
                    </Text>
                  </View>
                )}

                {req.habitDays !== undefined && (
                  <View style={styles.reqItem}>
                    <Flame
                      size={14}
                      color={progress.habitDays >= req.habitDays ? '#34C759' : theme.tertiaryText}
                    />
                    <Text style={[styles.reqLabel, { color: theme.secondaryText }]}>
                      Habit Check-in Days:
                    </Text>
                    <Text style={[styles.reqValue, { color: theme.primaryText }]}>
                      {progress.habitDays} / {req.habitDays}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* CTA Button */}
            <Animated.View entering={FadeInDown.delay(180).duration(350)}>
              <TouchableOpacity
                onPress={handleViewRewards}
                activeOpacity={0.85}
                style={styles.ctaWrap}
              >
                <View style={[styles.cta, { backgroundColor: accentColor }]}>
                  <Award size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.ctaText}>View All Milestone Rewards</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.dismissBtn}
              >
                <Text style={[styles.dismissText, { color: theme.secondaryText }]}>
                  Keep Working
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Retain ProPaywall as drop-in backwards compatible export
export const ProPaywall = MilestoneUnlockModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  kicker: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  headline: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  progressPercent: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  reqList: {
    gap: 8,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  reqValue: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  ctaWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
