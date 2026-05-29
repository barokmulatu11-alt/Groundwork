import { useState, useCallback, useEffect, useMemo } from 'react';
import * as db from '../lib/db';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

export const useTasks = (date?: string) => {
  const { autoSortTasks } = useSettingsStore();
  const allZustandTasks = useStore(state => state.tasks);
  const storeAddTask = useStore(state => state.addTask);
  const storeUpdateTask = useStore(state => state.updateTask);
  const storeDeleteTask = useStore(state => state.deleteTask);
  const storeToggleTask = useStore(state => state.toggleTask);
  const loadAllStoreTasks = useStore(state => state.loadAllTasks);

  const [viewMode, setViewMode] = useState<'today' | 'upcoming' | 'all'>('today');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = useAuthStore(state => state.session?.user?.id || 'guest');

  // Automatically load all store tasks once if empty
  useEffect(() => {
    loadAllStoreTasks();
  }, [loadAllStoreTasks]);

  const tasks = useMemo(() => {
    if (viewMode === 'today' && date) {
      return allZustandTasks.filter(t => t.date === date && !t.deleted_at);
    }
    if (viewMode === 'upcoming' && date) {
      return allZustandTasks.filter(t => t.date > date && !t.deleted_at);
    }
    return allZustandTasks.filter(t => !t.deleted_at);
  }, [allZustandTasks, viewMode, date]);

  const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => !t.completed).sort((a, b) => {
      if (autoSortTasks) {
        const pA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
        const pB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
        if (pA !== pB) return pA - pB;
      }
      return a.order_index - b.order_index;
    });
  }, [tasks, autoSortTasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.completed);
  }, [tasks]);

  const completionRate = useMemo(() => {
    return tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;
  }, [tasks, completedTasks]);

  const loadTasks = useCallback(() => {
    setViewMode('today');
  }, []);

  const loadAllTasks = useCallback(() => {
    setViewMode('all');
  }, []);

  const loadUpcomingTasks = useCallback(() => {
    setViewMode('upcoming');
  }, []);

  const addTask = async (input: Partial<db.Task>, currentView?: 'Today' | 'Upcoming' | 'All') => {
    try {
      setLoading(true);
      setError(null);
      await storeAddTask(input);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<db.Task>) => {
    try {
      setLoading(true);
      setError(null);
      await storeUpdateTask(id, updates);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await storeDeleteTask(id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const task = allZustandTasks.find(t => t.id === id);
      if (task) {
        await storeToggleTask(id, task.completed);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reorderTasks = async (newOrder: db.Task[]) => {
    db.reorderTasks(newOrder.map(t => t.id));
    loadAllStoreTasks();
  };

  const moveTaskToDate = async (id: string, newDate: string) => {
    await storeUpdateTask(id, { date: newDate });
  };

  const duplicateTask = async (id: string) => {
    const task = allZustandTasks.find(t => t.id === id);
    if (!task) return;
    const { id: oldId, created_at, updated_at, ...rest } = task;
    await storeAddTask({ ...rest, title: `${task.title} (Copy)` });
  };

  const getOverdue = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return allZustandTasks.filter(t => t.date < today && !t.completed && !t.deleted_at);
  }, [allZustandTasks]);

  return {
    tasks, pendingTasks, completedTasks, completionRate,
    loading, error, loadTasks, loadAllTasks, loadUpcomingTasks,
    addTask, updateTask, deleteTask, toggleComplete, reorderTasks,
    moveTaskToDate, duplicateTask, getOverdue
  };
};
