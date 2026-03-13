-- Enable sender-only delete for direct messages (unsend for everyone)
-- Run this in Supabase SQL Editor for existing projects.

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can delete their sent messages" ON direct_messages;

CREATE POLICY "Users can delete their sent messages"
  ON direct_messages FOR DELETE
  USING (sender_id = auth.uid());
