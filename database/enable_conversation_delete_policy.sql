-- Enable DM conversation deletion for participants
-- Run this in Supabase SQL Editor if delete action fails due RLS.

DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

CREATE POLICY "Users can delete their conversations"
  ON conversations FOR DELETE
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );
