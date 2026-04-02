-- Chat retention helpers to cap database growth on Supabase free tier.
-- Run this migration, then schedule prune_old_chat_messages() daily.

CREATE OR REPLACE FUNCTION prune_old_chat_messages(retention_days INTEGER DEFAULT 90)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff TIMESTAMPTZ;
  deleted_global_count INTEGER := 0;
  deleted_dm_count INTEGER := 0;
BEGIN
  cutoff := NOW() - (GREATEST(retention_days, 7) || ' days')::INTERVAL;

  DELETE FROM messages
  WHERE created_at < cutoff;

  GET DIAGNOSTICS deleted_global_count = ROW_COUNT;

  DELETE FROM direct_messages
  WHERE created_at < cutoff;

  GET DIAGNOSTICS deleted_dm_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'retention_days', GREATEST(retention_days, 7),
    'cutoff', cutoff,
    'deleted_global_messages', deleted_global_count,
    'deleted_direct_messages', deleted_dm_count
  );
END;
$$;

COMMENT ON FUNCTION prune_old_chat_messages(INTEGER)
IS 'Deletes global and direct messages older than retention_days (minimum 7 days).';

-- Optional (Supabase pg_cron): run daily at 3AM UTC
-- SELECT cron.schedule(
--   'prune-old-chat-messages-daily',
--   '0 3 * * *',
--   $$SELECT prune_old_chat_messages(90);$$
-- );
