/**
 * rewards.tsx — Milestone Rewards Screen
 * Minimal Groundwork aesthetic displaying verifiable usage unlocks:
 * - Completed tasks
 * - Completed focus sessions
 * - Distinct-day habit check-ins
 */

import { BrandHeader } from '@/components/ui/BrandHeader';
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
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RewardsScreen() {
  const { theme, isDark } = useTheme();
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

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
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
            tintColor={theme.accent}
          />
        }
      >
        {/* Header */}
        <BrandHeader title="groundwork." onBack={() => router.back()} />

        <View style={{ marginBottom: 28, marginTop: 8 }}>
          <Text style={styles.mainTitle}>
            Milestones.
          </Text>
          <Text style={styles.subTitle}>
            Features earned through consistency.
          </Text>
        </View>

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
                <Text style={[styles.celebrationSub, { color: theme.text }]}>
                  You unlocked {celebratedReward}. Great work!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCelebratedReward(null)}
                style={styles.celebrationClose}
              >
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Stat Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statBox}>
            <CheckCircle2 size={16} color="#34C759" />
            <Text style={styles.statNum}>
              {progress.completedTasks}
            </Text>
            <Text style={styles.statLabel}>
              Tasks Done
            </Text>
          </View>

          <View style={styles.statBox}>
            <Clock size={16} color={theme.accent} />
            <Text style={styles.statNum}>
              {progress.focusSessions}
            </Text>
            <Text style={styles.statLabel}>
              Focus Sessions
            </Text>
          </View>

          <View style={styles.statBox}>
            <Flame size={16} color="#FF9500" />
            <Text style={styles.statNum}>
              {progress.habitDays}
            </Text>
            <Text style={styles.statLabel}>
              Habit Days
            </Text>
          </View>
        </View>

        {/* Overall Completion Bar */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>
              Total Unlocked
            </Text>
            <Text style={styles.overviewCount}>
              {unlockedCount} / {totalCount}
            </Text>
          </View>
          <View style={styles.overviewTrack}>
            <View
              style={[
                styles.overviewFill,
                {
                  width: `${(unlockedCount / totalCount) * 100}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
        </View>

        {/* Next Milestone Card */}
        {nextMilestone && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>
              NEXT UNLOCK
            </Text>
            <View style={styles.nextCard}>
              <View style={styles.nextHeader}>
                <View
                  style={[
                    styles.nextIconBox,
                    { backgroundColor: `${theme.accent}15` },
                  ]}
                >
                  <Award size={18} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextTitle}>
                    {nextMilestone.reward.title}
                  </Text>
                  <Text style={styles.nextSub}>
                    {nextMilestone.reward.requirementLabel}
                  </Text>
                </View>
                <Text style={styles.nextPercent}>
                  {nextMilestone.percent}%
                </Text>
              </View>

              <View style={styles.nextTrack}>
                <View
                  style={[
                    styles.nextFill,
                    {
                      width: `${Math.min(100, Math.max(4, nextMilestone.percent))}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* All Rewards List */}
        <Text style={styles.sectionTitle}>
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
                      <Lock size={16} color={theme.textMuted} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.rewardTitleRow}>
                      <Text style={styles.rewardTitle}>
                        {reward.title}
                      </Text>
                      {unlocked ? (
                        <View style={styles.unlockedBadge}>
                          <Text style={styles.unlockedBadgeText}>UNLOCKED</Text>
                        </View>
                      ) : (
                        <Text style={styles.inProgressText}>
                          {percent}%
                        </Text>
                      )}
                    </View>

                    <Text style={styles.rewardDesc}>
                      {reward.description}
                    </Text>

                    <Text style={styles.reqText}>
                      Requirement: {reward.requirementLabel}
                    </Text>

                    {!unlocked && (
                      <View style={styles.itemTrack}>
                        <View
                          style={[
                            styles.itemFill,
                            {
                              width: `${Math.min(100, Math.max(4, percent))}%`,
                              backgroundColor: theme.accent,
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
      </ScrollView>
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mainTitle: {
      fontSize: 36,
      fontFamily: 'Inter_700Bold',
      color: theme.text,
      letterSpacing: -1,
    },
    subTitle: {
      fontSize: 16,
      fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
      color: theme.textSecondary,
      marginTop: 4,
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
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
      alignItems: 'center',
      gap: 4,
    },
    statNum: {
      fontSize: 18,
      fontFamily: 'Inter_800ExtraBold',
      color: theme.text,
    },
    statLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
    },
    overviewCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
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
      color: theme.text,
    },
    overviewCount: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    overviewTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    overviewFill: {
      height: '100%',
      borderRadius: 4,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.2,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    nextCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
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
      color: theme.text,
    },
    nextSub: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
      marginTop: 2,
    },
    nextPercent: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    nextTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
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
      borderColor: theme.separator,
      backgroundColor: theme.cardSolid,
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
      color: theme.text,
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
      color: theme.accent,
    },
    rewardDesc: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 6,
    },
    reqText: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: theme.textMuted,
    },
    itemTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    },
    itemFill: {
      height: '100%',
      borderRadius: 2,
    },
  });
}
