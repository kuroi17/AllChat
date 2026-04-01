-- Add public_rooms table and RLS policies
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  capacity INTEGER,
  participant_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public_rooms
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE public_rooms
  DROP COLUMN IF EXISTS passcode_hash;

-- Room membership table
CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID REFERENCES public_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);

ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;

-- Helper to check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_room_member(
  p_room_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM room_members
    WHERE room_id = p_room_id
      AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Room members read" ON room_members;
CREATE POLICY "Room members read"
  ON room_members FOR SELECT
  USING (
    is_room_member(room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Room members insert self" ON room_members;
CREATE POLICY "Room members insert self"
  ON room_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Room members delete self" ON room_members;
CREATE POLICY "Room members delete self"
  ON room_members FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_public_rooms_is_public ON public_rooms(is_public);
CREATE INDEX IF NOT EXISTS idx_public_rooms_created_at ON public_rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_rooms_creator ON public_rooms(creator_id);

-- Enable Row Level Security
ALTER TABLE public_rooms ENABLE ROW LEVEL SECURITY;

-- Allow public read for public rooms, and owners to read
DROP POLICY IF EXISTS "Public rooms read" ON public_rooms;
CREATE POLICY "Public rooms read"
  ON public_rooms FOR SELECT
  USING (
    is_public = true
    OR creator_id = auth.uid()
    OR is_room_member(public_rooms.id, auth.uid())
  );

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

-- Room invite links
CREATE TABLE IF NOT EXISTS room_invites (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public_rooms(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_invites_room_id ON room_invites(room_id);
CREATE INDEX IF NOT EXISTS idx_room_invites_created_by ON room_invites(created_by);

ALTER TABLE room_invites ENABLE ROW LEVEL SECURITY;

-- Allow invite previews via a security definer RPC without exposing raw invites.
CREATE OR REPLACE FUNCTION public.get_room_invite_preview(p_token UUID)
RETURNS TABLE (
  room_id UUID,
  token UUID,
  title TEXT,
  description TEXT,
  is_public BOOLEAN,
  participant_count INTEGER,
  capacity INTEGER,
  avatar_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rooms.id AS room_id,
    invites.token,
    rooms.title,
    CASE WHEN rooms.is_public THEN rooms.description ELSE NULL END AS description,
    rooms.is_public,
    rooms.participant_count,
    rooms.capacity,
    rooms.avatar_url
  FROM room_invites AS invites
  JOIN public_rooms AS rooms ON rooms.id = invites.room_id
  WHERE invites.token = p_token
    AND invites.revoked = false
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_room_invite_preview(UUID)
  TO anon, authenticated;

DROP POLICY IF EXISTS "Room invites read" ON room_invites;
CREATE POLICY "Room invites read"
  ON room_invites FOR SELECT
  USING (
    is_room_member(room_invites.room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Room invites insert" ON room_invites;
CREATE POLICY "Room invites insert"
  ON room_invites FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND is_room_member(room_invites.room_id, auth.uid())
  );

DROP POLICY IF EXISTS "Room invites update" ON room_invites;
CREATE POLICY "Room invites update"
  ON room_invites FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Room invites delete" ON room_invites;
CREATE POLICY "Room invites delete"
  ON room_invites FOR DELETE
  USING (created_by = auth.uid());

-- Messages table: support room media
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages(room, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_room_media
  ON messages(room, created_at DESC)
  WHERE image_url IS NOT NULL;

-- Storage: room media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-media',
  'room-media',
  true,
  8388608,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Room media read" ON storage.objects;
DROP POLICY IF EXISTS "Room media upload" ON storage.objects;
DROP POLICY IF EXISTS "Room media update" ON storage.objects;
DROP POLICY IF EXISTS "Room media delete" ON storage.objects;

CREATE POLICY "Room media read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'room-media'
    AND EXISTS (
      SELECT 1
      FROM room_members
      WHERE room_members.room_id::text = split_part(name, '/', 1)
        AND room_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Room media upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'room-media'
    AND EXISTS (
      SELECT 1
      FROM room_members
      WHERE room_members.room_id::text = split_part(name, '/', 1)
        AND room_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Room media update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'room-media'
    AND EXISTS (
      SELECT 1
      FROM room_members
      WHERE room_members.room_id::text = split_part(name, '/', 1)
        AND room_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Room media delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'room-media'
    AND EXISTS (
      SELECT 1
      FROM room_members
      WHERE room_members.room_id::text = split_part(name, '/', 1)
        AND room_members.user_id = auth.uid()
    )
  );

-- Storage: room avatar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-avatars',
  'room-avatars',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Room avatars read" ON storage.objects;
DROP POLICY IF EXISTS "Room avatars upload" ON storage.objects;
DROP POLICY IF EXISTS "Room avatars update" ON storage.objects;
DROP POLICY IF EXISTS "Room avatars delete" ON storage.objects;

CREATE POLICY "Room avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'room-avatars');

CREATE POLICY "Room avatars upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'room-avatars'
    AND EXISTS (
      SELECT 1
      FROM public_rooms
      WHERE public_rooms.id::text = split_part(name, '/', 1)
        AND public_rooms.creator_id = auth.uid()
    )
  );

CREATE POLICY "Room avatars update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'room-avatars'
    AND EXISTS (
      SELECT 1
      FROM public_rooms
      WHERE public_rooms.id::text = split_part(name, '/', 1)
        AND public_rooms.creator_id = auth.uid()
    )
  );

CREATE POLICY "Room avatars delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'room-avatars'
    AND EXISTS (
      SELECT 1
      FROM public_rooms
      WHERE public_rooms.id::text = split_part(name, '/', 1)
        AND public_rooms.creator_id = auth.uid()
    )
  );
