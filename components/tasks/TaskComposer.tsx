import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  CheckSquare,
  ListTodo,
  Calendar,
  Clock,
  Flag,
  Bell,
  Plus,
  Trash2,
  X,
  Maximize2,
  Check,
  CornerDownLeft,
  RotateCcw,
  AlertCircle,
} from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { useStore, type TaskCreationResult } from '@/store/useStore';
import { useResponsive } from '@/hooks/useResponsive';
import {
  getLocalDateString,
  getTomorrowDateString,
  getDaysAheadDateString,
  formatDateDisplay,
  isFutureLocalDate,
  isPastLocalDate,
} from '@/lib/dateUtils';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import type { Task, SubTask } from '@/lib/db';

export type TaskComposerMode = 'compact' | 'expanded';

export interface TaskComposerProps {
  mode?: TaskComposerMode;
  initialContext?: 'Today' | 'Upcoming' | 'All';
  initialDate?: string | null;
  onSuccess?: (task: Task) => void;
  onCancel?: () => void;
  onRequestExpand?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function TaskComposer({
  mode = 'compact',
  initialContext = 'Today',
  initialDate,
  onSuccess,
  onCancel,
  onRequestExpand,
  placeholder = 'What needs to get done?',
  autoFocus = false,
}: TaskComposerProps) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { addTask } = useStore();

  const titleInputRef = useRef<TextInput>(null);
  const checklistInputRef = useRef<TextInput>(null);

  // Determine initial date based on context
  const getComputedInitialDate = useCallback((): string | null => {
    if (initialDate !== undefined) return initialDate;
    if (initialContext === 'Today') return getLocalDateString();
    if (initialContext === 'Upcoming') return getTomorrowDateString();
    return null; // 'All' defaults to unscheduled
  }, [initialContext, initialDate]);

