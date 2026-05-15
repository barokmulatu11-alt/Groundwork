import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View } from 'react-native';
import { Circle, CheckCircle2, Clock } from 'lucide-react-native';
import { AnimatedCard } from './ui/AnimatedCard';
import { Task } from '@/store/useStore';
import { useTheme } from '@/lib/ThemeContext';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string, currentCompleted: boolean) => void;
}

export function TaskItem({ task, onToggle }: TaskItemProps) {
  const { theme } = useTheme();
  const textColor = theme.primaryText;
  const secondaryColor = theme.secondaryText;

  return (
    <AnimatedCard style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => onToggle(task.id, task.completed)}>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14, fontFamily: 'Inter_600SemiBold',
          color: task.completed ? secondaryColor : textColor,
          textDecorationLine: task.completed ? 'line-through' : 'none',
          marginBottom: 4,
        }}>
          {task.title}
        </Text>
        {task.time_block ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Clock size={14} color={secondaryColor} strokeWidth={1.5} />
            <Text style={{
              fontSize: 14, fontFamily: 'Inter_600SemiBold',
              color: secondaryColor,
              marginLeft: 4,
            }}>
              {task.time_block}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ marginLeft: 16 }}>
        {task.completed ? (
          <CheckCircle2 size={28} color={theme.accent} strokeWidth={1.5} />
        ) : (
          <Circle size={28} color={secondaryColor} strokeWidth={1.5} />
        )}
      </View>
    </AnimatedCard>
  );
}



