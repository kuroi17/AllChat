-- Add profile banner/cover photo support
-- Run this in Supabase SQL Editor for existing projects.

-- 1) Add banner URL column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2) Create profile banner storage bucket (public URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-banners',
  'profile-banners',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage policies for profile banners
DROP POLICY IF EXISTS "Profile banners are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile banners" ON storage.objects;

CREATE POLICY "Profile banners are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-banners');

CREATE POLICY "Users can upload their own profile banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-banners'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

CREATE POLICY "Users can update their own profile banners"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-banners'
    AND auth.uid()::text = split_part(name, '/', 1)
  )
  WITH CHECK (
    bucket_id = 'profile-banners'
    AND auth.uid()::text = split_part(name, '/', 1)
  );

CREATE POLICY "Users can delete their own profile banners"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-banners'
    AND auth.uid()::text = split_part(name, '/', 1)
  );
