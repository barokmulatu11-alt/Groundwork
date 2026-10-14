import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Check,
  Plus,
  Trash2,
  X,
  ChevronRight,
  BookOpen,
  Droplets,
  Activity,
  Moon,
  PenTool,
  Sparkles,
  Flame,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { habitCompletedOnDate, parseHabitDates } from '@/lib/habitUtils';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { getLocalDateString, formatHeaderDate } from '@/lib/dateUtils';
import { useReducedMotion } from '@/lib/animationUtils';
import type { Habit } from '@/lib/db';

function getHabitIcon(title: string) {
  const lower = (title || '').toLowerCase();
  if (lower.includes('read') || lower.includes('study') || lower.includes('book')) return BookOpen;
  if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrat')) return Droplets;
  if (lower.includes('run') || lower.includes('walk') || lower.includes('gym') || lower.includes('workout') || lower.includes('exercise')) return Activity;
  if (lower.includes('sleep') || lower.includes('bed') || lower.includes('rest')) return Moon;
  if (lower.includes('journal') || lower.includes('write')) return PenTool;
  if (lower.includes('meditat') || lower.includes('mind') || lower.includes('calm')) return Sparkles;
  return Flame;
}

function HabitRowItem({
  habit,
  isLast,
  selectedDateStr,
  todayStr,
  weekDays,
  onPressDetail,
  onToggleCheckin,
  theme,
  isDark,
  styles,
}: {
  habit: Habit;
  isLast: boolean;
  selectedDateStr: string;
  todayStr: string;
  weekDays: Array<{ dateStr: string; dayName: string; dayNum: number }>;
  onPressDetail: () => void;
  onToggleCheckin: () => Promise<void>;
  theme: any;
  isDark: boolean;
  styles: any;
}) {
  const isChecked = habitCompletedOnDate(habit, selectedDateStr);
  const IconComponent = getHabitIcon(habit.title);
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCheckin = async () => {
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(1.22, { duration: 90 }),
        withTiming(1, { duration: 110 })
      );
    }
    hapticSuccess();
    await onToggleCheckin();
  };

  return (
    <View style={[styles.habitItemRow, !isLast && styles.habitItemRowBorder]}>
      <View
        style={[
          styles.habitIconBox,
          { backgroundColor: isDark ? 'rgba(0,102,255,0.1)' : 'rgba(0,102,255,0.08)' },
        ]}
      >
        <IconComponent size={16} color={theme.accent} strokeWidth={2} />
      </View>

      <TouchableOpacity onPress={onPressDetail} style={styles.habitTextCol}>
        <Text style={styles.habitTitleText} numberOfLines={1}>
          {habit.title}
        </Text>
        <View style={styles.habitMetaRow}>
          <Text style={styles.habitStreakText}>{habit.streak || 0}d streak</Text>
          <View style={styles.miniWeekStrip}>
            {weekDays.map((d) => {
              const doneOnDay = habitCompletedOnDate(habit, d.dateStr);
              return (
                <View
                  key={d.dateStr}
                  style={[
                    styles.miniDot,
                    doneOnDay && styles.miniDotCompleted,
                    d.dateStr === todayStr && !doneOnDay && styles.miniDotToday,
                  ]}
                />
              );
            })}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleCheckin}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked }}
        accessibilityLabel={`Check in ${habit.title}`}
      >
        <Animated.View
          style={[
            styles.habitCheckCircle,
            isChecked && styles.habitCheckCircleActive,
            animStyle,
          ]}
        >
          {isChecked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

type HabitTab = 'Today' | 'All habits' | 'Paused';

export default function HabitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const { habits, loadHabits, toggleHabit, addHabit, updateHabit, deleteHabit } = useStore();
  const { session, isGuest } = useAuthStore();

  const [activeTab, setActiveTab] = useState<HabitTab>('Today');
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFrequency, setNewFrequency] = useState('Daily');
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<Habit | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  const todayStr = getLocalDateString();
  const todayFormatted = formatHeaderDate();

  // Generate 7 days of the current week (starting from Monday)
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon...
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    const isToday = dayStr === todayStr;
    return {
      dateStr: dayStr,
      dayName,
      dayNum,
      isToday,
    };
  });

  const selectedDayObj = weekDays[selectedDateIndex] || weekDays[0];
  const selectedDateStr = selectedDayObj.dateStr;

  // Filter habits based on active tab
  const allHabits = habits || [];
  let visibleHabits = allHabits;

  if (activeTab === 'Today') {
    visibleHabits = allHabits.filter((h) => !h.is_paused);
  } else if (activeTab === 'Paused') {
    visibleHabits = allHabits.filter((h) => h.is_paused);
  } else {
    // All habits
    visibleHabits = allHabits;
  }

  const handleCreateHabit = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    hapticSuccess();
    await addHabit({
      title: trimmed,
      frequency: newFrequency,
      streak: 0,
      best_streak: 0,
      dates_completed: JSON.stringify([]),
    });
    setNewTitle('');
    setIsAddModalOpen(false);
  };

  const handleToggleCheckin = async (habitId: string) => {
    await toggleHabit(habitId, selectedDateStr);
  };

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showBack showMoreMenu onRightPress={() => router.push('/settings' as any)} />
      </View>

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
      >
        {/* Date Stamp */}
        <Text style={styles.dateLabel}>{todayFormatted}</Text>

        {/* Heading */}
        <Text style={styles.pageHeading}>Habits.</Text>
        <Text style={styles.pageSubline}>Small steps. Repeated.</Text>

        {/* Weekly Date Strip matching mockup */}
        <View style={styles.weekStripRow}>
          {weekDays.map((item, index) => {
            const isSelected = selectedDateIndex === index;
            return (
              <TouchableOpacity
                key={item.dateStr}
                onPress={() => {
                  hapticLight();
                  setSelectedDateIndex(index);
                }}
                style={styles.weekDayCol}
                accessibilityRole="button"
                accessibilityLabel={`${item.dayName} ${item.dayNum}`}
              >
                <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>
                  {item.dayName}
                </Text>
                <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumSelected]}>
                  {item.dayNum}
                </Text>
                {isSelected && <View style={styles.weekDayIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.thinDivider} />

        {/* Tabs: Today / All habits / Paused */}
        <View style={styles.tabsRow}>
          {(['Today', 'All habits', 'Paused'] as HabitTab[]).map((tab) => {
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

        {/* Section 01 Daily rituals */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionIndex}>01</Text>
            <Text style={styles.sectionTitle}>Daily rituals</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsAddModalOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
          >
            <Text style={styles.blueActionText}>+ Add habit</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state matching mockup */}
        {visibleHabits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.zeroNumeralRow}>
              <Text style={styles.hugeZeroNumeral}>0</Text>
              <Text style={styles.numeralUnitText}>habits yet</Text>
            </View>
            <Text style={styles.emptyPrimaryPrompt}>Start with something small.</Text>
            <Text style={styles.emptySecondaryPrompt}>
              Choose one thing you want to repeat.
            </Text>

            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              style={styles.inlineCreateBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.blueActionText}>+ Create your first habit</Text>
            </TouchableOpacity>

            <View style={styles.thinDivider} />

            {/* Section 02 Consistency */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Text style={styles.sectionIndex}>02</Text>
                <Text style={styles.sectionTitle}>Consistency</Text>
              </View>
            </View>
            <Text style={styles.consistencyPrompt}>Your progress will appear here.</Text>
            <Text style={styles.consistencySubline}>
              Check in each day to build your rhythm.
            </Text>
          </View>
        ) : (
          /* Populated Habits List */
          <View style={styles.habitsListWrap}>
            {visibleHabits.map((habit, idx) => (
              <HabitRowItem
                key={habit.id}
                habit={habit}
                isLast={idx === visibleHabits.length - 1}
                selectedDateStr={selectedDateStr}
                todayStr={todayStr}
                weekDays={weekDays}
                onPressDetail={() => setSelectedHabitForDetail(habit)}
                onToggleCheckin={() => handleToggleCheckin(habit.id)}
                theme={theme}
                isDark={isDark}
                styles={styles}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        visible={isAddModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeading}>Create habit</Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalFieldLabel}>HABIT NAME</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g. Read for 15 minutes"
              placeholderTextColor={theme.textMuted}
              style={styles.modalTextInput}
              autoFocus
            />

            <Text style={styles.modalFieldLabel}>FREQUENCY</Text>
            <View style={styles.frequencyRow}>
              {['Daily', 'Weekdays', 'Weekends'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => setNewFrequency(freq)}
                  style={[
                    styles.freqPill,
                    newFrequency === freq && styles.freqPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.freqPillText,
                      newFrequency === freq && styles.freqPillActive ? styles.freqPillTextActive : null,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreateHabit}
              style={styles.modalSaveBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSaveBtnText}>Save habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Habit Detail / Actions Sheet */}
      {selectedHabitForDetail && (
        <Modal
          visible={!!selectedHabitForDetail}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedHabitForDetail(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>{selectedHabitForDetail.title}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedHabitForDetail(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubline}>
                Frequency: {selectedHabitForDetail.frequency || 'Daily'} · Current streak:{' '}
                {selectedHabitForDetail.streak || 0} days
              </Text>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    const nextPaused = !selectedHabitForDetail.is_paused;
                    updateHabit(selectedHabitForDetail.id, { is_paused: nextPaused });
                    setSelectedHabitForDetail(null);
                  }}
                  style={styles.modalSecondaryBtn}
                >
                  <Text style={styles.modalSecondaryBtnText}>
                    {selectedHabitForDetail.is_paused ? 'Resume habit' : 'Pause habit'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    deleteHabit(selectedHabitForDetail.id);
                    setSelectedHabitForDetail(null);
                  }}
                  style={styles.modalDeleteBtn}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={styles.modalDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    dateLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 2,
      color: theme.textSecondary,
      marginBottom: 6,
    },
    pageHeading: {
      fontSize: 44,
      fontFamily: 'Inter_800ExtraBold',
      letterSpacing: -1,
      color: theme.text,
      marginBottom: 4,
    },
    pageSubline: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      marginBottom: 20,
    },

    // Weekly Date Strip
    weekStripRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    weekDayCol: {
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      position: 'relative',
    },
    weekDayName: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      color: theme.textSecondary,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
    weekDayNameSelected: {
      color: theme.accent,
    },
    weekDayNum: {
      fontSize: 20,
      fontFamily: 'PlayfairDisplay_700Bold',
      color: theme.text,
      paddingBottom: 6,
    },
    weekDayNumSelected: {
      color: theme.accent,
    },
    weekDayIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 4,
      right: 4,
      height: 2.5,
      backgroundColor: theme.accent,
      borderRadius: 1,
    },

    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 18,
    },

    // Tabs: Today / All habits / Paused
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
      color: theme.textSecondary,
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

    // Section 01 Daily rituals
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
      color: theme.text,
    },
    blueActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.accent,
    },

    // Empty state matching mockup
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
      color: theme.text,
      lineHeight: 62,
    },
    numeralUnitText: {
      fontSize: 22,
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
      color: theme.text,
    },
    emptyPrimaryPrompt: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.text,
      marginBottom: 2,
    },
    emptySecondaryPrompt: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      marginBottom: 16,
    },
    inlineCreateBtn: {
      paddingVertical: 6,
    },
    consistencyPrompt: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: theme.text,
      marginBottom: 2,
    },
    consistencySubline: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
    },

    // Populated Habits
    habitsListWrap: {
      width: '100%',
    },
    habitItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    habitItemRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    habitIconBox: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    habitTextCol: {
      flex: 1,
      paddingRight: 14,
    },
    habitTitleText: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
    },
    habitMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    habitStreakText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
    },
    miniWeekStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    miniDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
    },
    miniDotCompleted: {
      backgroundColor: theme.accent,
    },
    miniDotToday: {
      borderWidth: 1,
      borderColor: theme.accent,
      backgroundColor: 'transparent',
    },
    habitCheckCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.8,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitCheckCircleActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.separator,
      padding: 24,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    modalHeading: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.text,
    },
    modalSubline: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      marginBottom: 20,
    },
    modalFieldLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    modalTextInput: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
      backgroundColor: isDark ? '#000000' : '#F5F2EB',
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
    },
    frequencyRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
    },
    freqPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    freqPillActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    freqPillText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.textSecondary,
    },
    freqPillTextActive: {
      color: '#FFFFFF',
    },
    modalSaveBtn: {
      backgroundColor: theme.accent,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: 'center',
    },
    modalSaveBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
    },
    modalActionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    modalSecondaryBtn: {
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
    },
    modalSecondaryBtnText: {
      color: theme.text,
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
    },
    modalDeleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    modalDeleteBtnText: {
      color: '#EF4444',
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
