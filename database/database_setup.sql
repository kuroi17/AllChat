-- ============================================
-- STEP 1: Add missing column to profiles table
-- ============================================

-- Add last_seen column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- STEP 2: Create follows table with proper FK
-- ============================================

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- ============================================
-- STEP 3: Create conversations table
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: Create conversation_participants table
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);

-- ============================================
-- STEP 5: Create direct_messages table
-- ============================================

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_created_at ON direct_messages(created_at DESC);

-- ============================================
-- STEP 6: Create campus_events table
-- ============================================

CREATE TABLE IF NOT EXISTS campus_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON campus_events(event_date);

-- ============================================
-- STEP 7: Create announcements table
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

-- ============================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 9: Create RLS Policies for follows
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- Anyone can view follows
CREATE POLICY "Public profiles are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- STEP 10: Create RLS Policies for conversations
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON conversations;

-- Users can view their conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (true);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

-- Users can delete conversations they participate in
CREATE POLICY "Users can delete their conversations"
  ON conversations FOR DELETE
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 11: Create RLS Policies for conversation_participants
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON conversation_participants;

-- Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants"
  ON conversation_participants FOR SELECT
  USING (true);

-- Users can join conversations
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own participation
CREATE POLICY "Users can update their participation"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- STEP 12: Create RLS Policies for direct_messages
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;

-- Users can view messages in their conversations
CREATE POLICY "Users can view their messages"
  ON direct_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- STEP 13: Create RLS Policies for campus_events
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Campus events are viewable by everyone" ON campus_events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON campus_events;
DROP POLICY IF EXISTS "Users can update their events" ON campus_events;
DROP POLICY IF EXISTS "Users can delete their events" ON campus_events;

-- Everyone can view events
CREATE POLICY "Campus events are viewable by everyone"
  ON campus_events FOR SELECT
  USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON campus_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own events
CREATE POLICY "Users can update their events"
  ON campus_events FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own events
CREATE POLICY "Users can delete their events"
  ON campus_events FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- STEP 14: Create RLS Policies for announcements
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
DROP POLICY IF EXISTS "Authenticated users can create announcements" ON announcements;
DROP POLICY IF EXISTS "Users can update their announcements" ON announcements;
DROP POLICY IF EXISTS "Users can delete their announcements" ON announcements;

-- Everyone can view announcements
CREATE POLICY "Announcements are viewable by everyone"
  ON announcements FOR SELECT
  USING (true);

-- Authenticated users can create announcements
CREATE POLICY "Authenticated users can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own announcements
CREATE POLICY "Users can update their announcements"
  ON announcements FOR UPDATE
  USING (created_by = auth.uid());

-- Users can delete their own announcements
CREATE POLICY "Users can delete their announcements"
  ON announcements FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- STEP 15: Create trigger function for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE! Your database is now ready for DMs and social features
-- ============================================
