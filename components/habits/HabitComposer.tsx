import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
} from 'react-native';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  Sparkles,
  Flame,
  BookOpen,
  Droplets,
  Activity,
  Moon,
  PenTool,
  Coffee,
  Heart,
  Dumbbell,
  Sun,
  CheckSquare,
  Clock,
  Calendar,
  Plus,
  X,
  Maximize2,
  Check,
  CornerDownLeft,
  RotateCcw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useStore, type HabitCreationResult } from '@/store/useStore';
import { useResponsive } from '@/hooks/useResponsive';
import { getLocalDateString, formatDateDisplay } from '@/lib/dateUtils';
import { getHabitScheduleSummary, serializeCustomDays, parseCustomDays } from '@/lib/habitUtils';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { Habit } from '@/lib/db';

export const HABIT_ICONS = [
  { id: 'Flame', label: 'Discipline', Icon: Flame },
  { id: 'BookOpen', label: 'Reading', Icon: BookOpen },
  { id: 'Droplets', label: 'Hydration', Icon: Droplets },
  { id: 'Activity', label: 'Fitness', Icon: Activity },
  { id: 'Moon', label: 'Rest', Icon: Moon },
  { id: 'PenTool', label: 'Journaling', Icon: PenTool },
  { id: 'Sparkles', label: 'Mindfulness', Icon: Sparkles },
  { id: 'Coffee', label: 'Routine', Icon: Coffee },
  { id: 'Heart', label: 'Wellness', Icon: Heart },
  { id: 'Dumbbell', label: 'Strength', Icon: Dumbbell },
  { id: 'Sun', label: 'Outdoors', Icon: Sun },
  { id: 'CheckSquare', label: 'General', Icon: CheckSquare },
];

export const HABIT_TEMPLATES = [
  { title: 'Morning Workout', icon: 'Activity', frequency: 'Weekdays' },
  { title: 'Read 20 Pages', icon: 'BookOpen', frequency: 'Daily' },
  { title: 'Meditate 10min', icon: 'Sparkles', frequency: 'Daily' },
  { title: 'Drink 8 Glasses of Water', icon: 'Droplets', frequency: 'Daily' },
  { title: 'Deep Work 1 Hour', icon: 'Flame', frequency: 'Weekdays' },
  { title: 'Daily Walk', icon: 'Sun', frequency: 'Daily' },
];

const WEEKDAY_LABELS = [
  { index: 0, short: 'M', full: 'Mon' },
  { index: 1, short: 'T', full: 'Tue' },
  { index: 2, short: 'W', full: 'Wed' },
  { index: 3, short: 'T', full: 'Thu' },
  { index: 4, short: 'F', full: 'Fri' },
  { index: 5, short: 'S', full: 'Sat' },
  { index: 6, short: 'S', full: 'Sun' },
];

export type HabitComposerMode = 'compact' | 'expanded';

export interface HabitComposerProps {
  mode?: HabitComposerMode;
  onSuccess?: (habit: Habit) => void;
  onCancel?: () => void;
  onRequestExpand?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  initialHabit?: Habit | null;
}

