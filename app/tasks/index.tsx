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

type TabView = 'Today' | 'Upcoming' | 'All';

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

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
            paddingHorizontal: isDesktop ? 32 : 20,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 80,
            maxWidth: isDesktop ? 640 : undefined,
            alignSelf: isDesktop ? 'center' : undefined,
            width: '100%',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
  });
