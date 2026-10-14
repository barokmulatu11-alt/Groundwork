import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Check, ChevronRight, Play, Timer, Sparkles } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { NotificationSheet } from '@/components/NotificationSheet';
import { useTheme } from '@/lib/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { habitCompletedOnDate, parseHabitDates } from '@/lib/habitUtils';
import { getMilestoneProgress } from '@/lib/rewardsService';
import { neonData } from '@/lib/neon';
import { getLocalDateString, formatHeaderDate } from '@/lib/dateUtils';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile, session } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const {
    tasks,
    habits,
    focusSessions,
    loadAllTasks,
    loadHabits,
    loadFocusSessions,
    toggleTask,
    toggleHabit,
  } = useStore();

  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Sync / refresh data on screen focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          await Promise.all([
            loadAllTasks(),
            loadHabits(),
            loadFocusSessions ? loadFocusSessions() : Promise.resolve(),
          ]);
        } catch (e) {
          console.error('[DashboardScreen] Failed to load dashboard data:', e);
        }
      };
      fetchData();
      return () => {
        isActive = false;
      };
    }, [loadAllTasks, loadHabits, loadFocusSessions])
  );

  // Notification badge & AppState listener
  useEffect(() => {
    const checkUnread = async () => {
      const { session } = useAuthStore.getState();
      if (!session?.user?.id) return;
      try {
        const { count } = await neonData
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_read', false);
        setHasUnread((count || 0) > 0);
      } catch (_) {}
    };
    checkUnread();

    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkUnread();
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, []);

  // Date formatting using local calendar dates
  const todayDateFormatted = formatHeaderDate();
  const todayStr = getLocalDateString();

  // Tasks dataset: Real data only, no sample fallbacks
  const activeTasks = (tasks || []).filter((t) => !t.deleted_at);
  const todayTasksList = activeTasks.filter((t) => t.date === todayStr || !t.date);
  const completedTodayTasks = todayTasksList.filter((t) => t.completed);
  const completedTasksCount = completedTodayTasks.length;
  const totalTasksCount = todayTasksList.length;

  // Real Habits dataset: Real check-in status from dates_completed
  const realHabits = habits || [];

  // Milestone Progress: only real numbers, zero is valid data
  const milestoneProgress = getMilestoneProgress();
  const totalCompletedAllTime = activeTasks.filter((t) => t.completed).length;
  const rewardTarget = 10;
  const rewardCurrent = Math.min(rewardTarget, totalCompletedAllTime);
  const rewardPercent = Math.min(100, Math.round((rewardCurrent / rewardTarget) * 100));

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const {
    focusTimerActive,
    focusTimerTimeLeft,
    focusTimerDurationMinutes,
  } = useSettingsStore();

  const formattedTimer = React.useMemo(() => {
    if (focusTimerActive && focusTimerTimeLeft > 0) {
      const mins = Math.floor(focusTimerTimeLeft / 60);
      const secs = focusTimerTimeLeft % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    const dur = focusTimerDurationMinutes || 25;
    return `${String(dur).padStart(2, '0')}:00`;
  }, [focusTimerActive, focusTimerTimeLeft, focusTimerDurationMinutes]);

  return (
    <View style={styles.root}>
      {/* Approved wordmark header */}
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showMoreMenu onRightPress={() => router.push('/settings' as any)} />
      </View>

      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 32 : 20,
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 90,
          maxWidth: isDesktop ? 640 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Date line */}
        <Text style={styles.dateLabel}>{todayDateFormatted}</Text>

        {/* Page Heading & Subtitle */}
        <Text style={styles.pageHeading}>Make space.</Text>
        <Text style={styles.pageSubline}>A clear day starts with one focused action.</Text>

        <View style={styles.thinDivider} />

        {/* ── 01 Your day (Tasks) ────────────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionIndex}>01</Text>
              <Text style={styles.sectionTitle}>Your day</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/tasks?create=true' as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Add task"
            >
              <Text style={styles.blueActionText}>+ Add task</Text>
            </TouchableOpacity>
          </View>

          {todayTasksList.length === 0 ? (
            /* Honest empty state matching mockup */
            <View style={styles.emptyContainer}>
              <View style={styles.zeroNumeralRow}>
                <Text style={styles.hugeZeroNumeral}>0</Text>
                <Text style={styles.numeralUnitText}>tasks planned</Text>
              </View>
              <Text style={styles.emptyPrimaryPrompt}>A clear page.</Text>
              <Text style={styles.emptySecondaryPrompt}>Start with what matters today.</Text>

              <TouchableOpacity
                onPress={() => router.push('/tasks?create=true' as any)}
                style={styles.inlineCreateBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.blueActionText}>+ Create your first task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Real task rows */
            <View style={styles.listContainer}>
              <Text style={styles.counterSummary}>
                {completedTasksCount} of {totalTasksCount} completed
              </Text>
              {todayTasksList.slice(0, 4).map((task, idx) => {
                const isLast = idx === Math.min(todayTasksList.length, 4) - 1;
                return (
                  <View
                    key={task.id}
                    style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        hapticSuccess();
                        toggleTask(task.id, task.completed);
                      }}
                      style={[
                        styles.taskCheckbox,
                        task.completed && styles.taskCheckboxCompleted,
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: task.completed }}
                    >
                      {task.completed && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/tasks/task-detail',
                          params: { id: task.id },
                        } as any)
                      }
                      style={styles.itemTextWrap}
                    >
                      <Text
                        style={[
                          styles.taskTitleText,
                          task.completed && styles.taskTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {task.title || 'Untitled task'}
                      </Text>
                      {task.due_time ? (
                        <Text style={styles.itemSubText}>Today · {task.due_time}</Text>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/tasks/task-detail',
                          params: { id: task.id },
                        } as any)
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <ChevronRight size={16} color="#8E8C87" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {todayTasksList.length > 4 && (
                <TouchableOpacity
                  onPress={() => router.push('/tasks' as any)}
                  style={styles.viewMoreRow}
                >
                  <Text style={styles.viewMoreText}>
                    View all {todayTasksList.length} tasks →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.thinDivider} />

        {/* ── Integrated Focus Section with Serif Timer ─────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Timer size={18} color="#0066FF" strokeWidth={2} />
              <Text style={styles.sectionTitle}>Focus</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/focus' as any)}
              accessibilityRole="button"
            >
              <Text style={styles.blueActionText}>Open timer →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.focusContainer}>
            <View style={styles.focusTimerRow}>
              <Text style={styles.serifTimerText}>{formattedTimer}</Text>
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  router.push('/focus' as any);
                }}
                style={styles.focusStartBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={focusTimerActive ? 'Resume focus session' : 'Start focus session'}
              >
                <Play size={14} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.focusStartBtnText}>
                  {focusTimerActive ? 'Resume focus' : 'Start focus'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.focusSubline}>
              {focusTimerActive
                ? 'Focus session in progress. Stay in the zone.'
                : 'Give your mind single direction. Dedicated study session.'}
            </Text>
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* ── 02 Daily rituals (Habits) ──────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionIndex}>02</Text>
              <Text style={styles.sectionTitle}>Daily rituals</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/habits' as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
            >
              <Text style={styles.blueActionText}>+ Add habit</Text>
            </TouchableOpacity>
          </View>

          {realHabits.length === 0 ? (
            /* Honest empty state matching mockup */
            <View style={styles.emptyContainer}>
              <View style={styles.zeroNumeralRow}>
                <Text style={styles.hugeZeroNumeral}>0</Text>
                <Text style={styles.numeralUnitText}>habits yet</Text>
              </View>
              <Text style={styles.emptyPrimaryPrompt}>Start with something small.</Text>
              <Text style={styles.emptySecondaryPrompt}>Choose one thing you want to repeat.</Text>

              <TouchableOpacity
                onPress={() => router.push('/habits' as any)}
                style={styles.inlineCreateBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.blueActionText}>+ Create your first habit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Real habits list */
            <View style={styles.listContainer}>
              {realHabits.slice(0, 3).map((habit, idx) => {
                const isCompleted = habitCompletedOnDate(habit, todayStr);
                const isLast = idx === Math.min(realHabits.length, 3) - 1;

                return (
                  <View
                    key={habit.id}
                    style={[styles.itemRow, !isLast && styles.itemRowBorder]}
                  >
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.habitTitleText}>{habit.title}</Text>
                      <Text style={styles.itemSubText}>
                        {habit.streak || 0} day streak
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={async () => {
                        await toggleHabit(habit.id, todayStr);
                      }}
                      style={[
                        styles.habitCheckCircle,
                        isCompleted && styles.habitCheckCircleActive,
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompleted }}
                    >
                      {isCompleted && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </TouchableOpacity>
                  </View>
                );
              })}

              {realHabits.length > 3 && (
                <TouchableOpacity
                  onPress={() => router.push('/habits' as any)}
                  style={styles.viewMoreRow}
                >
                  <Text style={styles.viewMoreText}>
                    View all {realHabits.length} habits →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.thinDivider} />

        {/* ── Compact Milestone Progress (Real data only) ───────────────────── */}
        <TouchableOpacity
          onPress={() => router.push('/rewards' as any)}
          style={styles.milestoneBox}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Milestone rewards"
        >
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneTitleGroup}>
              <Sparkles size={16} color="#0066FF" />
              <Text style={styles.milestoneTitle}>Consistency milestone</Text>
            </View>
            <Text style={styles.milestoneCount}>
              {rewardCurrent} / {rewardTarget} tasks
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${rewardPercent}%` }]} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Notifications modal */}
      <NotificationSheet
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </View>
  );
}

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    dateLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 2,
      color: theme.secondaryText,
      marginBottom: 6,
    },
    pageHeading: {
      fontSize: 42,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -1,
      color: theme.primaryText,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 20,
      lineHeight: 22,
    },
    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 20,
    },
    sectionWrap: {
      width: '100%',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 16,
    },
    sectionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 10,
    },
    sectionIndex: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.accent,
    },
    sectionTitle: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      letterSpacing: -0.4,
      color: theme.primaryText,
    },
    blueActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Empty state matching mockups
    emptyContainer: {
      paddingVertical: 10,
    },
    zeroNumeralRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 10,
    },
    hugeZeroNumeral: {
      fontSize: 54,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      lineHeight: 58,
    },
    numeralUnitText: {
      fontSize: 22,
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
      color: theme.primaryText,
    },
    emptyPrimaryPrompt: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    emptySecondaryPrompt: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginBottom: 14,
    },
    inlineCreateBtn: {
      paddingVertical: 4,
    },

    // List rows
    listContainer: {
      width: '100%',
    },
    counterSummary: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
      marginBottom: 10,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    itemRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    itemTextWrap: {
      flex: 1,
      marginLeft: 14,
    },
    taskCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.6,
      borderColor: theme.checkboxBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskCheckboxCompleted: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    taskTitleText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.primaryText,
    },
    taskTitleCompleted: {
      color: theme.secondaryText,
      textDecorationLine: 'line-through',
    },
    itemSubText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginTop: 2,
    },
    viewMoreRow: {
      paddingTop: 10,
    },
    viewMoreText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Focus section
    focusContainer: {
      width: '100%',
      paddingVertical: 6,
    },
    focusTimerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    serifTimerText: {
      fontSize: 40,
      fontFamily: 'PlayfairDisplay_700Bold',
      letterSpacing: -1,
      color: theme.primaryText,
    },
    focusStartBtn: {
      backgroundColor: theme.accent,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
    },
    focusStartBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
    },
    focusSubline: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },

    // Habit circular check-in
    habitTitleText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.primaryText,
    },
    habitCheckCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.8,
      borderColor: theme.checkboxBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitCheckCircleActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },

    // Milestone Progress
    milestoneBox: {
      width: '100%',
      paddingVertical: 6,
    },
    milestoneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    milestoneTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    milestoneTitle: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    milestoneCount: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    progressTrack: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 2,
      overflow: 'hidden',
      width: '100%',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.accent,
      borderRadius: 2,
    },
  });
