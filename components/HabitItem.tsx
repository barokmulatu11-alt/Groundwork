import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, Pressable } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { AnimatedCard } from './ui/AnimatedCard';
import { Habit } from '@/store/useStore';
import { format } from 'date-fns';
import { useTheme } from '@/lib/ThemeContext';

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string, date: string) => void;
}

export function HabitItem({ habit, onToggle }: HabitItemProps) {
  const { theme } = useTheme();
  const textColor = theme.primaryText;
  const secondaryColor = theme.secondaryText;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const isCompletedToday = habit.dates_completed.includes(today);

  return (
    <AnimatedCard style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14, fontFamily: 'Inter_600SemiBold',
          color: textColor,
          marginBottom: 8 }}>
          {habit.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{
            fontSize: 26, fontFamily: 'Inter_700Bold',
            color: textColor,
            marginRight: 8 }}>
            {habit.streak}
          </Text>
          <Text style={{ fontSize: 24, fontFamily: 'System' }}>
            {habit.streak > 0 ? '' : ''}
          </Text>
        </View>
      </View>
      <Pressable 
        style={{ marginLeft: 16, padding: 8 }}
        onPress={() => onToggle(habit.id, today)}
        hitSlop={10}
      >
        {isCompletedToday ? (
          <CheckCircle2 size={32} color={theme.accent} strokeWidth={1.5} />
        ) : (
          <Circle size={32} color={secondaryColor} strokeWidth={1.5} />
        )}
      </Pressable>
    </AnimatedCard>
  );
}



