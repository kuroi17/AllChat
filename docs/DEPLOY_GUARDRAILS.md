# Deploy Guardrails (Supabase Free Tier)

This guide helps prevent downtime when usage spikes on Supabase free tier.

## 1) Required Runtime Variables

### Backend

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`
- `ENABLE_MEDIA_UPLOADS` (`true` or `false`, recommended `false` for free tier launch)
- `MAX_MEDIA_MESSAGES_PER_DAY` (default `5`)
- `GLOBAL_MESSAGE_RATE_MAX` (default `5`)
- `GLOBAL_MESSAGE_MIN_INTERVAL_MS` (default `2000`)
- `DIRECT_MESSAGE_RATE_MAX` (default `6`)
- `DIRECT_MESSAGE_MIN_INTERVAL_MS` (default `800`)
- `GLOBAL_MESSAGE_MAX_CHARS` (default `1000`)
- `DIRECT_MESSAGE_MAX_CHARS` (default `1500`)
- `ALLOWED_MEDIA_HOSTS` (comma-separated hostnames, optional)

### Frontend

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_MEDIA_UPLOADS` (`true` or `false`)
- `VITE_MAX_MEDIA_UPLOAD_BYTES` (default `1048576` = 1MB)
- `VITE_MAX_GLOBAL_MESSAGE_CHARS` (default `1000`)
- `VITE_MAX_DIRECT_MESSAGE_CHARS` (default `1500`)
- `VITE_ONLINE_USERS_REFETCH_INTERVAL_MS` (default `60000`)
- `VITE_PRESENCE_UPDATE_INTERVAL_MS` (default `180000`)
- `VITE_PRESENCE_ACTIVITY_THROTTLE_MS` (default `60000`)

## 2) Database Migrations to Apply

Run at minimum:

- `database/add_message_reports.sql`
- `database/add_message_retention_policy.sql`

Optional after migration:

- Schedule `prune_old_chat_messages(90)` daily in Supabase SQL editor (pg_cron supported projects).

## 3) Supabase Alert Thresholds

Configure project usage alerts in Supabase dashboard:

- Database size: warn at 70%, critical at 90%
- Storage size: warn at 70%, critical at 90%
- Egress: warn at 70%, critical at 90%
- Auth MAU: warn at 70%, critical at 90%

## 4) Canary Rollout Plan

- Launch to a small batch (20-50 students first).
- Observe 24 hours:
  - API error rates
  - message send latency
  - Supabase storage/egress growth
- If stable, expand to one department/course group.
- Expand campus-wide only after stable metrics for 48 hours.

## 5) Emergency Controls

If usage spikes:

- Set `ENABLE_MEDIA_UPLOADS=false` and `VITE_ENABLE_MEDIA_UPLOADS=false` then redeploy.
- Reduce `GLOBAL_MESSAGE_RATE_MAX` and `DIRECT_MESSAGE_RATE_MAX`.
- Temporarily increase polling intervals (`VITE_ONLINE_USERS_REFETCH_INTERVAL_MS`).

These controls are already supported by the current codebase.
