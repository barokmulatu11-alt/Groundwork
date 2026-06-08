-- Analytics Events System Migration
-- This migration creates the analytics infrastructure for Groundwork Pro features
-- Created: 2026-06-03

-- ─── Analytics Events Table ─────────────────────────────────────────────────────
-- Append-only log of all user actions for analytics processing

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time ON analytics_events(user_id, timestamp DESC);

-- ─── Analytics Daily Aggregates Table ───────────────────────────────────────────
-- Pre-computed daily metrics for fast dashboard loading

CREATE TABLE IF NOT EXISTS analytics_daily_aggregates (
  date DATE NOT NULL,
  user_id TEXT NOT NULL,
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  notes_viewed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  focus_sessions INTEGER DEFAULT 0,
  PRIMARY KEY (date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id ON analytics_daily_aggregates(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_aggregates(date);

-- ─── Analytics Real-time Cache Table ────────────────────────────────────────────
-- Cached metrics for instant dashboard loading

CREATE TABLE IF NOT EXISTS analytics_realtime_cache (
  user_id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weekly_tasks_completed INTEGER DEFAULT 0,
  weekly_habits_completed INTEGER DEFAULT 0,
  weekly_focus_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  productivity_score INTEGER DEFAULT 0
);

-- ─── Analytics Reports Table ────────────────────────────────────────────────────
-- Stored weekly and monthly reports

CREATE TABLE IF NOT EXISTS analytics_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, report_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_analytics_reports_user_id ON analytics_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type ON analytics_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_period ON analytics_reports(period_start, period_end);

-- ─── Row Level Security Policies ────────────────────────────────────────────────

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_realtime_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_reports ENABLE ROW LEVEL SECURITY;

-- Analytics Events Policies
CREATE POLICY "Users can view own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can insert analytics events" ON analytics_events
  FOR INSERT WITH CHECK (true); -- Allow server-side inserts

-- Daily Aggregates Policies
CREATE POLICY "Users can view own daily aggregates" ON analytics_daily_aggregates
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage daily aggregates" ON analytics_daily_aggregates
  FOR ALL USING (true); -- Allow server-side operations

-- Real-time Cache Policies
CREATE POLICY "Users can view own realtime cache" ON analytics_realtime_cache
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage realtime cache" ON analytics_realtime_cache
  FOR ALL USING (true); -- Allow server-side operations

-- Reports Policies
CREATE POLICY "Users can view own reports" ON analytics_reports
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Service role can manage reports" ON analytics_reports
  FOR ALL USING (true); -- Allow server-side operations

-- ─── Functions ──────────────────────────────────────────────────────────────────

-- Function to clean up old analytics events (keep last 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_events 
  WHERE timestamp < (NOW() - INTERVAL '2 years')::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh realtime cache from daily aggregates
CREATE OR REPLACE FUNCTION refresh_analytics_realtime_cache(p_user_id TEXT)
RETURNS void AS $$
DECLARE
  v_week_ago DATE;
  v_weekly_tasks INTEGER;
  v_weekly_habits INTEGER;
  v_weekly_focus INTEGER;
  v_current_streak INTEGER;
  v_best_streak INTEGER;
  v_productivity_score INTEGER;
BEGIN
  v_week_ago := CURRENT_DATE - INTERVAL '7 days';
  
  -- Calculate weekly totals
  SELECT 
    COALESCE(SUM(tasks_completed), 0),
    COALESCE(SUM(habits_completed), 0),
    COALESCE(SUM(focus_minutes), 0)
  INTO v_weekly_tasks, v_weekly_habits, v_weekly_focus
  FROM analytics_daily_aggregates
  WHERE user_id = p_user_id AND date >= v_week_ago;
  
  -- Calculate current streak
  SELECT streak_days INTO v_current_streak
  FROM analytics_daily_aggregates
  WHERE user_id = p_user_id
  ORDER BY date DESC
  LIMIT 1;
  
  -- Calculate best streak
  SELECT MAX(streak_days) INTO v_best_streak
  FROM analytics_daily_aggregates
  WHERE user_id = p_user_id;
  
  -- Calculate productivity score
  v_productivity_score := LEAST(100, 
    LEAST(50, v_weekly_tasks * 5) + 
    LEAST(25, v_weekly_habits * 5) + 
    LEAST(25, v_weekly_focus / 30 * 5)
  );
  
  -- Upsert cache
  INSERT INTO analytics_realtime_cache (
    user_id, updated_at, weekly_tasks_completed, weekly_habits_completed,
    weekly_focus_minutes, current_streak, best_streak, productivity_score
  ) VALUES (
    p_user_id, NOW(), v_weekly_tasks, v_weekly_habits, v_weekly_focus,
    COALESCE(v_current_streak, 0), COALESCE(v_best_streak, 0), v_productivity_score
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW(),
    weekly_tasks_completed = EXCLUDED.weekly_tasks_completed,
    weekly_habits_completed = EXCLUDED.weekly_habits_completed,
    weekly_focus_minutes = EXCLUDED.weekly_focus_minutes,
    current_streak = EXCLUDED.current_streak,
    best_streak = EXCLUDED.best_streak,
    productivity_score = EXCLUDED.productivity_score;
END;
$$ LANGUAGE plpgsql;

-- ─── Triggers ───────────────────────────────────────────────────────────────────

-- Trigger to update realtime cache when daily aggregates change
CREATE OR REPLACE TRIGGER trg_update_realtime_cache_after_aggregate
AFTER INSERT OR UPDATE ON analytics_daily_aggregates
FOR EACH ROW
EXECUTE FUNCTION refresh_analytics_realtime_cache(NEW.user_id);

-- ─── Initial Data ───────────────────────────────────────────────────────────────

-- Initialize realtime cache for all existing users
INSERT INTO analytics_realtime_cache (user_id, updated_at)
SELECT id, NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM analytics_realtime_cache)
ON CONFLICT (user_id) DO NOTHING;

-- ─── Comments ───────────────────────────────────────────────────────────────────

COMMENT ON TABLE analytics_events IS 'Append-only log of all user actions for analytics processing';
COMMENT ON TABLE analytics_daily_aggregates IS 'Pre-computed daily metrics for fast dashboard loading';
COMMENT ON TABLE analytics_realtime_cache IS 'Cached metrics for instant dashboard loading';
COMMENT ON TABLE analytics_reports IS 'Stored weekly and monthly reports for Pro users';

COMMENT ON FUNCTION refresh_analytics_realtime_cache IS 'Refreshes the realtime cache for a user based on daily aggregates';
COMMENT ON FUNCTION cleanup_old_analytics_events IS 'Cleans up analytics events older than 2 years';