-- ============================================
-- FIX PROFILES RLS POLICY
-- Allow users to view all profiles (public info)
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new policy that allows viewing all profiles
CREATE POLICY "Everyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Keep the UPDATE policy restrictive (users can only update their own)
-- (already exists, no change needed)

-- ============================================
-- This makes profiles public, which is needed for:
-- 1. UserProfile page to show any user
-- 2. Message components to show user avatars/names
-- 3. Following/followers lists
-- ============================================
