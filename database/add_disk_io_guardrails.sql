-- ==========================================================
-- Disk IO guardrails for Supabase free-tier
-- Run in Supabase SQL Editor (safe to run multiple times)
-- ==========================================================

-- Speeds up online presence lookups (last_seen range + sort)
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_desc
  ON profiles(last_seen DESC)
  WHERE last_seen IS NOT NULL;

-- Helps unread and participant scans per user
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_last_read
  ON conversation_participants(user_id, last_read_at DESC);

-- Helps unread-count and latest-message queries by conversation
CREATE INDEX IF NOT EXISTS idx_dm_conv_created_sender
  ON direct_messages(conversation_id, created_at DESC, sender_id);

-- Helps global/room chat timeline queries
CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON messages(room, created_at DESC);

-- Helps moderation/profile history slices by sender
CREATE INDEX IF NOT EXISTS idx_messages_user_created
  ON messages(user_id, created_at DESC);

-- Optional: quick sanity checks (read-only)
-- SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
