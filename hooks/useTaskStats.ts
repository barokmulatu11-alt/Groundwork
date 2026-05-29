import { useState, useCallback, useEffect } from 'react';
import * as db from '../lib/db';
import { useAuthStore } from '@/store/useAuthStore';

export const useTaskStats = (date: string) => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    avgTimeMinutes: 0,
    streak: 0
  });

  const userId = useAuthStore(state => state.session?.user?.id || 'guest');

  const loadStats = useCallback(() => {
    try {
      const { total, completed } = db.getTaskStats(date, userId);
      
      // Calculate avg time
      const tasks = db.getTasksByDate(date, userId).filter(t => t.completed && t.completed_at);
      let totalMins = 0;
      tasks.forEach(t => {
        const created = new Date(t.created_at).getTime();
        const done = new Date(t.completed_at!).getTime();
        if (done > created) {
          totalMins += (done - created) / 60000;
        }
      });
      const avgTimeMinutes = tasks.length > 0 ? Math.round(totalMins / tasks.length) : 0;
      
      // Calculate streak
      let currentStreak = 0;
      let checkDate = new Date(date);
      
      while (true) {
        const dStr = checkDate.toISOString().split('T')[0];
        const count = db.db.getFirstSync<{c: number}>(
          'SELECT COUNT(*) as c FROM tasks WHERE date = ? AND completed = 1 AND user_id = ?', 
          [dStr, userId]
        )?.c || 0;
        
        if (count > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setStats({ total, completed, avgTimeMinutes, streak: currentStreak });
    } catch (e) {
      console.error(e);
    }
  }, [date, userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loadStats };
};
