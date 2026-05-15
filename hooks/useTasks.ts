import { useState, useCallback, useEffect } from 'react';
import * as db from '../lib/db';
import { useSettingsStore } from '@/store/useSettingsStore';


export const useTasks = (date?: string) => {
  const { autoSortTasks } = useSettingsStore();
  const [tasks, setTasks] = useState<db.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };

  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    if (autoSortTasks) {
      const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      if (pA !== pB) return pA - pB;
    }
    return a.order_index - b.order_index;
  });
  const completedTasks = tasks.filter(t => t.completed);
  const completionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  const loadTasks = useCallback(() => {
    try {
      setLoading(true);
      if (date) {
        setTasks(db.getTasksByDate(date));
      } else {
        setTasks([]);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadAllTasks = useCallback(() => {
    try {
      setLoading(true);
      const allTasks = db.db.getAllSync('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY date DESC, order_index ASC') as any[];
      setTasks(allTasks.map(t => ({ 
        ...t, 
        completed: Boolean(t.completed),
        reminder_scheduled: Boolean(t.reminder_scheduled)
      })));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUpcomingTasks = useCallback(() => {
    try {
      setLoading(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      const futureStr = future.toISOString().split('T')[0];
      
      setTasks(db.getTasksByDateRange(tomorrowStr, futureStr));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTask = async (input: Partial<db.Task>) => {
    const newTask = db.addTask({ ...input, order_index: tasks.length });
    if (newTask) {
      setTasks(prev => [...prev, newTask]);
    }
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<db.Task>) => {
    db.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = async (id: string) => {
    db.deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const completed = !task.completed;
    const completed_at = completed ? new Date().toISOString() : null;
    db.updateTask(id, { completed, completed_at });
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, completed, completed_at };
      }
      return t;
    }));
  };

  const reorderTasks = async (newOrder: db.Task[]) => {
    // Update local state immediately for snappy UI
    setTasks(prev => {
      // we only reorder pending tasks here, completed tasks stay as they were
      const pendingMap = new Map(newOrder.map(t => [t.id, t]));
      return prev.map(t => pendingMap.get(t.id) || t);
    });
    db.reorderTasks(newOrder.map(t => t.id));
  };

  const moveTaskToDate = async (id: string, newDate: string) => {
    db.updateTask(id, { date: newDate });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const duplicateTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const { id: oldId, created_at, updated_at, ...rest } = task;
    const newTask = db.addTask({ ...rest, title: `${task.title} (Copy)`, order_index: tasks.length });
    if (newTask) {
      setTasks(prev => [...prev, newTask]);
    }
  };

  const getOverdue = useCallback(() => {
    return db.getOverdueTasks();
  }, []);

  useEffect(() => {
    if (date) loadTasks();
  }, [date, loadTasks]);

  return {
    tasks, pendingTasks, completedTasks, completionRate,
    loading, error, loadTasks, loadAllTasks, loadUpcomingTasks,
    addTask, updateTask, deleteTask, toggleComplete, reorderTasks,
    moveTaskToDate, duplicateTask, getOverdue
  };
};
