-- Add per-user room archive support for leave-room workflow
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS room_member_archives (
  room_id UUID NOT NULL REFERENCES public_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  room_title TEXT NOT NULL,
  room_description TEXT,
  room_avatar_url TEXT,
  room_is_public BOOLEAN DEFAULT TRUE,
  left_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_member_archives_user_left
  ON room_member_archives(user_id, left_at DESC);

CREATE INDEX IF NOT EXISTS idx_room_member_archives_room
  ON room_member_archives(room_id);

ALTER TABLE room_member_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room archive read own" ON room_member_archives;
CREATE POLICY "Room archive read own"
  ON room_member_archives FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Room archive insert own" ON room_member_archives;
CREATE POLICY "Room archive insert own"
  ON room_member_archives FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Room archive update own" ON room_member_archives;
CREATE POLICY "Room archive update own"
  ON room_member_archives FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Room archive delete own" ON room_member_archives;
CREATE POLICY "Room archive delete own"
  ON room_member_archives FOR DELETE
  USING (user_id = auth.uid());
