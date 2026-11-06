import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Check, ChevronRight, Clock, Calendar, CheckSquare, Flag } from 'lucide-react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { hapticSuccess } from '@/lib/haptics';
import { useReducedMotion } from '@/lib/animationUtils';
import type { Task } from '@/lib/db';

interface TaskRowProps {
  task: Task;
  isLast: boolean;
  todayStr: string;
  theme: any;
  isDark: boolean;
  onToggle: () => void;
  onPress: () => void;
}

export function TaskRow({
  task,
  isLast,
  todayStr,
  theme,
  isDark,
  onToggle,
  onPress,
}: TaskRowProps) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(1.22, { duration: 90 }),
        withTiming(1, { duration: 110 })
      );
    }
    hapticSuccess();
    onToggle();
  };

  const completedSubtasks = task.sub_tasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = task.sub_tasks?.length || 0;

  // Format priority styling
  const priorityConfig = {
    high: {
      bg: isDark ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.1)',
      color: '#EF4444',
      label: 'High',
    },
    medium: {
      bg: isDark ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.1)',
      color: '#F59E0B',
      label: 'Med',
    },
    low: {
      bg: isDark ? 'rgba(142, 140, 135, 0.16)' : 'rgba(142, 140, 135, 0.1)',
      color: '#8E8C87',
      label: 'Low',
    },
  };

  const priorityStyle = task.priority && priorityConfig[task.priority] ? priorityConfig[task.priority] : null;

  return (
    <View style={[styles.container, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.separator }]}>
      {/* Tactile Checkbox */}
      <TouchableOpacity
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        style={styles.checkboxTouch}
      >
        <Animated.View
          style={[
            styles.checkbox,
            { borderColor: task.completed ? theme.accent : theme.checkboxBorder },
            task.completed && { backgroundColor: theme.accent },
            animStyle,
          ]}
        >
          {task.completed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
        </Animated.View>
      </TouchableOpacity>

      {/* Main Task Info Clickable */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.infoCol}
        accessibilityRole="button"
        accessibilityLabel={`View details for ${task.title}`}
      >
        <Text
          style={[
            styles.title,
            { color: theme.primaryText },
            task.completed && [styles.titleCompleted, { color: theme.secondaryText }],
          ]}
          numberOfLines={2}
        >
          {task.title || 'Untitled task'}
        </Text>

        {/* Note preview if available */}
        {task.note ? (
          <Text
            style={[styles.notePreview, { color: theme.secondaryText }]}
            numberOfLines={1}
          >
            {task.note}
          </Text>
        ) : null}

        {/* Metadata Pills Row */}
        <View style={styles.metaRow}>
          {/* Due Time / Date Pill */}
          {(task.due_time || (task.date && task.date !== todayStr)) ? (
            <View style={[styles.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              {task.due_time ? (
                <>
                  <Clock size={11} color={theme.secondaryText} strokeWidth={2} />
                  <Text style={[styles.metaPillText, { color: theme.secondaryText }]}>
                    {task.date === todayStr ? 'Today' : task.date || 'Today'} · {task.due_time}
                  </Text>
                </>
              ) : task.date && task.date !== todayStr ? (
                <>
                  <Calendar size={11} color={theme.secondaryText} strokeWidth={2} />
                  <Text style={[styles.metaPillText, { color: theme.secondaryText }]}>
                    {task.date}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Subtasks Progress Pill */}
          {totalSubtasks > 0 ? (
            <View style={[styles.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <CheckSquare size={11} color={completedSubtasks === totalSubtasks ? theme.accent : theme.secondaryText} strokeWidth={2} />
              <Text style={[styles.metaPillText, { color: completedSubtasks === totalSubtasks ? theme.accent : theme.secondaryText }]}>
                {completedSubtasks}/{totalSubtasks}
              </Text>
            </View>
          ) : null}

          {/* Priority Pill */}
          {priorityStyle && task.priority !== 'medium' ? (
            <View style={[styles.metaPill, { backgroundColor: priorityStyle.bg }]}>
              <Flag size={10} color={priorityStyle.color} strokeWidth={2.4} />
              <Text style={[styles.metaPillText, { color: priorityStyle.color, fontFamily: 'Inter_700Bold' }]}>
                {priorityStyle.label}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Subtle chevron affordance */}
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
        style={styles.chevronTouch}
      >
        <ChevronRight size={16} color={theme.tertiaryText || '#8E8C87'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  checkboxTouch: {
    paddingRight: 14,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.65,
  },
  notePreview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  chevronTouch: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
});
