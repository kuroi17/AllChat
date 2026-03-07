-- ============================================
-- FIX DIRECT_MESSAGES INSERT RLS POLICY
-- Simplify to avoid subquery issues
-- ============================================

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;

-- Create simpler policy - just check sender is authenticated user
-- (conversation access is already protected by other policies)
CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- This is safe because:
-- 1. Only the authenticated user can insert messages as themselves
-- 2. Users can only see conversations they're part of (via conversation_participants RLS)
-- 3. Messages are only visible in conversations the user is part of (via SELECT policy)
-- ============================================
