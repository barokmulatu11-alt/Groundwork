import { BackgroundGradient } from '@/components/BackgroundGradient';
import { AppText as Text } from '@/components/ui/AppText';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TabHeader } from '@/components/ui/TabHeader';
import { useTheme } from '@/lib/ThemeContext';
import type { SubTask, Task } from '@/lib/db';
import { useStore } from '@/store/useStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme, isDark } = useTheme();
  const isDesktop = width >= 768;

  const { tasks, updateTask, deleteTask, toggleTask } = useStore();
  const task = tasks.find((t) => t.id === id);

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [date, setDate] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setDate(task.date || '');
      setSubtasks(task.sub_tasks || []);
    }
  }, [task]);

  if (!task) {
    return (
      <BackgroundGradient>
        <View
          style={[
            styles.container,
            {
              paddingTop: insets.top + 20,
              paddingHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            style={{
              fontSize: 20,
              fontFamily: 'Inter_700Bold',
              color: theme.primaryText,
              marginBottom: 8,
            }}
          >
            Task Not Found
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.secondaryText,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            This task may have been completed, deleted, or does not exist.
          </Text>
          <TouchableOpacity
            testID="task-detail-back-btn"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.primaryBtnText}>Back to Tasks</Text>
          </TouchableOpacity>
        </View>
      </BackgroundGradient>
    );
  }

  const handleSave = () => {
    if (!title.trim()) return;
    updateTask(task.id, {
      title: title.trim(),
      note: note.trim(),
      priority,
      date,
      sub_tasks: subtasks,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      router.back();
    }, 600);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    setDeleteConfirmVisible(false);
    router.back();
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      {
        id: 'st_' + Date.now(),
        task_id: task.id,
        title: newSubtaskTitle.trim(),
        completed: false,
        order_index: prev.length,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
  };

  return (
    <BackgroundGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: isDesktop ? 32 : 18,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 120,
            maxWidth: isDesktop ? 760 : undefined,
            alignSelf: isDesktop ? 'center' : undefined,
            width: '100%',
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TabHeader title="Task Details" subtitle={date ? `Due ${date}` : 'Manage your task'} showBack />

          {/* Completion & Title Banner */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <TouchableOpacity
                testID="task-detail-toggle-completed"
                accessibilityRole="checkbox"
                accessibilityLabel="Toggle task completion"
                onPress={() => toggleTask(task.id, task.completed)}
                style={{ marginRight: 12 }}
              >
                {task.completed ? (
                  <CheckCircle2 size={24} color={theme.success} />
                ) : (
                  <Circle size={24} color={theme.tertiaryText} />
                )}
              </TouchableOpacity>
              <TextInput
                testID="task-detail-title-input"
                accessibilityLabel="Task title input"
                style={[
                  styles.titleInput,
                  { color: theme.primaryText },
                  task.completed && { textDecorationLine: 'line-through', opacity: 0.7 },
                ]}
                placeholder="Task title"
                placeholderTextColor={theme.secondaryText}
                value={title}
                onChangeText={setTitle}
                maxLength={140}
              />
            </View>

            {/* Priority Selector */}
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {(['high', 'medium', 'low'] as const).map((p) => (
                <Pressable
                  key={p}
                  testID={`task-detail-priority-${p}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Set priority ${p}`}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityPill,
                    priority === p
                      ? {
                          backgroundColor:
                            p === 'high' ? '#FF3B30' : p === 'medium' ? '#FF9500' : '#34C759',
                        }
                      : {
                          backgroundColor: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.04)',
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      priority === p ? { color: '#ffffff' } : { color: theme.secondaryText },
                    ]}
                  >
                    {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Notes Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 14 },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>NOTES</Text>
            <TextInput
              testID="task-detail-notes-input"
              accessibilityLabel="Task notes input"
              style={[
                styles.notesInput,
                {
                  color: theme.primaryText,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: theme.cardBorder,
                },
              ]}
              placeholder="Add extra context, links, or instructions..."
              placeholderTextColor={theme.secondaryText}
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Subtasks Section */}
          <View
            style={[
              styles.card,
              { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 14 },
            ]}
          >
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
              SUBTASKS ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
            </Text>

            {subtasks.map((st) => (
              <View key={st.id} style={styles.subtaskRow}>
                <TouchableOpacity
                  onPress={() => handleToggleSubtask(st.id)}
                  accessibilityRole="checkbox"
                  style={{ marginRight: 10 }}
                >
                  {st.completed ? (
                    <CheckCircle2 size={18} color={theme.success} />
                  ) : (
                    <Circle size={18} color={theme.tertiaryText} />
                  )}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.subtaskTitle,
                    { color: theme.primaryText },
                    st.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
                  ]}
                >
                  {st.title}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveSubtask(st.id)}
                  accessibilityLabel="Remove subtask"
                  style={{ padding: 4 }}
                >
                  <Trash2 size={14} color={theme.tertiaryText} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TextInput
                testID="task-detail-new-subtask-input"
                accessibilityLabel="New subtask input"
                style={[
                  styles.subtaskInput,
                  {
                    color: theme.primaryText,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    borderColor: theme.cardBorder,
                  },
                ]}
                placeholder="Add subtask..."
                placeholderTextColor={theme.secondaryText}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                onSubmitEditing={handleAddSubtask}
              />
              <TouchableOpacity
                testID="task-detail-add-subtask-btn"
                accessibilityRole="button"
                onPress={handleAddSubtask}
                style={[styles.addSubtaskBtn, { backgroundColor: theme.accent }]}
              >
                <Plus size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <TouchableOpacity
              testID="task-detail-save-btn"
              accessibilityRole="button"
              accessibilityLabel="Save Task Details"
              onPress={handleSave}
              disabled={!title.trim()}
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.accent },
                !title.trim() && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {savedFeedback ? 'Saved!' : 'Save Task'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="task-detail-delete-btn"
              accessibilityRole="button"
              accessibilityLabel="Delete Task"
              onPress={() => setDeleteConfirmVisible(true)}
              style={[
                styles.deleteBtn,
                { borderColor: theme.danger + '40' },
              ]}
            >
              <Trash2 size={16} color={theme.danger} style={{ marginRight: 6 }} />
              <Text style={[styles.deleteBtnText, { color: theme.danger }]}>Delete Task</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  titleInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  priorityText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  notesInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  subtaskInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  addSubtaskBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  deleteBtn: {
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
