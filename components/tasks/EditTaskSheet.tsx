import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { CenterModal } from '../ui/CenterModal';
import { useTheme } from '@/lib/ThemeContext';
import { Task } from '@/lib/taskDatabase';

export interface EditTaskSheetRef {
  open: (task: Task) => void;
  close: () => void;
}

interface Props {
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export const EditTaskSheet = forwardRef<EditTaskSheetRef, Props>(({ onUpdate }, ref) => {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const [visible, setVisible] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useImperativeHandle(ref, () => ({
    open: (task: Task) => {
      setActiveTask(task);
      setTitle(task.title);
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    },
    close: () => setVisible(false)
  }));

  const handleUpdate = () => {
    if (!title.trim() || !activeTask) return;
    onUpdate(activeTask.id, {
      title: title.trim(),
      note: note.trim(),
      priority,
    });
    setVisible(false);
  };

  return (
    <CenterModal visible={visible} onClose={() => setVisible(false)} maxWidth={380}>
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
          <TextInput
            ref={inputRef}
            testID="edit-task-title-input"
            accessibilityLabel="Edit task title input"
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="What needs to get done?"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <View style={[styles.borderBottom, { backgroundColor: theme.separator }]} />

          <Text style={[styles.label, { color: theme.textSecondary }]}>PRIORITY</Text>
          <View style={styles.priorityRow}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <Pressable 
                key={p} 
                testID={`edit-task-priority-${p}`}
                accessibilityRole="button"
                accessibilityLabel={`Set priority ${p}`}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityPill, 
                  priority === p 
                    ? { backgroundColor: p === 'high' ? '#FF3B30' : p === 'medium' ? '#FF9500' : '#34C759' } 
                    : { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }
                ]}
              >
                <Text style={[styles.priorityText, priority === p ? { color: 'white' } : { color: theme.textSecondary }]}>
                  {p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🟢 Low'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>NOTE</Text>
          <TextInput
            testID="edit-task-note-input"
            accessibilityLabel="Edit task note input"
            style={[styles.noteInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.separator, borderWidth: 1 }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={theme.textSecondary}
            multiline
            value={note}
            onChangeText={setNote}
          />

          <View style={{ height: 24 }} />

          <Pressable 
            testID="edit-task-save-btn"
            accessibilityRole="button"
            accessibilityLabel="Save Changes"
            style={[styles.submitBtn, { backgroundColor: theme.accent }, !title.trim() && { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]} 
            onPress={handleUpdate}
            disabled={!title.trim()}
          >
            <Text style={[styles.submitText, !title.trim() && { color: theme.textSecondary }]}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      </View>
    </CenterModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingVertical: 8 },
  titleInput: { fontSize: 20, fontFamily: 'Inter_700Bold', paddingVertical: 8 },
  borderBottom: { height: 1, opacity: 0.5, marginBottom: 16 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 10, marginTop: 12 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  priorityText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  noteInput: { padding: 14, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter_500Medium' },
  submitBtn: { padding: 14, borderRadius: 100, alignItems: 'center', marginTop: 12 },
  submitText: { color: 'white', fontSize: 15, fontFamily: 'Inter_600SemiBold' }
});



