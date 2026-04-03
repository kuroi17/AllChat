-- Add reply support for direct messages
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES direct_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to
  ON direct_messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- Reactions table for direct messages
CREATE TABLE IF NOT EXISTS direct_message_reactions (
  message_id UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji),
  CONSTRAINT direct_message_reactions_emoji_length CHECK (char_length(emoji) <= 16)
);

CREATE INDEX IF NOT EXISTS idx_direct_message_reactions_message_id
  ON direct_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_direct_message_reactions_user_id
  ON direct_message_reactions(user_id);

ALTER TABLE direct_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON direct_message_reactions;
CREATE POLICY "Users can view reactions in their conversations"
  ON direct_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM direct_messages dm
      JOIN conversation_participants cp
        ON cp.conversation_id = dm.conversation_id
      WHERE dm.id = direct_message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add own reactions in their conversations" ON direct_message_reactions;
CREATE POLICY "Users can add own reactions in their conversations"
  ON direct_message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM direct_messages dm
      JOIN conversation_participants cp
        ON cp.conversation_id = dm.conversation_id
      WHERE dm.id = direct_message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own reactions in their conversations" ON direct_message_reactions;
CREATE POLICY "Users can delete own reactions in their conversations"
  ON direct_message_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM direct_messages dm
      JOIN conversation_participants cp
        ON cp.conversation_id = dm.conversation_id
      WHERE dm.id = direct_message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );
