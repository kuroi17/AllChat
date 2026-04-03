-- Add reply support for global/room messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;

-- Reactions table for global/room messages
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji),
  CONSTRAINT message_reactions_emoji_length CHECK (char_length(emoji) <= 16)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
  ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id
  ON message_reactions(user_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view allowed message reactions" ON message_reactions;
CREATE POLICY "Users can view allowed message reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_reactions.message_id
        AND (
          m.room = 'global'
          OR (
            m.room LIKE 'room:%'
            AND EXISTS (
              SELECT 1
              FROM room_members rm
              WHERE rm.room_id::text = replace(m.room, 'room:', '')
                AND rm.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can add own reactions" ON message_reactions;
CREATE POLICY "Users can add own reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_reactions.message_id
        AND (
          m.room = 'global'
          OR (
            m.room LIKE 'room:%'
            AND EXISTS (
              SELECT 1
              FROM room_members rm
              WHERE rm.room_id::text = replace(m.room, 'room:', '')
                AND rm.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;
CREATE POLICY "Users can delete own reactions"
  ON message_reactions FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM messages m
      WHERE m.id = message_reactions.message_id
        AND (
          m.room = 'global'
          OR (
            m.room LIKE 'room:%'
            AND EXISTS (
              SELECT 1
              FROM room_members rm
              WHERE rm.room_id::text = replace(m.room, 'room:', '')
                AND rm.user_id = auth.uid()
            )
          )
        )
    )
  );
