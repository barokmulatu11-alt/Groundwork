import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
import { CenterModal } from '../ui/CenterModal';
import { useTheme } from '@/lib/ThemeContext';
import { Task } from '@/lib/taskDatabase';
import { Flag } from 'lucide-react-native';

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
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (task: Task) => {
      setActiveTask(task);
      setTitle(task.title);
      setNote(task.note || '');
      setPriority(task.priority || 'medium');
      setShowPriorityMenu(false);
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
          <View style={styles.titleRow}>
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
            <Pressable
              onPress={() => setShowPriorityMenu(!showPriorityMenu)}
              style={styles.flagBtn}
              accessibilityRole="button"
              accessibilityLabel={`Priority ${priority}. Tap to change.`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Flag
                size={18}
                color={
                  priority === 'high'
                    ? '#EF4444'
                    : priority === 'medium'
                    ? '#F59E0B'
                    : theme.textSecondary
                }
                fill={
                  priority === 'high'
                    ? '#EF4444'
                    : priority === 'medium'
                    ? '#F59E0B'
                    : 'transparent'
                }
              />
            </Pressable>
          </View>
          <View style={[styles.borderBottom, { backgroundColor: theme.separator }]} />

          {showPriorityMenu && (
            <View style={styles.subtlePriorityRow}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <Pressable 
                  key={p} 
                  testID={`edit-task-priority-${p}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Set priority ${p}`}
                  onPress={() => {
                    setPriority(p);
                    setShowPriorityMenu(false);
                  }}
                  style={[
                    styles.subtlePriorityPill, 
                    priority === p 
                      ? {
                          backgroundColor: p === 'high' ? '#EF444420' : p === 'medium' ? '#F59E0B20' : '#8E8C8720',
                          borderColor: p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#8E8C87',
                        } 
                      : { backgroundColor: theme.cardSolid, borderColor: theme.separator }
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: p === 'high' ? '#EF4444' : p === 'medium' ? '#F59E0B' : '#8E8C87' }
                    ]}
                  />
                  <Text style={[styles.subtlePriorityText, priority === p ? { color: theme.text, fontFamily: 'Inter_700Bold' } : { color: theme.textSecondary }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    paddingVertical: 8,
    paddingRight: 10,
  },
  flagBtn: {
    padding: 6,
    borderRadius: 6,
  },
  borderBottom: { height: 1, opacity: 0.5, marginBottom: 12 },
  subtlePriorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  subtlePriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subtlePriorityText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 10, marginTop: 8 },
  noteInput: { padding: 14, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter_500Medium' },
  submitBtn: { padding: 14, borderRadius: 100, alignItems: 'center', marginTop: 12 },
  submitText: { color: 'white', fontSize: 15, fontFamily: 'Inter_600SemiBold' }
});
