-- Pro analytics table — tracks paywall impressions, upgrade taps, etc.
-- Used by lib/subscriptionService.ts > trackProEvent()

CREATE TABLE IF NOT EXISTS pro_analytics (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text NOT NULL,
  event       text NOT NULL,   -- 'paywall_view' | 'upgrade_tap' | 'feature_lock_encounter' | 'upgrade_success' | 'restore_tap'
  feature     text,            -- which feature triggered the event (nullable)
  source      text,            -- which screen triggered the event (nullable)
  created_at  timestamptz DEFAULT now()
);

-- Index for fast per-user queries in the admin dashboard
CREATE INDEX IF NOT EXISTS idx_pro_analytics_user_id ON pro_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_analytics_event    ON pro_analytics(event);
CREATE INDEX IF NOT EXISTS idx_pro_analytics_created  ON pro_analytics(created_at DESC);

-- RLS: users can only insert their own rows; admins can read all
ALTER TABLE pro_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics"
  ON pro_analytics FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR user_id = 'guest');

CREATE POLICY "Admins can read all analytics"
  ON pro_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'owner')
    )
  );
