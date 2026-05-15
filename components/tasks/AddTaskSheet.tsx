import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, TextInput, Pressable, ScrollView, Switch } from 'react-native';
import { CenterModal } from '../ui/CenterModal';
import { useTheme } from '@/lib/ThemeContext';
import { TaskInput, SubTaskInput } from '@/lib/taskDatabase';
import { Plus, Trash2 } from 'lucide-react-native';
import { useSettingsStore } from '@/store/useSettingsStore';


export interface AddTaskSheetRef {
  open: (defaultDate?: string) => void;
  close: () => void;
}

interface Props {
  onAdd: (task: TaskInput, subTasks: SubTaskInput[]) => void;
}

export const AddTaskSheet = forwardRef<AddTaskSheetRef, Props>(({ onAdd }, ref) => {
  const { theme, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const settings = useSettingsStore();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [hasTime, setHasTime] = useState(false);
  const [timeBlock, setTimeBlock] = useState('12:00 PM');
  const [hasReminder, setHasReminder] = useState(false);
  const [subTasks, setSubTasks] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    open: (defaultDate?: string) => {
      setTitle('');
      setNote('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setPriority(settings.defaultTaskPriority);
      setHasTime(false);
      setHasReminder(false);
      setSubTasks([]);
      setSubTasks([]);
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    },
    close: () => setVisible(false)
  }));

  const handleAdd = () => {
    if (!title.trim()) return;
    
    const task: TaskInput = {
      title: title.trim(),
      note: note.trim(),
      date,
      priority: priority.toLowerCase() as 'high' | 'medium' | 'low',
      time_block: hasTime ? timeBlock : null,
      reminder_scheduled: hasReminder
    };


    const subs = subTasks.filter(s => s.trim()).map(s => ({ task_id: '', title: s.trim() }));

    onAdd(task, subs);
    setVisible(false);
  };

  return (
    <CenterModal visible={visible} onClose={() => setVisible(false)} maxWidth={380}>
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
          <TextInput
            ref={inputRef}
            style={[styles.titleInput, { color: theme.primaryText }]}
            placeholder="What needs to get done?"
            placeholderTextColor={theme.secondaryText}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <View style={[styles.borderBottom, { backgroundColor: theme.accent }]} />

          <Text style={[styles.label, { color: theme.secondaryText }]}>DATE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
            <Pressable style={[styles.datePill, { backgroundColor: theme.accent }]}>
              <Text style={[styles.datePillText, { color: 'white' }]}>Today</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.secondaryText, marginBottom: 0 }]}>TIME</Text>
            <Switch value={hasTime} onValueChange={setHasTime} />
          </View>

          <Text style={[styles.label, { color: theme.secondaryText }]}>PRIORITY</Text>
          <View style={styles.priorityRow}>
            {(['High', 'Medium', 'Low'] as const).map(p => (
              <Pressable 
                key={p} 
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityPill, 
                  priority === p && { backgroundColor: theme.accent }
                ]}
              >
                <Text style={[styles.priorityText, priority === p ? { color: 'white' } : { color: theme.secondaryText }]}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.secondaryText, marginBottom: 0 }]}>REMIND ME</Text>
            <Switch value={hasReminder} onValueChange={setHasReminder} disabled={!hasTime} />
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

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: theme.secondaryText, marginBottom: 0 }]}>SUB-TASKS</Text>
            <Pressable onPress={() => setSubTasks([...subTasks, ''])} style={styles.addBtn}>
              <Plus size={20} color={theme.accent} />
            </Pressable>
          </View>

          {subTasks.map((sub, i) => (
            <View key={i} style={styles.subRow}>
              <View style={[styles.circle, { borderColor: theme.accent }]} />
              <TextInput
                style={[styles.subInput, { color: theme.primaryText }]}
                value={sub}
                onChangeText={t => {
                  const newSubs = [...subTasks];
                  newSubs[i] = t;
                  setSubTasks(newSubs);
                }}
                autoFocus
              />
              <Pressable onPress={() => setSubTasks(subTasks.filter((_, idx) => idx !== i))}>
                <Trash2 size={16} color="#FF3B30" />
              </Pressable>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.card }]}>
          <Pressable 
            style={[styles.submitBtn, { backgroundColor: theme.accent }, !title.trim() && { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} 
            onPress={handleAdd}
            disabled={!title.trim()}
          >
            <Text style={[styles.submitText, !title.trim() && { color: theme.secondaryText }]}>Add Task</Text>
          </Pressable>
        </View>
      </View>
    </CenterModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingTop: 12, width: '100%' },
  titleInput: { fontSize: 20, fontFamily: 'Inter_700Bold', paddingVertical: 8 },
  borderBottom: { height: 1, opacity: 0.5, marginBottom: 24 },
  label: { fontSize: 12, fontFamily: 'Inter_700Bold', marginBottom: 12, marginTop: 16 },
  dateRow: { flexDirection: 'row', marginBottom: 8 },
  datePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  datePillText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  priorityText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  noteInput: { padding: 16, borderRadius: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Inter_500Medium' },
  addBtn: { padding: 4 },
  subRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, marginRight: 12 },
  subInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15 },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  submitBtn: { padding: 16, borderRadius: 100, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontFamily: 'Inter_600SemiBold' }
});



