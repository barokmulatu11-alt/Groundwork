import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { Task } from '@/lib/taskDatabase';
import { Calendar, ChevronRight, Clock, Edit3 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { SubTaskItem } from './SubTaskItem';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  task: Task;
  onToggleComplete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit?: () => void;
  showDate?: boolean;
}

export const TaskCard = ({ task, onToggleComplete, onUpdate, onDelete, onDuplicate, onEdit, showDate }: Props) => {
  const { theme, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(task.note);

  // Checkbox animations
  const checkedProgress = useSharedValue(task.completed ? 1 : 0);
  
  useEffect(() => {
    checkedProgress.value = withSpring(task.completed ? 1 : 0);
  }, [task.completed]);

  const circleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(checkedProgress.value, [0, 1], ['transparent', theme.accent]),
    borderColor: theme.accent
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(task.completed ? 0 : 24, { duration: 300 })
  }));

  const expandProgress = useSharedValue(0);
  useEffect(() => {
    expandProgress.value = withSpring(expanded ? 1 : 0);
  }, [expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${expandProgress.value * 90}deg` }]
  }));

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.card, 
        borderColor: theme.cardBorder }
    ]}>
      <View style={styles.mainRow}>
        <Pressable 
          testID={`task-checkbox-${task.id}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          accessibilityLabel={`Toggle task ${task.title}`}
          onPress={onToggleComplete} 
          style={styles.checkboxContainer}
        >
          <Animated.View style={[styles.checkbox, circleStyle, { borderRadius: 8 }]}>
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <AnimatedPath
                d="M20 6L9 17L4 12"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={24}
                animatedProps={checkProps}
              />
            </Svg>
          </Animated.View>
        </Pressable>

        <Pressable onPress={() => setExpanded(!expanded)} style={styles.infoContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.priorityDot, { backgroundColor: theme.accent }]} />
            <Text style={[styles.title, { color: theme.primaryText }, task.completed && styles.titleDone]}>
              {task.title}
            </Text>
          </View>
          
          <View style={styles.metaRow}>
            {task.completed ? (
              <View style={[styles.doneBadge, { backgroundColor: 'transparent' }]}><Text style={[styles.doneText, { color: theme.accent }]}>Done</Text></View>
            ) : task.time_block ? (
              <View style={styles.metaItem}>
                <Clock size={12} color={theme.secondaryText} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>{task.time_block}</Text>
              </View>
            ) : null}

            {showDate && task.date && (
              <View style={styles.metaItem}>
                <Calendar size={12} color={theme.secondaryText} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>{task.date}</Text>
              </View>
            )}
            
            {task.sub_tasks && task.sub_tasks.length > 0 && (
              <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                {task.sub_tasks.filter(s => s.completed).length}/{task.sub_tasks.length} sub-tasks
              </Text>
            )}
            
            {task.note && <Edit3 size={12} color={theme.secondaryText} />}
          </View>
        </Pressable>

        <Pressable 
          testID={`task-expand-btn-${task.id}`}
          accessibilityRole="button"
          accessibilityLabel="Expand task details"
          onPress={() => setExpanded(!expanded)} 
          style={styles.expandBtn}
        >
          <Animated.View style={chevronStyle}>
            <ChevronRight size={20} color={theme.secondaryText} />
          </Animated.View>
        </Pressable>
      </View>

      {expanded && (
        <View style={[styles.expandedContent, { marginTop: 12 }]}>
          <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
          <TextInput
            testID={`task-note-input-${task.id}`}
            style={[styles.noteInput, { color: theme.primaryText, backgroundColor: 'transparent' }]}
            placeholder="Add a note..."
            placeholderTextColor={theme.secondaryText}
            multiline
            value={note}
            onChangeText={setNote}
            onBlur={() => onUpdate({ note })}
          />

          {task.sub_tasks && task.sub_tasks.length > 0 && (
            <View style={styles.subTasksContainer}>
              <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>SUB-TASKS</Text>
              {task.sub_tasks.map((st) => (
                <SubTaskItem 
                  key={st.id} 
                  subTask={st} 
                  onToggle={() => {
                    const newSubTasks = task.sub_tasks?.map(s => 
                      s.id === st.id ? { ...s, completed: !s.completed } : s
                    );
                    onUpdate({ sub_tasks: newSubTasks });
                  }} 
                />
              ))}
            </View>
          )}
          
          <View style={styles.priorityRow}>
            {(['high', 'medium', 'low'] as const).map(p => (
              <Pressable 
                key={p} 
                testID={`task-priority-${p}-${task.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Set priority ${p}`}
                onPress={() => onUpdate({ priority: p })}
                style={[
                  styles.priorityPill, 
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  task.priority === p && { backgroundColor: theme.accent }
                ]}
              >
                <Text style={[styles.priorityText, task.priority === p ? { color: 'white' } : { color: theme.secondaryText }]}>
                  {p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            {onEdit && (
              <Pressable 
                testID={`task-edit-btn-${task.id}`}
                accessibilityRole="button"
                accessibilityLabel="Edit task"
                style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                onPress={onEdit}
              >
                <Text style={[styles.actionText, { color: theme.primaryText }]}>✏️ Edit</Text>
              </Pressable>
            )}
            <Pressable 
              testID={`task-duplicate-btn-${task.id}`}
              accessibilityRole="button"
              accessibilityLabel="Duplicate task"
              style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
              onPress={onDuplicate}
            >
              <Text style={[styles.actionText, { color: theme.primaryText }]}>📋 Duplicate</Text>
            </Pressable>
            <Pressable 
              testID={`task-delete-btn-${task.id}`}
              accessibilityRole="button"
              accessibilityLabel="Delete task"
              style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
              onPress={onDelete}
            >
              <Text style={[styles.actionText, { color: theme.accent }]}>🗑 Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    overflow: 'hidden',
    borderWidth: 1,
  },
  mainRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  checkboxContainer: { padding: 4, marginRight: 12, flexShrink: 0 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  infoContainer: { flex: 1, minWidth: 0, justifyContent: 'center' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  title: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', flex: 1, minWidth: 0 },
  titleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums'] },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  doneText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold' },
  expandBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  expandedContent: { overflow: 'hidden' },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  noteInput: { padding: 12, borderRadius: 12, minHeight: 60, textAlignVertical: 'top', fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 12 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  priorityText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  actionText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  subTasksContainer: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontFamily: 'Inter_800ExtraBold', letterSpacing: 0.5, marginBottom: 8, opacity: 0.6 } 
});
