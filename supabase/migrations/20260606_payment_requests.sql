-- ─── Payment Requests Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL UNIQUE,          -- GW-PRO-XXXXX
  payment_method TEXT NOT NULL,                  -- 'telebirr' | 'cbe'
  plan TEXT NOT NULL,                            -- 'pro_1month' | 'pro_1year'
  amount NUMERIC(10,2) NOT NULL,
  transaction_id TEXT,                           -- submitted by user
  payment_note TEXT,
  screenshot_url TEXT,                           -- uploaded proof
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | under_review | approved | rejected
  rejection_reason TEXT,
  reviewed_by UUID,                              -- admin user id
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_reference ON payment_requests(reference_code);

-- RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own requests
CREATE POLICY "users_read_own_payments" ON payment_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "users_insert_own_payments" ON payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update (status changes, approval)
CREATE POLICY "admins_update_payments" ON payment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Admins can read all
CREATE POLICY "admins_read_all_payments" ON payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ─── Add payment fields to profiles ──────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_type TEXT,          -- 'manual_telebirr' | 'manual_cbe' | null
  ADD COLUMN IF NOT EXISTS activation_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_payment_request_id TEXT;

-- ─── Payment Screenshots Storage Bucket ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-screenshots',
  'payment-screenshots',
  false,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "users_upload_screenshots" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all screenshots
CREATE POLICY "admins_read_screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-screenshots'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Users can read their own screenshots
CREATE POLICY "users_read_own_screenshots" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
