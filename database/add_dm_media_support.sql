-- Add direct message media support
-- Run this in Supabase SQL Editor for existing projects.

-- 1) Add image URL column to direct_messages
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_dm_media_by_conversation
  ON direct_messages(conversation_id, created_at DESC)
  WHERE image_url IS NOT NULL;

-- 2) Create DM media storage bucket (public URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dm-media',
  'dm-media',
  true,
  8388608,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage policies for dm-media
DROP POLICY IF EXISTS "DM media read by participants" ON storage.objects;
DROP POLICY IF EXISTS "DM media upload by participants" ON storage.objects;
DROP POLICY IF EXISTS "DM media update by participants" ON storage.objects;
DROP POLICY IF EXISTS "DM media delete by participants" ON storage.objects;

CREATE POLICY "DM media read by participants"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'dm-media'
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id::text = split_part(name, '/', 1)
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "DM media upload by participants"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'dm-media'
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id::text = split_part(name, '/', 1)
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "DM media update by participants"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'dm-media'
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id::text = split_part(name, '/', 1)
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "DM media delete by participants"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'dm-media'
    AND EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id::text = split_part(name, '/', 1)
        AND cp.user_id = auth.uid()
    )
  );
