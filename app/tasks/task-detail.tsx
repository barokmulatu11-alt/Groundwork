import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Trash2, Plus, X, Calendar, Clock, AlertCircle } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTheme } from '@/lib/ThemeContext';
import { useStore } from '@/store/useStore';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import {
  getLocalDateString,
  getTomorrowDateString,
  getDaysAheadDateString,
} from '@/lib/dateUtils';
import { useResponsive } from '@/hooks/useResponsive';
import type { SubTask } from '@/lib/db';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isDesktop, contentMaxWidth, horizontalPadding } = useResponsive();

  const { tasks, updateTask, deleteTask, toggleTask } = useStore();
  
  // Guard against malformed 'guest' ID
  const task = id && id !== 'guest' ? tasks.find((t) => t.id === id) : null;

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setDate(task.date || '');
      setDueTime(task.due_time || '');
      setSubtasks(task.sub_tasks || []);
      setTitleError(null);
    }
  }, [task]);

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  if (!task) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <BrandHeader showBack />
        <View style={styles.centerContainer}>
          <Text style={styles.notFoundTitle}>Task not found</Text>
          <Text style={styles.notFoundSubtitle}>
            This task may have been completed, deleted, or does not exist.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/tasks')}
            style={styles.blueBtn}
            accessibilityRole="button"
          >
            <Text style={styles.blueBtnText}>Return to tasks</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (titleError && text.trim().length > 0) {
      setTitleError(null);
    }
  };

  const handleSave = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError('Task title cannot be blank');
      return;
    }
    setTitleError(null);
    hapticSuccess();
    updateTask(task.id, {
      title: trimmed,
      note: note.trim(),
      priority,
      date: date.trim() || undefined,
      due_time: dueTime.trim() || undefined,
      sub_tasks: subtasks,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      router.back();
    }, 400);
  };

  const handleDeleteConfirmed = () => {
    deleteTask(task.id);
    setShowDeleteConfirm(false);
    router.back();
  };

  const handleToggleSubtask = (subtaskId: string) => {
    hapticLight();
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleAddSubtask = () => {
    const stTitle = newSubtaskTitle.trim();
    if (!stTitle) return;
    hapticLight();
    setSubtasks((prev) => [
      ...prev,
      {
        id: 'st_' + Date.now(),
        task_id: task.id,
        title: stTitle,
        completed: false,
        order_index: prev.length,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    hapticLight();
    setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
  };

  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();
  const nextWeekStr = getDaysAheadDateString(7);

  // Helper renderers for modular desktop / mobile layout
  const renderTitleAndStatus = () => (
    <View style={styles.titleSectionWrap}>
      {/* Status Indicator */}
      <View style={styles.topStatusRow}>
        <TouchableOpacity
          onPress={() => {
            hapticSuccess();
            toggleTask(task.id, task.completed);
          }}
          style={[
            styles.taskCheckbox,
            task.completed && styles.taskCheckboxCompleted,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
        >
          {task.completed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
        </TouchableOpacity>
        <Text style={styles.statusLabel}>
          {task.completed ? 'COMPLETED' : 'IN PROGRESS'}
        </Text>
      </View>

      {/* 1. Title Input & Inline Validation */}
      <TextInput
        value={title}
        onChangeText={handleTitleChange}
        placeholder="Task title"
        placeholderTextColor={theme.textMuted}
        style={[
          styles.titleInput,
          titleError ? { borderColor: '#EF4444' } : null,
        ]}
        multiline
        accessibilityLabel="Task title"
      />
      {titleError ? (
        <View style={styles.errorRow}>
          <AlertCircle size={14} color="#EF4444" />
          <Text style={styles.errorText}>{titleError}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderChecklistSection = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.fieldLabel}>CHECKLIST ITEMS</Text>
      {subtasks.map((st) => (
        <View key={st.id} style={styles.subtaskRow}>
          <TouchableOpacity
            onPress={() => handleToggleSubtask(st.id)}
            style={[
              styles.smallCheckbox,
              st.completed && styles.smallCheckboxCompleted,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: st.completed }}
          >
            {st.completed && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
          </TouchableOpacity>
          <Text
            style={[
              styles.subtaskTitle,
              st.completed && styles.subtaskTitleCompleted,
            ]}
          >
            {st.title}
          </Text>
          <TouchableOpacity
            onPress={() => handleRemoveSubtask(st.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Remove checklist item"
          >
            <X size={15} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add checklist item */}
      <View style={styles.addSubtaskRow}>
        <TextInput
          value={newSubtaskTitle}
          onChangeText={setNewSubtaskTitle}
          onSubmitEditing={handleAddSubtask}
          placeholder="Add checklist item"
          placeholderTextColor={theme.textMuted}
          style={styles.addSubtaskInput}
        />
        {newSubtaskTitle.trim().length > 0 && (
          <TouchableOpacity
            onPress={handleAddSubtask}
            style={styles.addSmallBtn}
            accessibilityLabel="Add item"
          >
            <Plus size={16} color={theme.accent} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNotesSection = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.fieldLabel}>TASK NOTES</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add relevant notes, links, or context..."
        placeholderTextColor={theme.textMuted}
        style={styles.notesInput}
        multiline
        numberOfLines={6}
      />
    </View>
  );

  const renderPrioritySection = () => (
    <View style={styles.sideCardBlock}>
      <Text style={styles.fieldLabel}>PRIORITY</Text>
      <View style={styles.priorityRow}>
        {(['low', 'medium', 'high'] as const).map((p) => {
          const active = priority === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => {
                hapticLight();
                setPriority(p);
              }}
              style={[
                styles.priorityPill,
                active && styles.priorityPillActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${p} priority`}
            >
              <Text
                style={[
                  styles.priorityPillText,
                  active && styles.priorityPillTextActive,
                ]}
              >
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderScheduleSection = () => (
    <View style={styles.sideCardBlock}>
      <Text style={styles.fieldLabel}>SCHEDULE</Text>
      
      {/* Quick Date Pills */}
      <View style={styles.quickDateRow}>
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setDate(todayStr);
          }}
          style={[
            styles.quickPill,
            date === todayStr && styles.quickPillActive,
          ]}
        >
          <Text style={[styles.quickPillText, date === todayStr && styles.quickPillTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setDate(tomorrowStr);
          }}
          style={[
            styles.quickPill,
            date === tomorrowStr && styles.quickPillActive,
          ]}
        >
          <Text style={[styles.quickPillText, date === tomorrowStr && styles.quickPillTextActive]}>
            Tomorrow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setDate(nextWeekStr);
          }}
          style={[
            styles.quickPill,
            date === nextWeekStr && styles.quickPillActive,
          ]}
        >
          <Text style={[styles.quickPillText, date === nextWeekStr && styles.quickPillTextActive]}>
            Next Week
          </Text>
        </TouchableOpacity>

        {date ? (
          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setDate('');
            }}
            style={styles.quickPillClear}
          >
            <Text style={styles.quickPillClearText}>Clear date</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.scheduleRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.fieldHeaderRow}>
            <Calendar size={13} color={theme.textSecondary} />
            <Text style={styles.subFieldLabel}>Due date (YYYY-MM-DD)</Text>
          </View>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="e.g. 2026-10-15"
            placeholderTextColor={theme.textMuted}
            style={styles.textInput}
            autoCorrect={false}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.fieldHeaderRow}>
            <Clock size={13} color={theme.textSecondary} />
            <Text style={styles.subFieldLabel}>Due time (HH:MM)</Text>
          </View>
          <TextInput
            value={dueTime}
            onChangeText={setDueTime}
            placeholder="e.g. 14:00"
            placeholderTextColor={theme.textMuted}
            style={styles.textInput}
            autoCorrect={false}
          />
        </View>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionBlock}>
      <TouchableOpacity
        onPress={handleSave}
        style={styles.saveBtn}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text style={styles.saveBtnText}>
          {savedFeedback ? 'Saved' : 'Save changes'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowDeleteConfirm(true)}
        style={styles.deleteBtn}
        accessibilityRole="button"
        accessibilityLabel="Delete task"
      >
        <Trash2 size={15} color="#EF4444" />
        <Text style={styles.deleteBtnText}>Delete task</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <BrandHeader showBack />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 24) + 80,
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            /* ── Desktop 2-Column Task Editor ───────────────────────── */
            <View style={styles.desktopColumnsRow}>
              {/* Left Column: Title, Checklist, Notes */}
              <View style={styles.desktopEditorLeft}>
                {renderTitleAndStatus()}
                <View style={styles.thinDivider} />
                {renderChecklistSection()}
                <View style={styles.thinDivider} />
                {renderNotesSection()}
              </View>

              {/* Right Column: Priority, Schedule, Actions */}
              <View style={styles.desktopEditorRight}>
                <View style={styles.desktopSideCard}>
                  {renderPrioritySection()}
                </View>

                <View style={styles.desktopSideCard}>
                  {renderScheduleSection()}
                </View>

                <View style={styles.desktopSideCard}>
                  {renderActionButtons()}
                </View>
              </View>
            </View>
          ) : (
            /* ── Mobile / Tablet Sequential Editor ─────────────────── */
            <View>
              {renderTitleAndStatus()}

              <View style={styles.thinDivider} />

              {renderPrioritySection()}

              <View style={styles.thinDivider} />

              {renderScheduleSection()}

              <View style={styles.thinDivider} />

              {renderChecklistSection()}

              <View style={styles.thinDivider} />

              {renderNotesSection()}

              <View style={styles.thinDivider} />

              {/* Save & Delete in linear flow */}
              <View style={styles.saveActionWrap}>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveBtn}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                >
                  <Text style={styles.saveBtnText}>
                    {savedFeedback ? 'Saved' : 'Save changes'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dangerZoneWrap}>
                <TouchableOpacity
                  onPress={() => setShowDeleteConfirm(true)}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete task"
                >
                  <Trash2 size={15} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Delete task</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="#EF4444"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
}

function createStyles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 30,
    },
    notFoundTitle: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: theme.text,
      marginBottom: 8,
    },
    notFoundSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    blueBtn: {
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 999,
    },
    blueBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
    },

    topStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    taskCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 1.8,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskCheckboxCompleted: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    statusLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.textSecondary,
    },

    titleInput: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.text,
      padding: 0,
      lineHeight: 30,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
    },
    thinDivider: {
      height: 1,
      backgroundColor: theme.separator,
      marginVertical: 18,
    },
    fieldLabel: {
      fontSize: 11,
      fontFamily: 'Inter_700Bold',
      letterSpacing: 1.5,
      color: theme.textSecondary,
      marginBottom: 10,
    },
    fieldHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    subFieldLabel: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
    },

    // Priority selector
    priorityRow: {
      flexDirection: 'row',
      gap: 10,
    },
    priorityPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? 'transparent' : '#FFFFFF',
    },
    priorityPillActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    priorityPillText: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.textSecondary,
    },
    priorityPillTextActive: {
      color: '#FFFFFF',
    },

    // Quick Date Selector
    quickDateRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    quickPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.separator,
      backgroundColor: isDark ? '#0A0A0A' : '#F5F5F5',
    },
    quickPillActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    quickPillText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.textSecondary,
    },
    quickPillTextActive: {
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
    },
    quickPillClear: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    quickPillClearText: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: theme.textMuted,
    },

    // Schedule row
    scheduleRow: {
      flexDirection: 'row',
      gap: 16,
    },
    textInput: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? '#0A0A0A' : '#FFFFFF',
    },

    // Subtasks
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 12,
    },
    smallCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.4,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    smallCheckboxCompleted: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    subtaskTitle: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
      flex: 1,
    },
    subtaskTitleCompleted: {
      color: theme.textMuted,
      textDecorationLine: 'line-through',
    },
    addSubtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    addSubtaskInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.text,
      padding: 0,
    },
    addSmallBtn: {
      padding: 6,
    },

    // Notes
    notesInput: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.text,
      lineHeight: 22,
      minHeight: 80,
      padding: 0,
      textAlignVertical: 'top',
    },

    // Save Action
    saveActionWrap: {
      marginTop: 8,
    },
    saveBtn: {
      backgroundColor: theme.accent,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
    },

    // Separated Danger Zone
    dangerZoneWrap: {
      marginTop: 28,
      alignItems: 'center',
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.04)',
    },
    deleteBtnText: {
      color: '#EF4444',
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
    },

    // Modular desktop styles
    desktopColumnsRow: {
      flexDirection: 'row',
      gap: 36,
      width: '100%',
      alignItems: 'flex-start',
    },
    desktopEditorLeft: {
      flex: 1.35,
      minWidth: 0,
    },
    desktopEditorRight: {
      flex: 0.95,
      minWidth: 320,
      gap: 18,
    },
    desktopSideCard: {
      borderWidth: 1,
      borderColor: theme.separator,
      borderRadius: 14,
      padding: 18,
      backgroundColor: isDark ? '#080808' : '#FFFFFF',
    },
    titleSectionWrap: {
      width: '100%',
    },
    sectionBlock: {
      width: '100%',
    },
    sideCardBlock: {
      width: '100%',
    },
    actionBlock: {
      gap: 16,
    },
  });
}
