-- ============================================
-- FINAL FIX: Clean ALL direct_messages policies
-- ============================================

-- Drop ALL existing policies on direct_messages
DROP POLICY IF EXISTS "Users can view their messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can view their DMs" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send DMs" ON direct_messages;

-- Create ONLY these two policies
CREATE POLICY "allow_view_own_conversations"
  ON direct_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "allow_insert_own_messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- Run this ONCE and it WILL work!
-- ============================================
