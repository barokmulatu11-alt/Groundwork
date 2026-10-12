/**
 * rewards.tsx — Milestone Rewards Screen
 * Minimal Groundwork aesthetic displaying verifiable usage unlocks:
 * - Completed tasks
 * - Completed focus sessions
 * - Distinct-day habit check-ins
 */

import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AppText as Text } from '@/components/ui/AppText';
import { hapticSuccess } from '@/lib/haptics';
import {
  getMilestoneProgress,
  getMilestoneProgressPercent,
  isExistingPaidUser,
  isRequirementMet,
  isRewardCelebrated,
  markRewardCelebrated,
  REWARD_DEFINITIONS,
  RewardDefinition,
  RewardId,
  UserProgress,
} from '@/lib/rewardsService';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Lock,
  ReceiptText,
  Sparkles,
  Trophy,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RewardsScreen() {
  const { theme, isDark } = useTheme();
  const { accentColor } = useSettingsStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [progress, setProgress] = useState<UserProgress>(getMilestoneProgress());
  const [celebratedReward, setCelebratedReward] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isPaid = isExistingPaidUser();

  const loadData = useCallback(async () => {
    const p = getMilestoneProgress();
    setProgress(p);

    // Check for newly unlocked rewards that haven't been celebrated yet
    for (const reward of REWARD_DEFINITIONS) {
      const unlocked = isPaid || isRequirementMet(reward.requirement, p);
      if (unlocked) {
        const celebrated = await isRewardCelebrated(reward.id);
        if (!celebrated) {
          await markRewardCelebrated(reward.id);
          setCelebratedReward(reward.title);
          hapticSuccess();
          break; // Celebrate one at a time for restrained elegance
        }
      }
    }
  }, [isPaid]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Compute status for all rewards
  const rewardStatuses = useMemo(() => {
    return REWARD_DEFINITIONS.map((reward) => {
      const unlocked = isPaid || isRequirementMet(reward.requirement, progress);
      const percent = unlocked ? 100 : getMilestoneProgressPercent(reward.requirement, progress);
      return {
        reward,
        unlocked,
        percent,
      };
    });
  }, [progress, isPaid]);

  const unlockedCount = rewardStatuses.filter((r) => r.unlocked).length;
  const totalCount = REWARD_DEFINITIONS.length;

  // Find next milestone in progress
  const nextMilestone = useMemo(() => {
    if (unlockedCount === totalCount) return null;
    return rewardStatuses
      .filter((r) => !r.unlocked)
      .sort((a, b) => b.percent - a.percent)[0];
  }, [rewardStatuses, unlockedCount, totalCount]);

  return (
    <BackgroundGradient>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          maxWidth: isDesktop ? 700 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: isDesktop ? '100%' : undefined,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={theme.primaryText} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: theme.primaryText }]}>
              Milestone Rewards
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Unlocked through daily focus and consistency
            </Text>
          </View>
        </View>

        {/* Existing Paid Supporter Banner */}
        {isPaid && (
          <Animated.View entering={FadeIn.duration(300)}>
            <View
              style={[
                styles.supporterBanner,
                {
                  backgroundColor: accentColor + '12',
                  borderColor: accentColor + '30',
                },
              ]}
            >
              <Sparkles size={16} color={accentColor} />
              <Text style={[styles.supporterBannerText, { color: theme.primaryText }]}>
                Supporter Access: All milestones unlocked
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Restrained Celebration Banner */}
        {celebratedReward && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={[
                styles.celebrationBanner,
                {
                  backgroundColor: '#34C75918',
                  borderColor: '#34C75944',
                },
              ]}
            >
              <Trophy size={18} color="#34C759" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.celebrationTitle, { color: '#34C759' }]}>
                  Milestone Achieved
                </Text>
                <Text style={[styles.celebrationSub, { color: theme.primaryText }]}>
                  You unlocked {celebratedReward}. Great work!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCelebratedReward(null)}
                style={styles.celebrationClose}
              >
                <Text style={{ color: theme.secondaryText, fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Stat Strip */}
        <View style={styles.statsStrip}>
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <CheckCircle2 size={16} color="#34C759" />
            <Text style={[styles.statNum, { color: theme.primaryText }]}>
              {progress.completedTasks}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Tasks Done
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Clock size={16} color={accentColor} />
            <Text style={[styles.statNum, { color: theme.primaryText }]}>
              {progress.focusSessions}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Focus Sessions
            </Text>
          </View>

          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Flame size={16} color="#FF9500" />
            <Text style={[styles.statNum, { color: theme.primaryText }]}>
              {progress.habitDays}
            </Text>
            <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
              Habit Days
            </Text>
          </View>
        </View>

        {/* Overall Completion Bar */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <View style={styles.overviewHeader}>
            <Text style={[styles.overviewTitle, { color: theme.primaryText }]}>
              Total Unlocked
            </Text>
            <Text style={[styles.overviewCount, { color: accentColor }]}>
              {unlockedCount} / {totalCount}
            </Text>
          </View>
          <View
            style={[
              styles.overviewTrack,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <View
              style={[
                styles.overviewFill,
                {
                  width: `${(unlockedCount / totalCount) * 100}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        </View>

        {/* Next Milestone Card */}
        {nextMilestone && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
              NEXT UNLOCK
            </Text>
            <View
              style={[
                styles.nextCard,
                {
                  backgroundColor: theme.card,
                  borderColor: accentColor + '40',
                },
              ]}
            >
              <View style={styles.nextHeader}>
                <View
                  style={[
                    styles.nextIconBox,
                    { backgroundColor: accentColor + '15' },
                  ]}
                >
                  <Award size={18} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nextTitle, { color: theme.primaryText }]}>
                    {nextMilestone.reward.title}
                  </Text>
                  <Text style={[styles.nextSub, { color: theme.secondaryText }]}>
                    {nextMilestone.reward.requirementLabel}
                  </Text>
                </View>
                <Text style={[styles.nextPercent, { color: accentColor }]}>
                  {nextMilestone.percent}%
                </Text>
              </View>

              <View
                style={[
                  styles.nextTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <View
                  style={[
                    styles.nextFill,
                    {
                      width: `${Math.min(100, Math.max(4, nextMilestone.percent))}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* All Rewards List */}
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
          ALL REWARDS
        </Text>
        <View style={styles.rewardList}>
          {rewardStatuses.map(({ reward, unlocked, percent }, index) => (
            <Animated.View
              key={reward.id}
              entering={FadeInDown.delay(index * 40).duration(300)}
            >
              <View
                style={[
                  styles.rewardCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: unlocked ? theme.cardBorder : theme.cardBorder,
                    opacity: unlocked ? 1 : 0.88,
                  },
                ]}
              >
                <View style={styles.rewardRow}>
                  <View
                    style={[
                      styles.rewardIcon,
                      {
                        backgroundColor: unlocked
                          ? '#34C75918'
                          : isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.05)',
                      },
                    ]}
                  >
                    {unlocked ? (
                      <Check size={18} color="#34C759" strokeWidth={2.4} />
                    ) : (
                      <Lock size={16} color={theme.tertiaryText} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rewardTitleRow}>
                      <Text style={[styles.rewardTitle, { color: theme.primaryText }]}>
                        {reward.title}
                      </Text>
                      {unlocked ? (
                        <View style={styles.unlockedBadge}>
                          <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                        </View>
                      ) : (
                        <Text style={[styles.inProgressText, { color: accentColor }]}>
                          {percent}%
                        </Text>
                      )}
                    </View>

                    <Text style={[styles.rewardDesc, { color: theme.secondaryText }]}>
                      {reward.description}
                    </Text>

                    <Text style={[styles.reqText, { color: theme.tertiaryText }]}>
                      Requirement: {reward.requirementLabel}
                    </Text>

                    {!unlocked && (
                      <View
                        style={[
                          styles.itemTrack,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : 'rgba(0,0,0,0.05)',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.itemFill,
                            {
                              width: `${Math.min(100, Math.max(4, percent))}%`,
                              backgroundColor: accentColor,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Payment History Preservation Row */}
        <TouchableOpacity
          onPress={() => router.push('/payment-history' as any)}
          activeOpacity={0.7}
          style={[
            styles.paymentHistoryBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
            },
          ]}
        >
          <ReceiptText size={16} color={theme.secondaryText} />
          <Text style={[styles.paymentHistoryText, { color: theme.secondaryText }]}>
            View Past Payment Records
          </Text>
          <ChevronRight size={16} color={theme.tertiaryText} />
        </TouchableOpacity>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  supporterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  supporterBannerText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  celebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  celebrationSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  celebrationClose: {
    padding: 4,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 18,
    fontFamily: 'Inter_800ExtraBold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  overviewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overviewTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  overviewCount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  overviewTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overviewFill: {
    height: '100%',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  nextCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  nextIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  nextSub: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  nextPercent: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  nextTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nextFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardList: {
    gap: 10,
    marginBottom: 20,
  },
  rewardCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  rewardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  unlockedBadge: {
    backgroundColor: '#34C75918',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedBadgeText: {
    color: '#34C759',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.6,
  },
  inProgressText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  rewardDesc: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    lineHeight: 18,
    marginBottom: 6,
  },
  reqText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  itemTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  itemFill: {
    height: '100%',
    borderRadius: 2,
  },
  paymentHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
  },
  paymentHistoryText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
});
