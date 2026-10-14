import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronRight, ChevronUp, CornerDownLeft, Plus, Timer } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getLocalDateString, getTomorrowDateString, formatHeaderDate } from '@/lib/dateUtils';

import { useResponsive } from '@/hooks/useResponsive';

type TabView = 'Today' | 'Upcoming' | 'All';

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isDesktop, contentMaxWidth, horizontalPadding } = useResponsive();

  const { tasks, loadAllTasks, addTask, toggleTask } = useStore();

  const { create } = useLocalSearchParams<{ create?: string }>();
  const [activeTab, setActiveTab] = useState<TabView>('Today');
  const [quickTitle, setQuickTitle] = useState('');
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quickInputRef = useRef<TextInput>(null);

  // Focus quick-add input if navigated with create=true
  useEffect(() => {
    if (create === 'true') {
      const timer = setTimeout(() => {
        quickInputRef.current?.focus();
      }, 200);
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

  if (activeTab === 'Today') {
    currentPendingTasks = currentPendingTasks.filter((t) => t.date === todayStr || !t.date);
    currentCompletedTasks = currentCompletedTasks.filter((t) => t.date === todayStr || !t.date);
  } else if (activeTab === 'Upcoming') {
    currentPendingTasks = currentPendingTasks.filter((t) => t.date && t.date > todayStr);
    currentCompletedTasks = currentCompletedTasks.filter((t) => t.date && t.date > todayStr);
  }

  const handleQuickAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      quickInputRef.current?.focus();
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    hapticSuccess();
    setQuickTitle('');
    // For Upcoming tab, default to tomorrow's date so task immediately satisfies t.date > todayStr
    const taskDate = activeTab === 'Today'
      ? todayStr
      : activeTab === 'Upcoming'
      ? getTomorrowDateString()
      : todayStr;

    try {
      await addTask({
        title: trimmed,
        date: taskDate,
        completed: false,
        priority: 'medium',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSectionTitle = () => {
    if (activeTab === 'Today') return 'Your day';
    if (activeTab === 'Upcoming') return 'Upcoming';
    return 'All tasks';
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showBack showMoreMenu onRightPress={() => router.push('/settings' as any)} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 80,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            /* ── Desktop 2-Column Task Workspace Composition ─────────────── */
            <View style={styles.desktopColumnsRow}>
              {/* Left Column: Primary Task Workspace */}
              <View style={styles.desktopMainCol}>
                {/* Date Stamp */}
                <Text style={styles.dateLabel}>{todayFormatted}</Text>

                {/* Heading */}
                <Text style={styles.pageHeading}>Tasks.</Text>
                <Text style={styles.pageSubline}>One thing at a time.</Text>

                {/* Tabs: Today / Upcoming / All */}
                <View style={styles.tabsRow}>
                  {(['Today', 'Upcoming', 'All'] as TabView[]).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        onPress={() => {
                          hapticLight();
                          setActiveTab(tab);
                        }}
                        style={styles.tabItem}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                      >
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                          {tab}
                        </Text>
                        {isActive && <View style={styles.tabUnderline} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.tabsBottomLine} />

                {/* Quick Add Input */}
                <View style={[styles.quickAddRow, { marginBottom: 20 }]}>
                  <Plus size={18} color="#0066FF" strokeWidth={2.4} style={styles.plusIcon} />
                  <TextInput
                    ref={quickInputRef}
                    value={quickTitle}
                    onChangeText={setQuickTitle}
                    onSubmitEditing={handleQuickAdd}
                    placeholder="What needs to get done?"
                    placeholderTextColor="#0066FF"
                    style={styles.quickAddInput}
                    returnKeyType="done"
                    editable={!isSubmitting}
                  />
                  {quickTitle.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={handleQuickAdd}
                      style={styles.returnBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Submit task"
                    >
                      <CornerDownLeft size={16} color="#0066FF" strokeWidth={2.4} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Section: 01 Your day */}
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleGroup}>
                    <Text style={styles.sectionIndex}>01</Text>
                    <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      quickInputRef.current?.focus();
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Add task"
                  >
                    <Text style={styles.blueActionText}>+ Add task</Text>
                  </TouchableOpacity>
                </View>

                {/* Zero tasks planned empty state */}
                {currentPendingTasks.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.zeroNumeralRow}>
                      <Text style={styles.hugeZeroNumeral}>0</Text>
                      <Text style={styles.numeralUnitText}>tasks planned</Text>
                    </View>
                    <Text style={styles.emptyPrimaryPrompt}>A clear page.</Text>
                    <Text style={styles.emptySecondaryPrompt}>Start with what matters today.</Text>
                  </View>
                ) : (
                  /* Populated task rows */
                  <View style={styles.tasksListWrap}>
                    {currentPendingTasks.map((task, idx) => {
                      const isLast = idx === currentPendingTasks.length - 1;
                      return (
                        <View
                          key={task.id}
                          style={[styles.taskItemRow, !isLast && styles.taskItemRowBorder]}
                        >
                          <TouchableOpacity
                            onPress={() => {
                              hapticSuccess();
                              toggleTask(task.id, task.completed);
                            }}
                            style={styles.taskCheckbox}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: false }}
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
                            style={styles.taskTitleWrap}
                          >
                            <Text style={styles.taskTitleText} numberOfLines={2}>
                              {task.title || 'Untitled task'}
                            </Text>
                            <View style={styles.taskMetaRow}>
                              {task.due_time ? (
                                <Text style={styles.taskMetaText}>
                                  {task.date === todayStr ? 'Today' : task.date || 'Today'} · {task.due_time}
                                </Text>
                              ) : null}
                              {task.priority && task.priority !== 'medium' && (
                                <Text
                                  style={[
                                    styles.priorityBadgeText,
                                    { color: task.priority === 'high' ? '#EF4444' : '#8E8C87' },
                                  ]}
                                >
                                  {task.priority.toUpperCase()}
                                </Text>
                              )}
                            </View>
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
                  </View>
                )}

                <View style={styles.thinDivider} />

                {/* Completed collapsible section */}
                <TouchableOpacity
                  onPress={() => setCompletedExpanded(!completedExpanded)}
                  style={styles.completedHeaderRow}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={styles.completedHeaderText}>
                    {currentCompletedTasks.length} Completed
                  </Text>
                  {completedExpanded ? (
                    <ChevronUp size={18} color="#8E8C87" />
                  ) : (
                    <ChevronDown size={18} color="#8E8C87" />
                  )}
                </TouchableOpacity>

                {completedExpanded && currentCompletedTasks.length > 0 && (
                  <View style={styles.completedListWrap}>
                    {currentCompletedTasks.map((task) => (
                      <View key={task.id} style={styles.completedItemRow}>
                        <TouchableOpacity
                          onPress={() => {
                            hapticSuccess();
                            toggleTask(task.id, task.completed);
                          }}
                          style={[styles.taskCheckbox, styles.taskCheckboxCompleted]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Check size={13} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                        <Text style={styles.completedTitleText} numberOfLines={1}>
                          {task.title || 'Untitled task'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Right Column: Supporting Overview, Priorities, and Focus Launcher */}
              <View style={styles.desktopSideCol}>
                {/* 1. Tasks Summary Card */}
                <View style={styles.desktopCard}>
                  <Text style={styles.desktopCardTitle}>Overview</Text>
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
                      <Text style={styles.summaryStatNumber}>
                        {Math.round(
                          (currentCompletedTasks.length /
                            Math.max(1, currentPendingTasks.length + currentCompletedTasks.length)) *
                            100
                        )}
                        %
                      </Text>
                      <Text style={styles.summaryStatLabel}>Done</Text>
                    </View>
                  </View>
                  <View style={[styles.progressTrack, { marginTop: 14 }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.round(
                            (currentCompletedTasks.length /
                              Math.max(1, currentPendingTasks.length + currentCompletedTasks.length)) *
                              100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* 2. Priority Legend Card */}
                <View style={styles.desktopCard}>
                  <Text style={styles.desktopCardTitle}>Priority guide</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Timer size={18} color="#0066FF" strokeWidth={2.2} />
                      <Text style={styles.desktopCardTitle}>Focus mode</Text>
                    </View>
                    <ChevronRight size={16} color="#0066FF" />
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
            /* ── Mobile / Tablet Sequential Task List ────────────────────── */
            <View>
              {/* Date Stamp */}
              <Text style={styles.dateLabel}>{todayFormatted}</Text>

              {/* Heading */}
              <Text style={styles.pageHeading}>Tasks.</Text>
              <Text style={styles.pageSubline}>One thing at a time.</Text>

              {/* Tabs: Today / Upcoming / All */}
              <View style={styles.tabsRow}>
                {(['Today', 'Upcoming', 'All'] as TabView[]).map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => {
                        hapticLight();
                        setActiveTab(tab);
                      }}
                      style={styles.tabItem}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isActive }}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                        {tab}
                      </Text>
                      {isActive && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.tabsBottomLine} />

              {/* Section: 01 Your day */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionIndex}>01</Text>
                  <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    quickInputRef.current?.focus();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Add task"
                >
                  <Text style={styles.blueActionText}>+ Add task</Text>
                </TouchableOpacity>
              </View>

              {/* Zero tasks planned empty state */}
              {currentPendingTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.zeroNumeralRow}>
                    <Text style={styles.hugeZeroNumeral}>0</Text>
                    <Text style={styles.numeralUnitText}>tasks planned</Text>
                  </View>
                  <Text style={styles.emptyPrimaryPrompt}>A clear page.</Text>
                  <Text style={styles.emptySecondaryPrompt}>Start with what matters today.</Text>
                </View>
              ) : (
                /* Populated task rows */
                <View style={styles.tasksListWrap}>
                  {currentPendingTasks.map((task, idx) => {
                    const isLast = idx === currentPendingTasks.length - 1;
                    return (
                      <View
                        key={task.id}
                        style={[styles.taskItemRow, !isLast && styles.taskItemRowBorder]}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            hapticSuccess();
                            toggleTask(task.id, task.completed);
                          }}
                          style={styles.taskCheckbox}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: false }}
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
                          style={styles.taskTitleWrap}
                        >
                          <Text style={styles.taskTitleText} numberOfLines={2}>
                            {task.title || 'Untitled task'}
                          </Text>
                          <View style={styles.taskMetaRow}>
                            {task.due_time ? (
                              <Text style={styles.taskMetaText}>
                                {task.date === todayStr ? 'Today' : task.date || 'Today'} · {task.due_time}
                              </Text>
                            ) : null}
                            {task.priority && task.priority !== 'medium' && (
                              <Text
                                style={[
                                  styles.priorityBadgeText,
                                  { color: task.priority === 'high' ? '#EF4444' : '#8E8C87' },
                                ]}
                              >
                                {task.priority.toUpperCase()}
                              </Text>
                            )}
                          </View>
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
                </View>
              )}

              <View style={styles.thinDivider} />

              {/* Quick Add Input matching mockup: + What needs to get done? ↵ */}
              <View style={styles.quickAddRow}>
                <Plus size={18} color="#0066FF" strokeWidth={2.4} style={styles.plusIcon} />
                <TextInput
                  ref={quickInputRef}
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  onSubmitEditing={handleQuickAdd}
                  placeholder="What needs to get done?"
                  placeholderTextColor="#0066FF"
                  style={styles.quickAddInput}
                  returnKeyType="done"
                  editable={!isSubmitting}
                />
                {quickTitle.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={handleQuickAdd}
                    style={styles.returnBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Submit task"
                  >
                    <CornerDownLeft size={16} color="#0066FF" strokeWidth={2.4} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.thinDivider} />

              {/* Completed collapsible section matching mockup: 0 Completed v */}
              <TouchableOpacity
                onPress={() => setCompletedExpanded(!completedExpanded)}
                style={styles.completedHeaderRow}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={styles.completedHeaderText}>
                  {currentCompletedTasks.length} Completed
                </Text>
                {completedExpanded ? (
                  <ChevronUp size={18} color="#8E8C87" />
                ) : (
                  <ChevronDown size={18} color="#8E8C87" />
                )}
              </TouchableOpacity>

              {completedExpanded && currentCompletedTasks.length > 0 && (
                <View style={styles.completedListWrap}>
                  {currentCompletedTasks.map((task) => (
                    <View key={task.id} style={styles.completedItemRow}>
                      <TouchableOpacity
                        onPress={() => {
                          hapticSuccess();
                          toggleTask(task.id, task.completed);
                        }}
                        style={[styles.taskCheckbox, styles.taskCheckboxCompleted]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      </TouchableOpacity>
                      <Text style={styles.completedTitleText} numberOfLines={1}>
                        {task.title || 'Untitled task'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.thinDivider} />

              {/* Action linking to Focus: Make time for a task -> */}
              <TouchableOpacity
                onPress={() => router.push('/focus' as any)}
                style={styles.makeTimeRow}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <View style={styles.makeTimeLeft}>
                  <Timer size={19} color="#0066FF" strokeWidth={2} />
                  <Text style={styles.makeTimeText}>Make time for a task</Text>
                </View>
                <ChevronRight size={18} color="#0066FF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
      fontSize: 44,
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
    },

    // Tabs
    tabsRow: {
      flexDirection: 'row',
      gap: 28,
    },
    tabItem: {
      paddingBottom: 10,
      position: 'relative',
    },
    tabText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.secondaryText,
    },
    tabTextActive: {
      color: theme.accent,
      fontFamily: 'Inter_700Bold',
    },
    tabUnderline: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2.5,
      backgroundColor: theme.accent,
    },
    tabsBottomLine: {
      height: 1,
      backgroundColor: theme.separator,
      marginBottom: 24,
    },

    // Section 01
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

    // Empty state
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
      fontSize: 58,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.primaryText,
      lineHeight: 62,
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
      marginBottom: 16,
    },

    // Populated task list
    tasksListWrap: {
      width: '100%',
    },
    taskItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 13,
    },
    taskItemRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
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
    taskTitleWrap: {
      flex: 1,
      marginLeft: 14,
    },
    taskTitleText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.primaryText,
    },
    taskMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    taskMetaText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.secondaryText,
    },
    priorityBadgeText: {
      fontSize: 10,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 0.5,
    },

    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 18,
    },

    // Quick add input: + What needs to get done? ↵
    quickAddRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    plusIcon: {
      marginRight: 10,
    },
    quickAddInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.accent,
      padding: 0,
    },
    returnBtn: {
      padding: 4,
    },

    // Completed Section: 0 Completed v
    completedHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    completedHeaderText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
    },
    completedListWrap: {
      paddingTop: 8,
      gap: 10,
    },
    completedItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    completedTitleText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.secondaryText,
      textDecorationLine: 'line-through',
      marginLeft: 12,
      flex: 1,
    },

    // Make time for a task ->
    makeTimeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    makeTimeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    makeTimeText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Desktop layout styles
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
      borderColor: theme.separator,
      borderRadius: 14,
      padding: 18,
      backgroundColor: isDark ? '#080808' : '#FFFFFF',
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
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
    },
    summaryStatNumber: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: theme.primaryText,
      marginBottom: 2,
    },
    summaryStatLabel: {
      fontSize: 11,
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
      borderRadius: 6,
    },
    focusActionPillText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },
  });
