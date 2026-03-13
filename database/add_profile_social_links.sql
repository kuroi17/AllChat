-- Add profile social links support
-- Run this in Supabase SQL Editor for existing projects.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS spotify_url TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website_url TEXT;
