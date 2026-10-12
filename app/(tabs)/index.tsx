import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { DailyQuoteBanner } from '@/components/DailyQuoteBanner';
import { NotificationSheet } from '@/components/NotificationSheet';
import { ActionRow } from '@/components/ui/ActionRow';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { AppText as Text } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { getPersonalizedGreetingParts } from '@/lib/GreetingUtils';
import { useTheme } from '@/lib/ThemeContext';
import { hapticLight } from '@/lib/haptics';
import { neonData } from '@/lib/neon';
import { getMilestoneProgress, isRewardUnlocked, REWARD_DEFINITIONS } from '@/lib/rewardsService';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useStore } from '@/store/useStore';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AlignJustify as ListIcon,
  Award,
  BellRing as Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  Flame,
  LayoutGrid,
  Play,
  Plus,
  Settings,
  Shield,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    notes,
    focusSessions,
    loadAllTasks,
    loadHabits,
    loadNotes,
    loadFocusSessions,
    toggleTask,
    lastSyncedAt,
    syncPartial,
  } = useStore();
  const { tasksLayout, setTasksLayout, notificationsEnabled } = useSettingsStore();

  const [greetingHeadline, setGreetingHeadline] = useState('');
  const [greetingSubline, setGreetingSubline] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const { useAuthStore } = require('@/store/useAuthStore');
          const { migrateGuestData } = require('@/lib/db');
          const session = useAuthStore.getState().session;
          if (session?.user?.id) {
            migrateGuestData('guest', session.user.id);
          }

          await loadAllTasks();
          await loadHabits();
          await loadNotes();
          await loadFocusSessions();

          if (!isActive) return;
          const currentHabits = useStore.getState().habits;
          const currentStreak = currentHabits.reduce((acc, h) => acc + h.streak, 0);

          const { rescheduleAll } = require('@/lib/notifications');
          if (notificationsEnabled) {
            await rescheduleAll(true, currentStreak);
          }

          setIsLoading(false);
        } catch (e) {
          console.error('Failed to load dashboard data:', e);
          if (isActive) setIsLoading(false);
        }
      };
      fetchData();
      return () => {
        isActive = false;
      };
    }, [loadAllTasks, loadHabits, loadNotes, loadFocusSessions, notificationsEnabled])
  );

  useEffect(() => {
    const checkUnread = async () => {
      const { session } = useAuthStore.getState();
      if (!session?.user?.id) return;
      const { count } = await neonData
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      setHasUnread((count || 0) > 0);
    };
    checkUnread();

    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkUnread();
      }
    });

    const today = new Date().toISOString().split('T')[0];
    const todayTasks = useStore.getState().tasks.filter((t) => t.date === today && !t.deleted_at);
    const completedToday = todayTasks.filter((t) => t.completed).length;
    const streak = useStore.getState().habits.reduce((acc, h) => acc + h.streak, 0);
    const displayName =
      profile?.full_name ||
      profile?.username ||
      session?.user?.user_metadata?.full_name ||
      session?.user?.email?.split('@')[0] ||
      null;
    const { headline, subline } = getPersonalizedGreetingParts({
      displayName,
      totalStreak: streak,
      tasksCompletedToday: completedToday,
      tasksTotalToday: todayTasks.length,
    });
    setGreetingHeadline(headline);
    setGreetingSubline(subline);

    const { requestPermissionsAsync } = require('@/lib/notifications');
    requestPermissionsAsync();

    return () => {
      appStateSub.remove();
    };
  }, []);

  const totalTasksCount = (tasks || []).length;
  const totalStreak = (habits || []).reduce((acc, h) => acc + h.streak, 0);
  const completedTasks = (tasks || []).filter((t) => t.completed).length;
  const completionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasks / totalTasksCount) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTodayTasks = (tasks || []).filter((t) => t.date === todayStr && !t.deleted_at);
  const completedTodayTasks = activeTodayTasks.filter((t) => t.completed);

  // Next milestone calculation
  const nextReward = REWARD_DEFINITIONS.find((r) => !isRewardUnlocked(r.id));
  const milestoneProgress = getMilestoneProgress();

  const todayDateStr = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    .toUpperCase();

  const isGrid = tasksLayout === 'grid';

  const renderCard = (
    type: string,
    title: string,
    count: string | number,
    Icon: any,
    color: string,
    route: any
  ) => {
    if (isGrid || isDesktop) {
      const cardWidth = isDesktop
        ? width >= 1024
          ? '31.5%'
          : '48.5%'
        : width < 380
        ? '48%'
        : '48.5%';
      return (
        <AnimatedCard
          key={type}
          testID={`home-card-${type}`}
          accessibilityRole="button"
          accessibilityLabel={`Navigate to ${title}`}
          onPress={() => router.push(route)}
          style={{ width: cardWidth, minHeight: 110, padding: 14, marginBottom: 12 }}
        >
          <View style={[styles.iconBox, { backgroundColor: 'transparent', marginBottom: 10 }]}>
            <Icon size={20} color={theme.accent} />
          </View>
          <View>
            <Text
              style={{
                fontSize: 15,
                fontFamily: 'Inter_700Bold',
                color: theme.primaryText,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.secondaryText,
                marginTop: 2,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              {count} {type}
            </Text>
          </View>
        </AnimatedCard>
      );
    }

    return (
      <View key={type} style={{ width: '100%', alignSelf: 'stretch', marginBottom: 10 }}>
        <ActionRow
          testID={`home-card-${type}`}
          accessibilityRole="button"
          accessibilityLabel={`Navigate to ${title}`}
          Icon={Icon}
          title={title}
          subtitle={`${count} ${type}`}
          onPress={() => router.push(route)}
        />
      </View>
    );
  };

  return (
    <BackgroundGradient>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{
          paddingHorizontal: isDesktop ? 32 : width < 380 ? 14 : 18,
          paddingBottom: Math.max(insets.bottom, 24) + 160,
          paddingTop: insets.top + 16,
          maxWidth: isDesktop ? 1080 : undefined,
          alignSelf: isDesktop ? 'center' : undefined,
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block: Date, Today title, quiet greeting & controls */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.dateText, { color: theme.secondaryText }]}>{todayDateStr}</Text>
            <View style={styles.headerIcons}>
              <Pressable
                style={[styles.iconBox, { backgroundColor: 'transparent' }]}
                onPress={() => {
                  hapticLight();
                  setNotificationsVisible(true);
                }}
                accessibilityLabel="Notifications"
              >
                <View>
                  <Bell size={18} color={theme.accent} />
                  {hasUnread && <View style={[styles.badge, { backgroundColor: theme.danger }]} />}
                </View>
              </Pressable>
              <Pressable
                style={[styles.iconBox, { backgroundColor: 'transparent' }]}
                onPress={() => router.push('/calendar')}
                accessibilityLabel="Calendar"
              >
                <Calendar size={18} color={theme.accent} />
              </Pressable>
              <Pressable
                testID="home-layout-toggle-btn"
                accessibilityRole="button"
                accessibilityLabel={isGrid ? 'Switch to list layout' : 'Switch to grid layout'}
                style={[styles.iconBox, { backgroundColor: 'transparent' }]}
                onPress={() => setTasksLayout(isGrid ? 'list' : 'grid')}
              >
                {isGrid ? (
                  <ListIcon size={18} color={theme.accent} />
                ) : (
                  <LayoutGrid size={18} color={theme.accent} />
                )}
              </Pressable>
              <Pressable
                style={[styles.iconBox, { backgroundColor: 'transparent' }]}
                onPress={() => router.push('/settings')}
                accessibilityLabel="Settings"
              >
                <Settings size={18} color={theme.accent} />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.greetingText, { color: theme.primaryText }]}>Today</Text>
          {greetingSubline ? (
            <Text style={[styles.greetingSubline, { color: theme.secondaryText }]}>
              {greetingSubline}
            </Text>
          ) : null}
        </Animated.View>

        <AnnouncementBanner />

        {/* Sync Status Indicator */}
        {(lastSyncedAt || syncPartial) && (
          <Animated.View entering={FadeIn.delay(100).duration(200)} style={{ marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                color: syncPartial ? '#F59E0B' : theme.secondaryText,
                fontFamily: 'Inter_600SemiBold',
              }}
            >
              {syncPartial
                ? lastSyncedAt
                  ? `Partially synced (last full sync: ${new Date(lastSyncedAt).toLocaleTimeString()})`
                  : 'Partially synced (pending uploads)'
                : lastSyncedAt
                ? `Synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                : 'Local changes saved'}
            </Text>
          </Animated.View>
        )}

        {/* Start Focus Quick Panel */}
        <View
          style={[
            styles.focusQuickPanel,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Clock size={16} color={theme.accent} />
              <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: theme.primaryText }}>
                Focus Session
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.secondaryText, fontFamily: 'Inter_500Medium' }}>
              25m Pomodoro interval
            </Text>
          </View>
          <TouchableOpacity
            testID="home-start-focus-btn"
            accessibilityRole="button"
            accessibilityLabel="Start Focus Session"
            onPress={() => router.push('/focus')}
            style={[styles.focusStartBtn, { backgroundColor: theme.accent }]}
          >
            <Play size={14} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.focusStartBtnText}>Start</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Tasks for Today</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.secondaryText }]}>
                {completedTodayTasks.length} of {activeTodayTasks.length} completed
              </Text>
            </View>
            <TouchableOpacity
              testID="home-add-task-btn"
              accessibilityRole="button"
              accessibilityLabel="Add task"
              onPress={() => router.push('/tasks' as any)}
              style={[styles.smallActionBtn, { backgroundColor: theme.accentLight }]}
            >
              <Plus size={14} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.smallActionBtnText, { color: theme.accent }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {activeTodayTasks.length > 0 ? (
            <View
              style={[
                styles.taskListBox,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              {activeTodayTasks.slice(0, 4).map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => toggleTask(task.id, task.completed)}
                  style={styles.taskItemRow}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: task.completed }}
                >
                  <View style={{ marginRight: 10 }}>
                    {task.completed ? (
                      <CheckCircle2 size={18} color={theme.success} />
                    ) : (
                      <Circle size={18} color={theme.tertiaryText} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.taskItemText,
                      { color: theme.primaryText },
                      task.completed && {
                        textDecorationLine: 'line-through',
                        color: theme.secondaryText,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  {task.priority && task.priority !== 'medium' && (
                    <View
                      style={[
                        styles.priorityDot,
                        {
                          backgroundColor:
                            task.priority === 'high' ? theme.danger : theme.success,
                        },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyTaskBox,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={{ fontSize: 13, color: theme.secondaryText, marginBottom: 8 }}>
                No tasks scheduled for today yet.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/tasks' as any)}
                style={[styles.planTaskBtn, { borderColor: theme.accent }]}
              >
                <Text style={[styles.planTaskBtnText, { color: theme.accent }]}>
                  + Plan your first task
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Next Milestone Row */}
        {nextReward && (
          <TouchableOpacity
            testID="home-next-milestone-card"
            accessibilityRole="button"
            onPress={() => router.push('/rewards')}
            style={[
              styles.milestoneRow,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View
              style={[styles.milestoneIconWrap, { backgroundColor: theme.accentLight }]}
            >
              <Award size={18} color={theme.accent} />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={{ fontSize: 13, fontFamily: 'Inter_700Bold', color: theme.primaryText }}
              >
                Next Reward: {nextReward.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: 'Inter_500Medium',
                  color: theme.secondaryText,
                  marginTop: 1,
                }}
              >
                {nextReward.requirementLabel}
              </Text>
            </View>
            <ChevronRight size={16} color={theme.tertiaryText} />
          </TouchableOpacity>
        )}

        {/* Tool Shortcuts Grid / List (preserves test verification IDs) */}
        <Animated.View
          entering={FadeIn.delay(200).duration(300)}
          style={[
            styles.cardsWrapper,
            !isGrid && !isDesktop
              ? {
                  flexDirection: 'column',
                  flexWrap: 'nowrap',
                  width: '100%',
                  alignSelf: 'stretch',
                  alignItems: 'stretch',
                }
              : {
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignSelf: 'stretch',
                },
          ]}
        >
          {isLoading ? (
            <>
              <AnimatedCard
                style={[
                  styles.cardContainer,
                  {
                    width: isGrid || isDesktop ? (isDesktop ? '31%' : '48%') : '100%',
                    marginBottom: 14,
                    padding: 14,
                    minHeight: isGrid || isDesktop ? 120 : 70,
                  },
                ]}
              >
                <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 10 }} />
                <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="30%" height={10} />
              </AnimatedCard>
              <AnimatedCard
                style={[
                  styles.cardContainer,
                  {
                    width: isGrid || isDesktop ? (isDesktop ? '31%' : '48%') : '100%',
                    marginBottom: 14,
                    padding: 14,
                    minHeight: isGrid || isDesktop ? 120 : 70,
                  },
                ]}
              >
                <Skeleton width={36} height={36} borderRadius={10} style={{ marginBottom: 10 }} />
                <Skeleton width="60%" height={14} style={{ marginBottom: 4 }} />
                <Skeleton width="30%" height={10} />
              </AnimatedCard>
            </>
          ) : (
            <>
              {renderCard(
                'tasks',
                'Tasks',
                totalTasksCount,
                Calendar,
                theme.accent,
                { pathname: '/tasks', params: { date: undefined } } as any
              )}
              {renderCard('habits', 'Habits', totalStreak, Shield, theme.accent, '/habits')}
              {renderCard('focus', 'Focus', focusSessions.length, Clock, theme.accent, '/focus')}
              {renderCard('notes', 'Notes', notes.length, FileText, theme.accent, '/notes')}
              {renderCard('recap', 'Daily Recap', `${completionPercentage}%`, Award, theme.accent, '/recap')}
            </>
          )}
        </Animated.View>

        {/* Daily Quote Banner positioned quietly below core tools */}
        <View style={{ marginTop: 8 }}>
          <DailyQuoteBanner />
        </View>

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text
            style={{
              fontSize: 11,
              color: theme.tertiaryText,
              fontFamily: 'Inter_500Medium',
            }}
          >
            groundwork · v{Constants.expoConfig?.version || '1.3.0'}
          </Text>
        </View>

        <NotificationSheet
          visible={notificationsVisible}
          onClose={() => {
            setNotificationsVisible(false);
            setHasUnread(false);
          }}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  dateText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  greetingText: {
    fontSize: 28,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  greetingSubline: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
    lineHeight: 18,
  },
  cardsWrapper: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  cardContainer: {},
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  focusQuickPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  focusStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  focusStartBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallActionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  taskListBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.12)',
  },
  taskItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  emptyTaskBox: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  planTaskBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  planTaskBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  milestoneIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});
