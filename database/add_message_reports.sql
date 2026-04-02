-- Message reports table for moderation
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message_id UUID,
  message_type TEXT NOT NULL,
  room_id UUID REFERENCES public_rooms(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id
  ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reported_user_id
  ON message_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id
  ON message_reports(message_id);

ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Message reports insert" ON message_reports;
CREATE POLICY "Message reports insert"
  ON message_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Message reports read" ON message_reports;
CREATE POLICY "Message reports read"
  ON message_reports FOR SELECT
  USING (reporter_id = auth.uid());
