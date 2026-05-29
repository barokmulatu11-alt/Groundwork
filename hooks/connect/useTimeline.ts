import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

export interface TimelineEvent {
  id: string;
  user_id: string;
  xp_amount: number;
  reason: string;
  created_at: string;
  formattedType: 'note' | 'task' | 'habit' | 'achievement' | 'focus' | 'other';
}

const PAGE_SIZE = 15;

export const useTimeline = (targetUserId?: string) => {
  const { session, isGuest } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');
  const userId = targetUserId || currentUserId;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const classifyEvent = (reason: string): TimelineEvent['formattedType'] => {
    const r = reason.toLowerCase();
    if (r.includes('note') || r.includes('revision')) return 'note';
    if (r.includes('task') || r.includes('goal')) return 'task';
    if (r.includes('habit') || r.includes('streak')) return 'habit';
    if (r.includes('achievement')) return 'achievement';
    if (r.includes('focus')) return 'focus';
    return 'other';
  };

  const fetchEvents = useCallback(async (currentOffset: number, replace: boolean = false) => {
    if (!userId) {
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const query = `
        SELECT * FROM connect_xp_log 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const rows = db.getAllSync<any>(query, [userId, PAGE_SIZE, currentOffset]);
      
      const formatted = rows.map(r => ({
        ...r,
        formattedType: classifyEvent(r.reason),
      })) as TimelineEvent[];

      if (replace) {
        setEvents(formatted);
      } else {
        setEvents(prev => [...prev, ...formatted]);
      }

      setHasMore(formatted.length === PAGE_SIZE);
      setOffset(currentOffset + formatted.length);
    } catch (e) {
      console.error('[useTimeline] error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMore = () => {
    if (loading || !hasMore) return;
    fetchEvents(offset);
  };

  const refresh = () => {
    setOffset(0);
    setHasMore(true);
    fetchEvents(0, true);
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  return {
    events,
    loading,
    hasMore,
    loadMore,
    refresh,
  };
};
