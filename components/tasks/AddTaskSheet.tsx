import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { TaskComposerModal } from './TaskComposer';
import type { TaskInput, SubTaskInput } from '@/lib/taskDatabase';
import type { Task } from '@/lib/db';

export interface AddTaskSheetRef {
  open: (defaultDate?: string) => void;
  close: () => void;
}

interface Props {
  onAdd?: (task: TaskInput, subTasks: SubTaskInput[]) => void;
}

/**
 * Thin compatibility wrapper around unified TaskComposerModal.
 */
export const AddTaskSheet = forwardRef<AddTaskSheetRef, Props>(({ onAdd }, ref) => {
  const [visible, setVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (defaultDate?: string) => {
      setCurrentDate(defaultDate || null);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  return (
    <TaskComposerModal
      visible={visible}
      initialDate={currentDate}
      onClose={() => setVisible(false)}
      onSuccess={(task: Task) => {
        onAdd?.(
          {
            title: task.title,
            note: task.note,
            date: task.date,
            priority: (task.priority || 'medium').toLowerCase() as any,
            time_block: task.time_block,
            reminder_scheduled: task.reminder_scheduled,
          },
          (task.sub_tasks || []).map((s) => ({
            task_id: task.id,
            title: s.title,
          }))
        );
      }}
    />
  );
});

AddTaskSheet.displayName = 'AddTaskSheet';