export function HabitComposer({
  mode = 'compact',
  onSuccess,
  onCancel,
  onRequestExpand,
  placeholder = 'New ritual or habit name...',
  autoFocus = false,
  initialHabit = null,
}: HabitComposerProps) {
  const { theme, isDark } = useTheme();
  const { addHabit, updateHabit } = useStore();

  const titleInputRef = useRef<TextInput>(null);

  // Form State
  const [title, setTitle] = useState(initialHabit?.title || '');
  const [selectedIconId, setSelectedIconId] = useState<string>('Flame');
  const [frequencyType, setFrequencyType] = useState<'Daily' | 'Weekdays' | 'Weekends' | 'Custom'>(() => {
    if (!initialHabit?.frequency) return 'Daily';
    const f = initialHabit.frequency.toLowerCase();
    if (f === 'daily') return 'Daily';
    if (f === 'weekdays') return 'Weekdays';
    if (f === 'weekends') return 'Weekends';
    return 'Custom';
  });
  const [customDays, setCustomDays] = useState<number[]>(() => {
    if (!initialHabit?.frequency) return [0, 1, 2, 3, 4];
    const parsed = parseCustomDays(initialHabit.frequency);
    return parsed.length > 0 ? parsed : [0, 1, 2, 3, 4];
  });
  const [startDate, setStartDate] = useState<string>(initialHabit?.created_at || getLocalDateString());
  const [reminderTime, setReminderTime] = useState<string>('');
  const [hasReminder, setHasReminder] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Sync if initialHabit changes
  useEffect(() => {
    if (initialHabit) {
      setTitle(initialHabit.title || '');
      const f = (initialHabit.frequency || 'Daily').toLowerCase();
      if (f === 'daily') {
        setFrequencyType('Daily');
      } else if (f === 'weekdays') {
        setFrequencyType('Weekdays');
      } else if (f === 'weekends') {
        setFrequencyType('Weekends');
      } else {
        setFrequencyType('Custom');
        const parsed = parseCustomDays(initialHabit.frequency);
        if (parsed.length > 0) setCustomDays(parsed);
      }
      if (initialHabit.created_at) setStartDate(initialHabit.created_at);
    }
  }, [initialHabit]);

  // Interaction State
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Auto focus
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Compute actual frequency string
  const getComputedFrequencyString = (): string => {
    if (frequencyType === 'Daily') return 'Daily';
    if (frequencyType === 'Weekdays') return 'Weekdays';
    if (frequencyType === 'Weekends') return 'Weekends';
    return serializeCustomDays(customDays);
  };

  const schedulePreviewText = getHabitScheduleSummary(getComputedFrequencyString());

  // Toggle custom weekday (0 = Mon, 6 = Sun)
  const toggleCustomDay = (dayIndex: number) => {
    hapticLight();
    setCustomDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev; // Keep at least one day
        return prev.filter((d) => d !== dayIndex);
      } else {
        return [...prev, dayIndex];
      }
    });
  };

  // Prefill template (Does NOT save)
  const applyTemplate = (t: typeof HABIT_TEMPLATES[0]) => {
    hapticLight();
    setTitle(t.title);
    setSelectedIconId(t.icon);
    if (t.frequency === 'Daily' || t.frequency === 'Weekdays') {
      setFrequencyType(t.frequency);
    }
    setValidationError(null);
  };

  // Submission Sequence
  const handleSubmit = async () => {
    if (isPending) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Please enter a habit title.');
      titleInputRef.current?.focus();
      return;
    }

    if (frequencyType === 'Custom' && customDays.length === 0) {
      setValidationError('Please select at least one day for your custom schedule.');
      return;
    }

    setValidationError(null);
    setSubmissionError(null);
    setIsPending(true);

    try {
      const finalFrequency = getComputedFrequencyString();

      if (initialHabit) {
        await updateHabit(initialHabit.id, {
          title: trimmedTitle,
          frequency: finalFrequency,
          category: initialHabit.category || 'Personal',
        });
        hapticSuccess();
        setShowSuccessCheck(true);

        const updatedHabit: Habit = {
          ...initialHabit,
          title: trimmedTitle,
          frequency: finalFrequency,
          updated_at: new Date().toISOString(),
        };

        setTimeout(() => {
          setShowSuccessCheck(false);
          setIsPending(false);
          onSuccess?.(updatedHabit);
        }, 220);
        return;
      }

      const result: HabitCreationResult = await addHabit({
        title: trimmedTitle,
        frequency: finalFrequency,
        streak: 0,
        best_streak: 0,
        dates_completed: JSON.stringify([]),
        category: 'Personal',
        difficulty: 'Medium',
        is_paused: false,
        created_at: startDate,
      });

      if (result.success && result.habit) {
        hapticSuccess();
        setShowSuccessCheck(true);

        setTimeout(() => {
          setTitle('');
          setFrequencyType('Daily');
          setCustomDays([0, 1, 2, 3, 4]);
          setShowSuccessCheck(false);
          setIsPending(false);
          onSuccess?.(result.habit!);
        }, 220);
      } else {
        hapticError();
        setIsPending(false);
        setSubmissionError(
          result.error || 'Failed to save habit. Please check your storage and retry.'
        );
      }
    } catch (err: any) {
      hapticError();
      setIsPending(false);
      setSubmissionError(
        err?.message || 'A database error occurred. Your entered information is kept.'
      );
    }
  };

  // Web keyboard support
  const handleKeyDown = (e: any) => {
    if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
      if (mode === 'compact') {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

  const selectedIconObj = HABIT_ICONS.find((i) => i.id === selectedIconId) || HABIT_ICONS[0];
  const CurrentIcon = selectedIconObj.Icon;

  const styles = createStyles(theme, isDark, isFocused, isPending);

  /* ─────────────────────────────────────────────────────────────────────────
   * COMPACT QUICK-CREATION MODE
   * ───────────────────────────────────────────────────────────────────────── */
  if (mode === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactInputRow}>
          <TouchableOpacity
            style={styles.compactIconBox}
            onPress={() => {
              const curIdx = HABIT_ICONS.findIndex((i) => i.id === selectedIconId);
              const nextIdx = (curIdx + 1) % HABIT_ICONS.length;
              setSelectedIconId(HABIT_ICONS[nextIdx].id);
              hapticLight();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Selected habit icon: ${selectedIconObj.label}. Tap to cycle icons.`}
          >
            {showSuccessCheck ? (
              <Check size={18} color={theme.accent || '#0066FF'} strokeWidth={2.8} />
            ) : (
              <CurrentIcon size={18} color={theme.accent || '#0066FF'} strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (validationError) setValidationError(null);
              if (submissionError) setSubmissionError(null);
            }}
            onSubmitEditing={handleSubmit}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyPress={handleKeyDown}
            placeholder={placeholder}
            placeholderTextColor={isDark ? '#6B6B6B' : '#8E8C87'}
            style={styles.compactInput}
            returnKeyType="done"
            editable={!isPending}
            accessibilityLabel="Habit name"
          />

          <View style={styles.compactActionGroup}>
            {onRequestExpand && (
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  onRequestExpand();
                }}
                style={styles.compactIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Expand full habit options"
              >
                <Maximize2 size={16} color={isDark ? '#8E8C87' : '#6B6B6B'} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isPending}
              style={[
                styles.compactSubmitBtn,
                title.trim().length > 0 && styles.compactSubmitBtnActive,
                isPending && styles.compactSubmitBtnPending,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isPending ? 'Saving habit' : 'Create habit'}
            >
              {showSuccessCheck ? (
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <CornerDownLeft
                  size={16}
                  color={title.trim().length > 0 ? '#FFFFFF' : isDark ? '#6B6B6B' : '#8E8C87'}
                  strokeWidth={2.4}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Compact Frequency Selection */}
        <View style={styles.compactFreqRow}>
          {(['Daily', 'Weekdays', 'Weekends'] as const).map((freq) => {
            const isSelected = frequencyType === freq;
            return (
              <TouchableOpacity
                key={freq}
                onPress={() => {
                  hapticLight();
                  setFrequencyType(freq);
                }}
                disabled={isPending}
                style={[
                  styles.compactFreqPill,
                  isSelected && styles.compactFreqPillActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Repeat ${freq}`}
              >
                <Text
                  style={[
                    styles.compactFreqText,
                    isSelected && styles.compactFreqTextActive,
                  ]}
                >
                  {freq}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Validation or Persistence Error */}
        {(validationError || submissionError) && (
          <View style={styles.errorBanner}>
            <AlertCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorText}>
              {validationError || submissionError}
            </Text>
            {submissionError && (
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.retryButton}
                accessibilityRole="button"
                accessibilityLabel="Retry saving habit"
              >
                <RotateCcw size={12} color={theme.accent || '#0066FF'} style={{ marginRight: 4 }} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * EXPANDED FULL-CREATION MODE
   * ───────────────────────────────────────────────────────────────────────── */
  return (
    <View style={styles.expandedContainer}>
      {/* Header with Visual Anchor */}
      <View style={styles.expandedHeaderRow}>
        <View style={styles.anchorBadge}>
          <View style={styles.iconPreviewBox}>
            <CurrentIcon size={22} color={theme.accent || '#0066FF'} strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.anchorTitle}>{initialHabit ? 'Edit Habit' : 'New Habit'}</Text>
            <Text style={styles.anchorSubline}>{schedulePreviewText}</Text>
          </View>
        </View>
        {onCancel && (
          <TouchableOpacity
            onPress={() => {
              if (!isPending) onCancel();
            }}
            disabled={isPending}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel habit creation"
          >
            <X size={18} color={isDark ? '#8E8C87' : '#6B6B6B'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flexShrink: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.expandedScrollContent}
      >
        {/* Quick Templates Prefill Row */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>QUICK TEMPLATES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
            {HABIT_TEMPLATES.map((tmpl) => (
              <TouchableOpacity
                key={tmpl.title}
                onPress={() => applyTemplate(tmpl)}
                disabled={isPending}
                style={styles.templatePill}
                accessibilityRole="button"
                accessibilityLabel={`Prefill with ${tmpl.title}`}
              >
                <Text style={styles.templatePillText}>{tmpl.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Habit Name Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>HABIT NAME *</Text>
          <TextInput
            ref={titleInputRef}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (validationError) setValidationError(null);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="e.g. Read 20 pages, Hydrate, Morning run"
            placeholderTextColor={isDark ? '#6B6B6B' : '#8E8C87'}
            style={[
              styles.expandedTitleInput,
              validationError && !title.trim() && styles.inputErrorBorder,
            ]}
            editable={!isPending}
            accessibilityLabel="Required habit name"
          />
        </View>

        {/* Icon Picker Palette */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelWithActionRow}>
            <Text style={styles.fieldLabel}>HABIT ICON</Text>
            <TouchableOpacity
              onPress={() => setShowIconPicker(!showIconPicker)}
              accessibilityRole="button"
            >
              <Text style={styles.fieldActionText}>
                {showIconPicker ? 'Hide palette' : 'Change icon'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.iconPaletteGrid}>
            {(showIconPicker ? HABIT_ICONS : HABIT_ICONS.slice(0, 6)).map((item) => {
              const isSelected = selectedIconId === item.id;
              const IconComp = item.Icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    hapticLight();
                    setSelectedIconId(item.id);
                  }}
                  disabled={isPending}
                  style={[
                    styles.iconOptionCard,
                    isSelected && styles.iconOptionCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={item.label}
                >
                  <IconComp
                    size={20}
                    color={isSelected ? (theme.accent || '#0066FF') : isDark ? '#8E8C87' : '#737373'}
                    strokeWidth={isSelected ? 2.4 : 1.8}
                  />
                  <Text
                    style={[
                      styles.iconOptionLabel,
                      isSelected && styles.iconOptionLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Frequency Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FREQUENCY</Text>
          <View style={styles.frequencyRow}>
            {(['Daily', 'Weekdays', 'Weekends', 'Custom'] as const).map((freq) => {
              const isSelected = frequencyType === freq;
              return (
                <TouchableOpacity
                  key={freq}
                  onPress={() => {
                    hapticLight();
                    setFrequencyType(freq);
                  }}
                  disabled={isPending}
                  style={[
                    styles.frequencyPill,
                    isSelected && styles.frequencyPillActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.frequencyPillText,
                      isSelected && styles.frequencyPillTextActive,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 7-Day Monday-through-Sunday Schedule Circles for Custom */}
          {frequencyType === 'Custom' && (
            <Animated.View entering={FadeIn.duration(180)} style={styles.customScheduleContainer}>
              <Text style={styles.customSchedulePrompt}>Tap days to include:</Text>
              <View style={styles.weekdayCirclesRow}>
                {WEEKDAY_LABELS.map((day) => {
                  const isIncluded = customDays.includes(day.index);
                  return (
                    <TouchableOpacity
                      key={day.index}
                      onPress={() => toggleCustomDay(day.index)}
                      disabled={isPending}
                      style={[
                        styles.weekdayCircle,
                        isIncluded && styles.weekdayCircleActive,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isIncluded }}
                      accessibilityLabel={`${day.full} (${isIncluded ? 'selected' : 'not selected'})`}
                    >
                      <Text
                        style={[
                          styles.weekdayCircleLetter,
                          isIncluded && styles.weekdayCircleLetterActive,
                        ]}
                      >
                        {day.short}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Schedule Preview Bar */}
          <View style={styles.schedulePreviewBox}>
            <View style={styles.scheduleCirclesStrip}>
              {WEEKDAY_LABELS.map((d) => {
                let active = false;
                if (frequencyType === 'Daily') active = true;
                else if (frequencyType === 'Weekdays') active = d.index <= 4;
                else if (frequencyType === 'Weekends') active = d.index >= 5;
                else active = customDays.includes(d.index);

                return (
                  <View
                    key={d.index}
                    style={[
                      styles.miniDayDot,
                      active && styles.miniDayDotActive,
                    ]}
                  />
                );
              })}
            </View>
            <Text style={styles.schedulePreviewText}>{schedulePreviewText}</Text>
          </View>
        </View>

        {/* Optional Reminder & Start Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SETTINGS (OPTIONAL)</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              onPress={() => {
                hapticLight();
                setHasReminder(!hasReminder);
              }}
              disabled={isPending}
              style={[styles.settingPill, hasReminder && styles.settingPillActive]}
              accessibilityRole="button"
              accessibilityLabel="Toggle daily reminder"
            >
              <Clock
                size={13}
                color={hasReminder ? (theme.accent || '#0066FF') : isDark ? '#8E8C87' : '#737373'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.settingPillText,
                  hasReminder && styles.settingPillTextActive,
                ]}
              >
                {hasReminder ? 'Reminder ON (08:00 AM)' : 'Add Reminder'}
              </Text>
            </TouchableOpacity>

            <View style={styles.settingPill}>
              <Calendar size={13} color={isDark ? '#8E8C87' : '#737373'} style={{ marginRight: 6 }} />
              <Text style={styles.settingPillText}>
                Starts: {formatDateDisplay(startDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Validation or Submission Error */}
        {(validationError || submissionError) && (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#EF4444" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText}>
                {validationError || submissionError}
              </Text>
            </View>
            {submissionError && (
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.retryButton}
                accessibilityRole="button"
                accessibilityLabel="Retry saving habit"
              >
                <RotateCcw size={13} color={theme.accent || '#0066FF'} style={{ marginRight: 4 }} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.expandedFooterRow}>
        {onCancel && (
          <TouchableOpacity
            onPress={() => {
              if (!isPending) onCancel();
            }}
            disabled={isPending}
            style={styles.cancelActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel habit"
          >
            <Text style={styles.cancelActionText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending}
          style={[
            styles.saveActionBtn,
            isPending && styles.saveActionBtnPending,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isPending ? 'Saving habit...' : initialHabit ? 'Save changes' : 'Create habit'}
        >
          {showSuccessCheck ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 6 }} />
              <Text style={styles.saveActionText}>{initialHabit ? 'Saved' : 'Created'}</Text>
            </View>
          ) : isPending ? (
            <Text style={styles.saveActionText}>Saving...</Text>
          ) : (
            <Text style={styles.saveActionText}>{initialHabit ? 'Save Changes' : 'Create Habit'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * RESPONSIVE MODAL WRAPPER (MOBILE SHEET / DESKTOP SIDE PANEL OR DIALOG)
 * ───────────────────────────────────────────────────────────────────────── */
export interface HabitComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (habit: Habit) => void;
  initialHabit?: Habit | null;
}

export function HabitComposerModal({
  visible,
  onClose,
  onSuccess,
  initialHabit = null,
}: HabitComposerModalProps) {
  const { isDesktop, isTablet } = useResponsive();
  const { theme, isDark } = useTheme();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Escape key support on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={modalStyles.backdropOverlay}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <View
          style={[
            modalStyles.keyboardWrapper,
            keyboardHeight > 0 && {
              justifyContent: 'flex-end',
              paddingBottom: Platform.OS === 'ios' ? 16 : 24,
            },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(150)}
            style={[
              modalStyles.modalBox,
              keyboardHeight > 0 && {
                maxHeight: 380,
              },
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E5E5E5',
              },
            ]}
          >
            <HabitComposer
              mode="expanded"
              autoFocus
              initialHabit={initialHabit}
              onCancel={onClose}
              onSuccess={(habit) => {
                onSuccess?.(habit);
                onClose();
              }}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * STYLES
 * ───────────────────────────────────────────────────────────────────────── */
function createStyles(theme: any, isDark: boolean, isFocused: boolean, isPending: boolean) {
  const bgSurface = isDark ? '#141414' : '#FFFFFF';
  const borderDefault = isDark ? '#262626' : '#E8E8E6';
  const textPrimary = isDark ? '#FFFFFF' : '#141414';
  const textMuted = isDark ? '#8E8C87' : '#737373';
  const accentBlue = theme.accent || '#0066FF';

  return StyleSheet.create({
    /* Compact Styles */
    compactContainer: {
      width: '100%',
    },
    compactInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: bgSurface,
      borderWidth: 1,
      borderColor: isFocused ? accentBlue : borderDefault,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 6,
      minHeight: 48,
    },
    compactIconBox: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    compactInput: {
      flex: 1,
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
      color: textPrimary,
      paddingVertical: 4,
    },
    compactActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginLeft: 8,
    },
    compactIconBtn: {
      padding: 6,
      borderRadius: 6,
    },
    compactSubmitBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? '#262626' : '#EAEAEA',
      alignItems: 'center',
      justifyContent: 'center',
    },
    compactSubmitBtnActive: {
      backgroundColor: accentBlue,
    },
    compactSubmitBtnPending: {
      opacity: 0.6,
    },
    compactFreqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    compactFreqPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#1C1C1C' : '#F2F2F0',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    compactFreqPillActive: {
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
      borderColor: accentBlue,
    },
    compactFreqText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    compactFreqTextActive: {
      color: accentBlue,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Expanded Styles */
    expandedContainer: {
      width: '100%',
      maxHeight: '100%',
      flexShrink: 1,
    },
    expandedHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: borderDefault,
      marginBottom: 16,
    },
    anchorBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconPreviewBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
      borderWidth: 1,
      borderColor: accentBlue + '50',
      alignItems: 'center',
      justifyContent: 'center',
    },
    anchorTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: textPrimary,
    },
    anchorSubline: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: textMuted,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 6,
    },
    expandedScrollContent: {
      paddingBottom: 16,
      gap: 18,
    },
    fieldGroup: {
      gap: 8,
    },
    fieldLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: textMuted,
      letterSpacing: 0.8,
    },
    labelWithActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldActionText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: accentBlue,
    },
    expandedTitleInput: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: textPrimary,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: isFocused ? accentBlue : borderDefault,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },
    inputErrorBorder: {
      borderColor: '#EF4444',
    },

    /* Quick Templates */
    templatePill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      marginRight: 8,
    },
    templatePillText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textPrimary,
    },

    /* Icon Palette Grid */
    iconPaletteGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconOptionCard: {
      width: '31%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      gap: 8,
    },
    iconOptionCardActive: {
      borderColor: accentBlue,
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
    },
    iconOptionLabel: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
      flex: 1,
    },
    iconOptionLabelActive: {
      color: textPrimary,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Frequency Row */
    frequencyRow: {
      flexDirection: 'row',
      gap: 8,
    },
    frequencyPill: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frequencyPillActive: {
      borderColor: accentBlue,
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
    },
    frequencyPillText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    frequencyPillTextActive: {
      color: accentBlue,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Custom 7-day Schedule Circles */
    customScheduleContainer: {
      marginTop: 4,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    customSchedulePrompt: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
      marginBottom: 10,
    },
    weekdayCirclesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    weekdayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: borderDefault,
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekdayCircleActive: {
      backgroundColor: accentBlue,
      borderColor: accentBlue,
    },
    weekdayCircleLetter: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: textMuted,
    },
    weekdayCircleLetterActive: {
      color: '#FFFFFF',
    },

    /* Schedule Preview Box */
    schedulePreviewBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderDefault,
      gap: 12,
      marginTop: 2,
    },
    scheduleCirclesStrip: {
      flexDirection: 'row',
      gap: 4,
    },
    miniDayDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? '#2E2E2E' : '#DCDCD8',
    },
    miniDayDotActive: {
      backgroundColor: accentBlue,
    },
    schedulePreviewText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: textPrimary,
      flex: 1,
    },

    /* Settings Pills */
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    settingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    settingPillActive: {
      borderColor: accentBlue,
      backgroundColor: isDark ? (accentBlue + '20') : (accentBlue + '10'),
    },
    settingPillText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    settingPillTextActive: {
      color: accentBlue,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Error Banner */
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
      borderColor: 'rgba(239,68,68,0.3)',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 8,
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: '#EF4444',
      flex: 1,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      marginLeft: 8,
    },
    retryText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: accentBlue,
    },

    /* Footer Row */
    expandedFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: borderDefault,
      marginTop: 8,
    },
    cancelActionBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelActionText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    saveActionBtn: {
      backgroundColor: accentBlue,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 110,
    },
    saveActionBtnPending: {
      opacity: 0.7,
    },
    saveActionText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: '#FFFFFF',
    },
  });
}

const modalStyles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardWrapper: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 12,
    padding: 22,
    overflow: 'hidden',
  },
});
