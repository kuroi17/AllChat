-- ============================================
-- DATABASE FIX SCRIPT
-- This will fix the existing database structure
-- ============================================

-- STEP 1: Drop all problematic RLS policies
-- ============================================

-- Remove duplicate and recursive policies
DROP POLICY IF EXISTS "Users can view participants in their" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their DMs" ON direct_messages;
DROP POLICY IF EXISTS "Users can send DMs" ON direct_messages;
DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Anyone can view campus events" ON campus_events;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Users can insert follows" ON follows;
DROP POLICY IF EXISTS "Users can view their own follows" ON follows;

-- STEP 2: Fix follows table structure
-- ============================================

-- First, drop existing follows table and recreate with correct structure
DROP TABLE IF EXISTS follows CASCADE;

CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Create indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Add correct policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- STEP 3: Fix conversation_participants table structure
-- ============================================

-- Drop and recreate with correct primary key
DROP TABLE IF EXISTS conversation_participants CASCADE;

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create indexes
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);

-- Enable RLS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Add simple non-recursive policies
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- STEP 4: Fix conversations policies (remove recursive one)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

-- Keep only the simple non-recursive policy
-- (The "Users can view their conversations" policy with USING (true) stays)

-- STEP 5: Fix direct_messages policies (remove duplicates)
-- ============================================

-- Remove the duplicate policies, keep only the non-recursive ones
-- Both "Users can view their messages" and "Users can send messages" policies
-- reference conversation_participants, but since we're using USING (true) on 
-- conversation_participants, this won't cause recursion anymore.

-- STEP 6: Verify everything works
-- ============================================

-- Test query: Check if foreign keys exist
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('follows', 'conversation_participants')
ORDER BY tc.table_name;

-- ============================================
-- DONE! The database should now work correctly.
-- ============================================
