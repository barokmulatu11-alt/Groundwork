import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/lib/ThemeContext';
import { Task, SubTask } from '@/lib/taskDatabase';
import { Plus, Trash2 } from 'lucide-react-native';

export interface EditTaskSheetRef {
  open: (task: Task) => void;
  close: () => void;
}

interface Props {
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export const EditTaskSheet = forwardRef<EditTaskSheetRef, Props>(({ onUpdate }, ref) => {
  const { theme, isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const inputRef = useRef<TextInput>(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useImperativeHandle(ref, () => ({
    open: (task: Task) => {
      setActiveTask(task);
      setTitle(task.title);
      setNote(task.note);
      setPriority(task.priority);
      bottomSheetRef.current?.present();
      setTimeout(() => inputRef.current?.focus(), 300);
    },
    close: () => bottomSheetRef.current?.dismiss()
  }));

  const handleUpdate = () => {
    if (!title.trim() || !activeTask) return;
    onUpdate(activeTask.id, {
      title: title.trim(),
      note: note.trim(),
      priority,
    });
    bottomSheetRef.current?.dismiss();
  };

  if (!activeTask) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={1}
      snapPoints={['75%', '95%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.secondaryText }}
    >
      <BottomSheetView style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            ref={inputRef}
            style={[styles.titleInput, { color: theme.primaryText }]}
            placeholder="What needs to get done?"
            placeholderTextColor={theme.secondaryText}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <View style={styles.borderBottom} />

          <Text style={[styles.label, { color: theme.secondaryText }]}>PRIORITY</Text>
          <View style={styles.priorityRow}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <Pressable 
                key={p} 
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityPill, 
                  priority === p && { backgroundColor: p === 'high' ? '#FF3B30' : p === 'medium' ? '#FF9500' : '#34C759' }
                ]}
              >
                <Text style={[styles.priorityText, priority === p ? { color: 'white' } : { color: theme.secondaryText }]}>
                  {p === 'high' ? '🔴 High' : p === 'medium' ? '🟡 Medium' : '🟢 Low'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.secondaryText }]}>NOTE</Text>
          <TextInput
            style={[styles.noteInput, { color: theme.primaryText, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
            placeholder="Add a note (optional)"
            placeholderTextColor={theme.secondaryText}
            multiline
            value={note}
            onChangeText={setNote}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.card }]}>
          <Pressable 
            style={[styles.submitBtn, !title.trim() && { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} 
            onPress={handleUpdate}
            disabled={!title.trim()}
          >
            <Text style={[styles.submitText, !title.trim() && { color: theme.secondaryText }]}>Save Changes</Text>
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  titleInput: { fontSize: 20, fontFamily: 'Inter_700Bold', paddingVertical: 8 },
  borderBottom: { height: 1, backgroundColor: '#007AFF', opacity: 0.5, marginBottom: 24 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 12, marginTop: 16 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  priorityText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  noteInput: { padding: 16, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter_500Medium' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  submitBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 100, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontFamily: 'Inter_600SemiBold' }
});



