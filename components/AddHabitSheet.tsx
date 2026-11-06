import React from 'react';
import { HabitComposerModal } from './habits/HabitComposer';
import type { Habit } from '@/lib/db';

interface AddHabitSheetProps {
  visible: boolean;
  onClose: () => void;
  onAddHabit?: (habit: {
    title: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    frequency: string;
  }) => void;
}

/**
 * Thin compatibility wrapper around unified HabitComposerModal.
 */
export function AddHabitSheet({ visible, onClose, onAddHabit }: AddHabitSheetProps) {
  return (
    <HabitComposerModal
      visible={visible}
      onClose={onClose}
      onSuccess={(habit: Habit) => {
        onAddHabit?.({
          title: habit.title,
          category: habit.category || 'Personal',
          difficulty: (habit.difficulty as any) || 'Medium',
          frequency: habit.frequency,
        });
        onClose();
      }}
    />
  );
}