  // Form State
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(getComputedInitialDate());
  const [timeBlock, setTimeBlock] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [note, setNote] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Interaction State
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  // Sync initial date if context changes
  useEffect(() => {
    setSelectedDate(getComputedInitialDate());
  }, [getComputedInitialDate]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Quick date presets
  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();
  const twoDaysAheadStr = getDaysAheadDateString(2);

  const datePresets = [
    { id: 'today', label: 'Today', value: todayStr },
    { id: 'tomorrow', label: 'Tomorrow', value: tomorrowStr },
    { id: 'unscheduled', label: 'Unscheduled', value: null },
  ];

  // Quick time presets
  const timePresets = [
    '09:00 AM',
    '12:00 PM',
    '03:00 PM',
    '06:00 PM',
  ];

  // Checklist item management
  const handleAddChecklistItem = () => {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    setChecklist((prev) => [...prev, trimmed]);
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  // Honest Submission Sequence
  const handleSubmit = async () => {
    if (isPending) return;

    // 1. Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Please enter a task title.');
      titleInputRef.current?.focus();
      return;
    }

    // Validate date for upcoming context if applicable
    if (initialContext === 'Upcoming') {
      if (!selectedDate || !isFutureLocalDate(selectedDate, todayStr)) {
        setValidationError('Upcoming tasks must be scheduled for a future date (tomorrow or later).');
        return;
      }
    }

    setValidationError(null);
    setSubmissionError(null);

    // 2. Set pending state
    setIsPending(true);

    try {
      // 3. Persist locally via store
      const result: TaskCreationResult = await addTask({
        title: trimmedTitle,
        date: selectedDate || '',
        time_block: timeBlock || null,
        priority: priority,
        note: note.trim(),
        reminder_scheduled: hasReminder,
        completed: false,
        sub_tasks: checklist.map((t) => ({ title: t })) as any,
      });

      // 4. Confirm task was returned
      if (result.success && result.task) {
        // 5 & 6. Updated list and queued sync handled by store
        // 7. Restrained success feedback
        hapticSuccess();
        setShowSuccessCheck(true);

        setTimeout(() => {
          // 8. Clear and close
          setTitle('');
          setNote('');
          setChecklist([]);
          setNewChecklistItem('');
          setTimeBlock('');
          setHasReminder(false);
          setShowSuccessCheck(false);
          setIsPending(false);
          setShowPriorityMenu(false);
          setShowScheduleMenu(false);
          setShowDatePicker(false);
          setShowTimeMenu(false);
          onSuccess?.(result.task!);
        }, 220);
      } else {
        // Honest failure handling: keep draft, re-enable controls, display error
        hapticError();
        setIsPending(false);
        setSubmissionError(
          result.error || 'Failed to save task. Please check your storage and retry.'
        );
      }
    } catch (err: any) {
      hapticError();
      setIsPending(false);
      setSubmissionError(
        err?.message || 'A network or database error occurred. Your draft is safe.'
      );
    }
  };

  // Keyboard navigation on web
  const handleKeyDown = (e: any) => {
    if (Platform.OS === 'web' && e.key === 'Enter' && !e.shiftKey) {
      if (mode === 'compact') {
        e.preventDefault();
        handleSubmit();
      }
    }
  };

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
            onPress={() => titleInputRef.current?.focus()}
            accessibilityRole="button"
            accessibilityLabel="Task visual anchor"
          >
            {showSuccessCheck ? (
              <Check size={18} color={theme.accent || '#0066FF'} strokeWidth={2.8} />
            ) : (
              <ListTodo size={18} color={theme.accent || '#0066FF'} strokeWidth={2.4} />
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
            accessibilityLabel="Task title"
            accessibilityRole="none"
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
                accessibilityLabel="Expand full task creation options"
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
              accessibilityLabel={isPending ? 'Saving task' : 'Add task'}
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
                accessibilityLabel="Retry saving task"
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
      {/* Visual Anchor & Header */}
      <View style={styles.expandedHeaderRow}>
        <View style={styles.anchorBadge}>
          <ListTodo size={20} color={theme.accent || '#0066FF'} strokeWidth={2.4} />
          <Text style={styles.anchorTitle}>New Task</Text>
        </View>
        {onCancel && (
          <TouchableOpacity
            onPress={() => {
              if (!isPending) onCancel();
            }}
            disabled={isPending}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel task creation"
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
        {/* Title Input with embedded Schedule and Flag actions */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>TASK TITLE *</Text>
          <View
            style={[
              styles.expandedTitleInputWrap,
              isFocused && styles.expandedTitleInputWrapFocused,
              validationError && !title.trim() && styles.inputErrorBorder,
            ]}
          >
            <TextInput
              ref={titleInputRef}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (validationError) setValidationError(null);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="What needs to get done?"
              placeholderTextColor={isDark ? '#6B6B6B' : '#8E8C87'}
              style={styles.expandedTitleInputField}
              editable={!isPending}
              accessibilityLabel="Required task title"
              returnKeyType="next"
            />
          </View>

          <View style={styles.titleInputActionsRow}>
              {/* Calendar / Schedule Button */}
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setShowPriorityMenu(false);
                  setShowTimeMenu(false);
                  setShowScheduleMenu((prev) => !prev);
                }}
                disabled={isPending}
                style={[
                  styles.titleActionBtn,
                  showScheduleMenu && styles.titleActionBtnActive,
                  Boolean(selectedDate) && styles.titleActionBtnSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Schedule: ${selectedDate ? formatDateDisplay(selectedDate) : 'Unscheduled'}. Tap to change.`}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Calendar
                  size={15}
                  color={selectedDate ? theme.accent : (isDark ? '#8E8C87' : '#6B6B6B')}
                  strokeWidth={2}
                />
                {selectedDate ? (
                  <Text
                    style={[
                      styles.scheduleBadgeText,
                      { color: theme.accent },
                    ]}
                    numberOfLines={1}
                  >
                    {selectedDate === todayStr
                      ? 'Today'
                      : selectedDate === tomorrowStr
                      ? 'Tmrw'
                      : formatDateDisplay(selectedDate)}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {/* Time & Reminder Button */}
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setShowScheduleMenu(false);
                  setShowPriorityMenu(false);
                  setShowTimeMenu((prev) => !prev);
                }}
                disabled={isPending}
                style={[
                  styles.titleActionBtn,
                  showTimeMenu && styles.titleActionBtnActive,
                  (Boolean(timeBlock) || hasReminder) && styles.titleActionBtnSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Time and reminder: ${timeBlock || 'None'}${hasReminder ? ', reminder active' : ''}. Tap to change.`}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Clock
                  size={15}
                  color={timeBlock || hasReminder ? theme.accent : (isDark ? '#8E8C87' : '#6B6B6B')}
                  strokeWidth={2}
                />
                {timeBlock ? (
                  <Text
                    style={[
                      styles.scheduleBadgeText,
                      { color: theme.accent },
                    ]}
                    numberOfLines={1}
                  >
                    {timeBlock.replace(' ', '')}
                  </Text>
                ) : null}
                {hasReminder && (
                  <Bell
                    size={11}
                    color={theme.accent}
                    fill={theme.accent}
                  />
                )}
              </TouchableOpacity>

              {/* Priority / Flag Button */}
              <TouchableOpacity
                onPress={() => {
                  hapticLight();
                  setShowScheduleMenu(false);
                  setShowTimeMenu(false);
                  setShowPriorityMenu((prev) => !prev);
                }}
                disabled={isPending}
                style={[
                  styles.titleActionBtn,
                  showPriorityMenu && styles.titleActionBtnActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Priority: ${priority}. Tap to change.`}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Flag
                  size={15}
                  color={
                    priority === 'high'
                      ? '#EF4444'
                      : priority === 'medium'
                      ? '#F59E0B'
                      : isDark ? '#8E8C87' : '#6B6B6B'
                  }
                  fill={
                    priority === 'high'
                      ? '#EF4444'
                      : priority === 'medium'
                      ? '#F59E0B'
                      : 'transparent'
                  }
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>

          {/* Subtle Schedule Picker directly below input */}
          {showScheduleMenu && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(100)}
              style={styles.subtlePriorityWrap}
            >
              <View style={styles.subtleMenuContent}>
                <View style={styles.subtleMenuHeaderRow}>
                  <Text style={styles.subtlePriorityLabel}>Schedule:</Text>
                  <View style={styles.subtlePriorityRow}>
                    {datePresets.map((preset) => {
                      const isSelected = selectedDate === preset.value;
                      return (
                        <TouchableOpacity
                          key={preset.id}
                          onPress={() => {
                            hapticLight();
                            setSelectedDate(preset.value);
                            setShowDatePicker(false);
                            setShowScheduleMenu(false);
                          }}
                          style={[
                            styles.subtlePriorityOption,
                            isSelected && styles.subtlePriorityOptionActive,
                          ]}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            style={[
                              styles.subtlePriorityText,
                              isSelected && styles.subtlePriorityTextActive,
                            ]}
                          >
                            {preset.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      onPress={() => {
                        hapticLight();
                        setShowDatePicker((prev) => !prev);
                      }}
                      style={[
                        styles.subtlePriorityOption,
                        showDatePicker && styles.subtlePriorityOptionActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Choose custom date"
                    >
                      <Text
                        style={[
                          styles.subtlePriorityText,
                          showDatePicker && styles.subtlePriorityTextActive,
                        ]}
                      >
                        {selectedDate && selectedDate !== todayStr && selectedDate !== tomorrowStr
                          ? formatDateDisplay(selectedDate)
                          : 'Custom...'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Inline Custom 14 Days picker when Custom... is tapped */}
                {showDatePicker && (
                  <View style={styles.subtleCustomDaysWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                      {Array.from({ length: 14 }).map((_, idx) => {
                        const dStr = getDaysAheadDateString(idx);
                        const isSel = selectedDate === dStr;
                        const label = formatDateDisplay(dStr);
                        return (
                          <TouchableOpacity
                            key={dStr}
                            onPress={() => {
                              hapticLight();
                              setSelectedDate(dStr);
                              setShowDatePicker(false);
                              setShowScheduleMenu(false);
                            }}
                            style={[styles.dateChip, isSel && styles.dateChipActive]}
                          >
                            <Text style={[styles.dateChipText, isSel && styles.dateChipTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Subtle Time & Reminder Picker directly below input */}
          {showTimeMenu && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(100)}
              style={styles.subtlePriorityWrap}
            >
              <Text style={styles.subtlePriorityLabel}>Time:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, alignItems: 'center' }}
              >
                {timePresets.map((preset) => {
                  const isSelected = timeBlock === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => {
                        hapticLight();
                        setTimeBlock(isSelected ? '' : preset);
                      }}
                      style={[
                        styles.subtlePriorityOption,
                        isSelected && styles.subtlePriorityOptionActive,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.subtlePriorityText,
                          isSelected && styles.subtlePriorityTextActive,
                        ]}
                      >
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setHasReminder(!hasReminder);
                  }}
                  style={[
                    styles.subtlePriorityOption,
                    hasReminder && styles.subtlePriorityOptionActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle reminder notification"
                >
                  <Bell
                    size={12}
                    color={hasReminder ? theme.accent : (isDark ? '#8E8C87' : '#6B6B6B')}
                    fill={hasReminder ? theme.accent : 'transparent'}
                  />
                  <Text
                    style={[
                      styles.subtlePriorityText,
                      hasReminder && styles.subtlePriorityTextActive,
                    ]}
                  >
                    Reminder
                  </Text>
                </TouchableOpacity>

                {Boolean(timeBlock) && (
                  <TouchableOpacity
                    onPress={() => {
                      hapticLight();
                      setTimeBlock('');
                    }}
                    style={styles.subtlePriorityOption}
                    accessibilityRole="button"
                    accessibilityLabel="Clear time"
                  >
                    <Text style={styles.subtlePriorityText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </Animated.View>
          )}

          {/* Subtle Priority Picker directly below input */}
          {showPriorityMenu && (
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(100)}
              style={styles.subtlePriorityWrap}
            >
              <Text style={styles.subtlePriorityLabel}>Priority:</Text>
              <View style={styles.subtlePriorityRow}>
                {(['low', 'medium', 'high'] as const).map((p) => {
                  const isSelected = priority === p;
                  const dotColor =
                    p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#8E8C87';
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        hapticLight();
                        setPriority(p);
                        setShowPriorityMenu(false);
                      }}
                      style={[
                        styles.subtlePriorityOption,
                        isSelected && styles.subtlePriorityOptionActive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${p} priority`}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: dotColor }]} />
                      <Text
                        style={[
                          styles.subtlePriorityText,
                          isSelected && styles.subtlePriorityTextActive,
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Checklist / Subtasks */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelWithIconRow}>
            <CheckSquare size={13} color={theme.accent} style={{ marginRight: 6 }} />
            <Text style={styles.fieldLabel}>CHECKLIST ({checklist.length})</Text>
          </View>

          {checklist.map((item, index) => (
            <Animated.View
              key={`${item}-${index}`}
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(150)}
              style={styles.checklistItemRow}
            >
              <View style={styles.checklistBullet} />
              <Text style={styles.checklistItemText}>{item}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveChecklistItem(index)}
                disabled={isPending}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove checklist item ${item}`}
              >
                <Trash2 size={14} color={isDark ? '#6B6B6B' : '#A3A29E'} />
              </TouchableOpacity>
            </Animated.View>
          ))}

          <View style={styles.addChecklistInputRow}>
            <TextInput
              ref={checklistInputRef}
              value={newChecklistItem}
              onChangeText={setNewChecklistItem}
              onSubmitEditing={handleAddChecklistItem}
              placeholder="Add a sub-item..."
              placeholderTextColor={isDark ? '#6B6B6B' : '#8E8C87'}
              style={styles.checklistInput}
              editable={!isPending}
              returnKeyType="next"
            />
            {newChecklistItem.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleAddChecklistItem}
                style={styles.checklistAddBtn}
                accessibilityRole="button"
                accessibilityLabel="Add item to checklist"
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.4} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Task Notes / Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NOTES & DETAILS</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add context, instructions, or reflections..."
            placeholderTextColor={isDark ? '#6B6B6B' : '#8E8C87'}
            style={styles.notesInput}
            multiline
            numberOfLines={3}
            editable={!isPending}
            accessibilityLabel="Task notes and description"
          />
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
                accessibilityLabel="Retry saving task"
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
            accessibilityLabel="Cancel task"
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
          accessibilityLabel={isPending ? 'Saving task...' : 'Save task'}
        >
          {showSuccessCheck ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 6 }} />
              <Text style={styles.saveActionText}>Saved</Text>
            </View>
          ) : isPending ? (
            <Text style={styles.saveActionText}>Saving...</Text>
          ) : (
            <Text style={styles.saveActionText}>Create Task</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * RESPONSIVE MODAL WRAPPER (MOBILE SHEET / DESKTOP SIDE PANEL OR DIALOG)
 * ───────────────────────────────────────────────────────────────────────── */
export interface TaskComposerModalProps {
  visible: boolean;
  onClose: () => void;
  initialContext?: 'Today' | 'Upcoming' | 'All';
  initialDate?: string | null;
  onSuccess?: (task: Task) => void;
}

export function TaskComposerModal({
  visible,
  onClose,
  initialContext = 'Today',
  initialDate,
  onSuccess,
}: TaskComposerModalProps) {
  const { isDesktop } = useResponsive();
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

  // Handle escape key on web
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
            <TaskComposer
              mode="expanded"
              initialContext={initialContext}
              initialDate={initialDate}
              autoFocus
              onCancel={onClose}
              onSuccess={(task) => {
                onSuccess?.(task);
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
      gap: 8,
    },
    anchorTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: textPrimary,
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
    labelWithIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    expandedTitleInputWrap: {
      width: '100%',
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: isFocused ? accentBlue : borderDefault,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    },
    expandedTitleInputWrapFocused: {
      borderColor: accentBlue,
    },
    expandedTitleInputField: {
      width: '100%',
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: textPrimary,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    },
    titleInputActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 6,
    },
    titleActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F2F2F0',
      borderWidth: 1,
      borderColor: borderDefault,
      gap: 6,
    },
    titleActionBtnActive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      borderColor: accentBlue,
    },
    titleActionBtnSelected: {
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
      borderColor: accentBlue,
    },
    scheduleBadgeText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
    },
    flagButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F2F2F0',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    flagButtonActive: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderColor: accentBlue,
    },
    subtleMenuContent: {
      width: '100%',
    },
    subtleMenuHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    subtleCustomDaysWrap: {
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#2E2E2E' : '#E0E0DE',
    },
    subtlePriorityWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1C' : '#F2F2F0',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginTop: 4,
      borderWidth: 1,
      borderColor: isDark ? '#2E2E2E' : '#E2E2DF',
      gap: 10,
    },
    subtlePriorityLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: textMuted,
      letterSpacing: 0.5,
    },
    subtlePriorityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    subtlePriorityOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#333333' : '#E0E0DE',
      gap: 5,
    },
    subtlePriorityOptionActive: {
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
      borderColor: accentBlue,
    },
    subtlePriorityText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    subtlePriorityTextActive: {
      color: textPrimary,
      fontFamily: 'Inter_700Bold',
    },
    inputErrorBorder: {
      borderColor: '#EF4444',
    },

    /* Preset Pills */
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    presetPillActive: {
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
      borderColor: accentBlue,
    },
    presetPillText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    presetPillTextActive: {
      color: accentBlue,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Custom Date Picker Wrap */
    customDatePickerWrap: {
      marginTop: 8,
      padding: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
    },
    customDateSubtitle: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    dateChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: isDark ? '#262626' : '#FFFFFF',
      borderWidth: 1,
      borderColor: borderDefault,
      marginRight: 6,
    },
    dateChipActive: {
      backgroundColor: accentBlue,
      borderColor: accentBlue,
    },
    dateChipText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: textPrimary,
    },
    dateChipTextActive: {
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
    },

    /* Priority Row */
    priorityRow: {
      flexDirection: 'row',
      gap: 10,
    },
    priorityOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      gap: 6,
    },
    priorityOptionActive: {
      borderColor: accentBlue,
      backgroundColor: isDark ? (accentBlue + '26') : (accentBlue + '15'),
    },
    priorityDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    priorityText: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: textMuted,
    },
    priorityTextActive: {
      color: textPrimary,
      fontFamily: 'Inter_600SemiBold',
    },

    /* Checklist */
    checklistItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: borderDefault,
    },
    checklistBullet: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: accentBlue,
      marginRight: 10,
    },
    checklistItemText: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: textPrimary,
    },
    addChecklistInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
      marginTop: 2,
    },
    checklistInput: {
      flex: 1,
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: textPrimary,
    },
    checklistAddBtn: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },

    /* Notes Input */
    notesInput: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: textPrimary,
      backgroundColor: isDark ? '#1C1C1C' : '#F7F7F6',
      borderWidth: 1,
      borderColor: borderDefault,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 70,
      textAlignVertical: 'top',
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
