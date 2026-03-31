-- Add public_rooms table and RLS policies
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  capacity INTEGER,
  participant_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_rooms_is_public ON public_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_public_rooms_created_at ON public_rooms(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public_rooms ENABLE ROW LEVEL SECURITY;

-- Allow public read for public rooms, and owners to read
DROP POLICY IF EXISTS "Public rooms read" ON public_rooms;
CREATE POLICY "Public rooms read"
  ON public_rooms FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

-- Allow authenticated users to create rooms (creator_id must match auth.uid())
DROP POLICY IF EXISTS "Authenticated create rooms" ON public_rooms;
CREATE POLICY "Authenticated create rooms"
  ON public_rooms FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Allow owners to update their rooms
DROP POLICY IF EXISTS "Owner update rooms" ON public_rooms;
CREATE POLICY "Owner update rooms"
  ON public_rooms FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Allow owners to delete their rooms
DROP POLICY IF EXISTS "Owner delete rooms" ON public_rooms;
CREATE POLICY "Owner delete rooms"
  ON public_rooms FOR DELETE
  USING (creator_id = auth.uid());

-- Atomic increment function for participant_count
-- Returns updated participant_count
CREATE OR REPLACE FUNCTION public.increment_room_participants(p_room_id UUID)
RETURNS TABLE(participant_count INTEGER) LANGUAGE plpgsql AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public_rooms
  SET participant_count = public_rooms.participant_count + 1,
      last_updated = NOW()
  WHERE id = p_room_id
  RETURNING public_rooms.participant_count INTO new_count;

  -- assign to out parameter and return single row
  participant_count := new_count;
  RETURN;
END; $$;
