import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Timer,
  CheckCircle2,
  Sparkles,
  ListTodo,
  Calendar,
} from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getLocalDateString, formatHeaderDate } from '@/lib/dateUtils';
import { TaskComposer, TaskComposerModal } from '@/components/tasks/TaskComposer';
import { TaskRow } from '@/components/tasks/TaskRow';
import { useResponsive } from '@/hooks/useResponsive';

type TabView = 'Today' | 'Upcoming' | 'All';

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isDesktop, contentMaxWidth, horizontalPadding } = useResponsive();

  const { tasks, loadAllTasks, toggleTask } = useStore();

  const { create } = useLocalSearchParams<{ create?: string }>();
  const [activeTab, setActiveTab] = useState<TabView>('Today');
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [isComposerModalOpen, setIsComposerModalOpen] = useState(false);

  // Open composer modal if navigated with create=true
  useEffect(() => {
    if (create === 'true') {
      const timer = setTimeout(() => {
        setIsComposerModalOpen(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [create]);

  // Sync tasks on focus
  useFocusEffect(
    useCallback(() => {
      loadAllTasks();
    }, [loadAllTasks])
  );

  const todayStr = getLocalDateString();
  const todayFormatted = formatHeaderDate();

  // Filter tasks honestly
  const activeAllTasks = (tasks || []).filter((t) => !t.deleted_at);

  let currentPendingTasks = activeAllTasks.filter((t) => !t.completed);
  let currentCompletedTasks = activeAllTasks.filter((t) => t.completed);

  // Counts for tabs
  const todayPendingCount = activeAllTasks.filter(
    (t) => !t.completed && (t.date === todayStr || !t.date)
  ).length;
  const upcomingPendingCount = activeAllTasks.filter(
    (t) => !t.completed && t.date && t.date > todayStr
  ).length;
  const allPendingCount = activeAllTasks.filter((t) => !t.completed).length;

  if (activeTab === 'Today') {
    currentPendingTasks = currentPendingTasks.filter((t) => t.date === todayStr || !t.date);
    currentCompletedTasks = currentCompletedTasks.filter((t) => t.date === todayStr || !t.date);
  } else if (activeTab === 'Upcoming') {
    currentPendingTasks = currentPendingTasks.filter((t) => t.date && t.date > todayStr);
    currentCompletedTasks = currentCompletedTasks.filter((t) => t.date && t.date > todayStr);
  }

  const totalTabTasks = currentPendingTasks.length + currentCompletedTasks.length;
  const completionPercentage = totalTabTasks > 0
    ? Math.round((currentCompletedTasks.length / totalTabTasks) * 100)
    : 0;

  const getSectionTitle = () => {
    if (activeTab === 'Today') return 'Your day';
    if (activeTab === 'Upcoming') return 'Upcoming tasks';
    return 'All tasks';
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const renderTaskListContent = () => (
    <>
      {/* ── 1. Hero Date & Heading ──────────────────────── */}
      <View style={styles.headerSection}>
        <Text style={styles.dateLabel}>{todayFormatted.toUpperCase()}</Text>
        <View style={styles.headingRow}>
          <Text style={styles.pageHeading}>Tasks</Text>
          {totalTabTasks > 0 && (
            <View style={styles.completionPill}>
              <Text style={styles.completionPillText}>
                {currentCompletedTasks.length}/{totalTabTasks} done · {completionPercentage}%
              </Text>
            </View>
          )}
        </View>

        {/* Momentum Progress Track */}
        {totalTabTasks > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%`, backgroundColor: theme.accent },
              ]}
            />
          </View>
        )}
      </View>

      {/* ── 2. Tactile Segmented Control Tabs (Apple Style) ──────── */}
      <View style={styles.segmentedControl}>
        {(
          [
            { key: 'Today', label: 'Today', count: todayPendingCount },
            { key: 'Upcoming', label: 'Upcoming', count: upcomingPendingCount },
            { key: 'All', label: 'All', count: allPendingCount },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                hapticLight();
                setActiveTab(tab.key);
              }}
              style={[styles.segmentItem, isActive && styles.segmentItemActive]}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.segmentText,
                  isActive && [styles.segmentTextActive, { color: theme.accent }],
                ]}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={[
                    styles.segmentBadge,
                    isActive
                      ? { backgroundColor: theme.accent }
                      : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentBadgeText,
                      isActive ? { color: '#FFFFFF' } : { color: theme.secondaryText },
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 3. Quick Task Composer Card ────────────────────── */}
      <View style={styles.composerWrapper}>
        <TaskComposer
          mode="compact"
          initialContext={activeTab}
          onRequestExpand={() => setIsComposerModalOpen(true)}
        />
      </View>

      {/* ── 4. Section Header ────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleGroup}>
          <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
          <View style={styles.countTag}>
            <Text style={styles.countTagText}>
              {currentPendingTasks.length} {currentPendingTasks.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setIsComposerModalOpen(true)}
          style={styles.addTaskButton}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add new task"
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={2.8} />
          <Text style={styles.addTaskButtonText}>New task</Text>
        </TouchableOpacity>
      </View>

      {/* ── 5. Tasks List / Clean Empty State ─────────────── */}
      {currentPendingTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: isDark ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.08)' },
            ]}
          >
            {activeTab === 'Upcoming' ? (
              <Calendar size={28} color={theme.accent} strokeWidth={2.2} />
            ) : (
              <CheckCircle2 size={28} color={theme.accent} strokeWidth={2.2} />
            )}
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'Today'
              ? 'All clear for today'
              : activeTab === 'Upcoming'
              ? 'No upcoming tasks'
              : 'No tasks found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'Today'
              ? "You've finished everything on your plate. Take a breather or plan ahead."
              : 'Everything is up to date. Tap below to capture your next goal.'}
          </Text>
          <TouchableOpacity
            onPress={() => setIsComposerModalOpen(true)}
            style={[styles.emptyActionBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.emptyActionBtnText}>Add a Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tasksGroupCard}>
          {currentPendingTasks.map((task, idx) => {
            const isLast = idx === currentPendingTasks.length - 1;
            return (
              <TaskRow
                key={task.id}
                task={task}
                isLast={isLast}
                todayStr={todayStr}
                theme={theme}
                isDark={isDark}
                onToggle={() => toggleTask(task.id, task.completed)}
                onPress={() =>
                  router.push({
                    pathname: '/tasks/task-detail',
                    params: { id: task.id },
                  } as any)
                }
              />
            );
          })}
        </View>
      )}

      {/* ── 6. Completed Collapsible Inset Card ───────────── */}
      {currentCompletedTasks.length > 0 && (
        <View style={styles.completedSection}>
          <TouchableOpacity
            onPress={() => setCompletedExpanded(!completedExpanded)}
            style={styles.completedHeaderCard}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <View style={styles.completedHeaderLeft}>
              <View
                style={[
                  styles.completedCheckCircle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                ]}
              >
                <Check size={12} color={theme.secondaryText} strokeWidth={2.8} />
              </View>
              <Text style={styles.completedHeaderText}>
                Completed ({currentCompletedTasks.length})
              </Text>
            </View>
            {completedExpanded ? (
              <ChevronUp size={18} color={theme.secondaryText} />
            ) : (
              <ChevronDown size={18} color={theme.secondaryText} />
            )}
          </TouchableOpacity>

          {completedExpanded && (
            <View style={styles.completedGroupCard}>
              {currentCompletedTasks.map((task, idx) => {
                const isLast = idx === currentCompletedTasks.length - 1;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isLast={isLast}
                    todayStr={todayStr}
                    theme={theme}
                    isDark={isDark}
                    onToggle={() => toggleTask(task.id, task.completed)}
                    onPress={() =>
                      router.push({
                        pathname: '/tasks/task-detail',
                        params: { id: task.id },
                      } as any)
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── 7. Focus Mode Action Card ──────────────────────── */}
      <TouchableOpacity
        onPress={() => router.push('/focus' as any)}
        style={styles.focusModeCard}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <View style={styles.focusCardLeft}>
          <View
            style={[
              styles.focusIconBox,
              { backgroundColor: isDark ? 'rgba(0, 102, 255, 0.16)' : 'rgba(0, 102, 255, 0.1)' },
            ]}
          >
            <Timer size={20} color={theme.accent} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusCardTitle}>Deep Focus Mode</Text>
            <Text style={styles.focusCardSubtitle}>
              Dedicate a distraction-free block to knock out your top tasks.
            </Text>
          </View>
        </View>
        <ChevronRight size={18} color={theme.accent} strokeWidth={2.2} />
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.root}>
      <BrandHeader showBack showMoreMenu onRightPress={() => router.push('/settings' as any)} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 80,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            /* ── Desktop 2-Column Responsive Workspace ───────────────── */
            <View style={styles.desktopColumnsRow}>
              {/* Left Primary Column */}
              <View style={styles.desktopMainCol}>{renderTaskListContent()}</View>

              {/* Right Supporting Sidebar */}
              <View style={styles.desktopSideCol}>
                {/* 1. Tasks Summary Card */}
                <View style={styles.desktopCard}>
                  <Text style={styles.desktopCardTitle}>Day at a Glance</Text>
                  <View style={styles.summaryStatsGrid}>
                    <View style={styles.summaryStatBox}>
                      <Text style={styles.summaryStatNumber}>{currentPendingTasks.length}</Text>
                      <Text style={styles.summaryStatLabel}>Pending</Text>
                    </View>
                    <View style={styles.summaryStatBox}>
                      <Text style={styles.summaryStatNumber}>{currentCompletedTasks.length}</Text>
                      <Text style={styles.summaryStatLabel}>Completed</Text>
                    </View>
                    <View style={styles.summaryStatBox}>
                      <Text style={styles.summaryStatNumber}>{completionPercentage}%</Text>
                      <Text style={styles.summaryStatLabel}>Done</Text>
                    </View>
                  </View>
                  <View style={[styles.progressTrack, { marginTop: 14 }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${completionPercentage}%`, backgroundColor: theme.accent },
                      ]}
                    />
                  </View>
                </View>

                {/* 2. Priority Guide Card */}
                <View style={styles.desktopCard}>
                  <Text style={styles.desktopCardTitle}>Priority Breakdown</Text>
                  <View style={{ gap: 10, marginTop: 12 }}>
                    <View style={styles.priorityGuideRow}>
                      <View style={[styles.priorityDot, { backgroundColor: '#EF4444' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.priorityGuideTitle}>High priority</Text>
                        <Text style={styles.priorityGuideSub}>Critical & time-sensitive items</Text>
                      </View>
                      <Text style={styles.priorityGuideCount}>
                        {activeAllTasks.filter((t) => !t.completed && t.priority === 'high').length}
                      </Text>
                    </View>
                    <View style={styles.priorityGuideRow}>
                      <View style={[styles.priorityDot, { backgroundColor: '#F59E0B' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.priorityGuideTitle}>Medium priority</Text>
                        <Text style={styles.priorityGuideSub}>Standard daily tasks</Text>
                      </View>
                      <Text style={styles.priorityGuideCount}>
                        {activeAllTasks.filter((t) => !t.completed && (t.priority === 'medium' || !t.priority)).length}
                      </Text>
                    </View>
                    <View style={styles.priorityGuideRow}>
                      <View style={[styles.priorityDot, { backgroundColor: '#8E8C87' }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.priorityGuideTitle}>Low priority</Text>
                        <Text style={styles.priorityGuideSub}>Flexible when time allows</Text>
                      </View>
                      <Text style={styles.priorityGuideCount}>
                        {activeAllTasks.filter((t) => !t.completed && t.priority === 'low').length}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. Focus Session Launcher Card */}
                <TouchableOpacity
                  onPress={() => router.push('/focus' as any)}
                  style={styles.desktopCard}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Timer size={18} color={theme.accent} strokeWidth={2.2} />
                      <Text style={styles.desktopCardTitle}>Focus mode</Text>
                    </View>
                    <ChevronRight size={16} color={theme.accent} />
                  </View>
                  <Text style={styles.focusCardDesc}>
                    Dedicate a distraction-free timer block to power through your top task.
                  </Text>
                  <View style={styles.focusActionPill}>
                    <Text style={styles.focusActionPillText}>Open focus timer →</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Mobile / Tablet Layout ─────────────────────────────── */
            <View>{renderTaskListContent()}</View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <TaskComposerModal
        visible={isComposerModalOpen}
        initialContext={activeTab}
        onClose={() => setIsComposerModalOpen(false)}
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
    // Header & Momentum
    headerSection: {
      marginBottom: 20,
    },
    dateLabel: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1.5,
      color: theme.secondaryText,
      marginBottom: 4,
    },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    pageHeading: {
      fontSize: 32,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -0.8,
      color: theme.primaryText,
    },
    completionPill: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.separator,
    },
    completionPillText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.secondaryText,
    },
    progressTrack: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      borderRadius: 2,
      overflow: 'hidden',
      width: '100%',
      marginTop: 2,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },

    // Segmented Control (Apple iOS Style)
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: 14,
      padding: 3,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
    },
    segmentItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 11,
      gap: 6,
    },
    segmentItemActive: {
      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.secondaryText,
    },
    segmentTextActive: {
      fontFamily: 'Inter_700Bold',
    },
    segmentBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 10,
      minWidth: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBadgeText: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
    },

    // Composer
    composerWrapper: {
      marginBottom: 22,
    },

    // Section Header
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      letterSpacing: -0.4,
      color: theme.primaryText,
    },
    countTag: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    countTagText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.secondaryText,
    },
    addTaskButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      gap: 4,
    },
    addTaskButtonText: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },

    // Tasks Group Card (Inset Grouped)
    tasksGroupCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      overflow: 'hidden',
      marginBottom: 24,
    },

    // Empty Card
    emptyCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
      marginBottom: 20,
    },
    emptyActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
    },
    emptyActionBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
    },

    // Completed Collapsible Card
    completedSection: {
      marginBottom: 24,
    },
    completedHeaderCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      marginBottom: 8,
    },
    completedHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    completedCheckCircle: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completedHeaderText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.secondaryText,
    },
    completedGroupCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      overflow: 'hidden',
    },

    // Focus Mode Action Card
    focusModeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      padding: 16,
      marginBottom: 16,
    },
    focusCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flex: 1,
      paddingRight: 10,
    },
    focusIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    focusCardTitle: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    focusCardSubtitle: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 17,
    },

    // Desktop 2-Column Mode
    desktopColumnsRow: {
      flexDirection: 'row',
      gap: 36,
      width: '100%',
      alignItems: 'flex-start',
    },
    desktopMainCol: {
      flex: 1.45,
      minWidth: 0,
    },
    desktopSideCol: {
      flex: 0.95,
      minWidth: 320,
      gap: 16,
    },
    desktopCard: {
      borderWidth: 1,
      borderColor: theme.cardBorder,
      borderRadius: 18,
      padding: 20,
      backgroundColor: theme.card,
    },
    desktopCardTitle: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      letterSpacing: -0.3,
    },
    summaryStatsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
      gap: 8,
    },
    summaryStatBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    summaryStatNumber: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    summaryStatLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    priorityGuideRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    priorityGuideTitle: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: theme.primaryText,
    },
    priorityGuideSub: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      marginTop: 1,
    },
    priorityGuideCount: {
      fontSize: 13,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
    },
    focusCardDesc: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
      lineHeight: 18,
      marginBottom: 12,
    },
    focusActionPill: {
      alignSelf: 'flex-start',
      backgroundColor: isDark ? 'rgba(0, 102, 255, 0.15)' : 'rgba(0, 102, 255, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    focusActionPillText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
  });
