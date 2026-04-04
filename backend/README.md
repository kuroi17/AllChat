# BSU AllChat Backend

Express + Socket.IO backend for BSU AllChat.

## Stack

- Node.js
- Express 4
- Socket.IO 4
- Supabase (Postgres/Auth)

## Quick Start

```bash
npm install
npm run dev
```

Production start:

```bash
npm start
```

Default port: `4000` (override with `PORT`).

## Environment Variables

### Required

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FRONTEND_URL` in production (`NODE_ENV=production`)

### Recommended

- `SUPABASE_SERVICE_ROLE_KEY` for privileged server operations
- `PORT` (default: `4000`)

### Media / Upload

- `ENABLE_MEDIA_UPLOADS` (default: `false`)
- `ENABLE_EXTERNAL_MEDIA_URLS` (default: `true`)
- `ALLOWED_MEDIA_HOSTS` (CSV whitelist)
- `MAX_MEDIA_MESSAGES_PER_DAY` (default: `5`)
- `CLOUDINARY_URL` (required only for signed Cloudinary uploads)

### Message Guardrails

- `GLOBAL_MESSAGE_RATE_WINDOW_MS` (default: `10000`)
- `GLOBAL_MESSAGE_RATE_MAX` (default: `5`)
- `GLOBAL_MESSAGE_MIN_INTERVAL_MS` (default: `2000`)
- `GLOBAL_MESSAGE_MAX_CHARS` (default: `1000`)
- `GLOBAL_MESSAGE_FETCH_LIMIT` (default: `50`)
- `DIRECT_MESSAGE_RATE_WINDOW_MS` (default: `10000`)
- `DIRECT_MESSAGE_RATE_MAX` (default: `6`)
- `DIRECT_MESSAGE_MIN_INTERVAL_MS` (default: `800`)
- `DIRECT_MESSAGE_MAX_CHARS` (default: `1500`)
- `DIRECT_MESSAGE_FETCH_LIMIT` (default: `75`)

### Random Chat / Analytics

- `RANDOM_CHAT_SESSION_SECONDS` (default: `180`)
- `RANDOM_CHAT_WARNING_SECONDS` (default: `160`)
- `RANDOM_CHAT_VOTE_WINDOW_SECONDS` (default: `20`)
- `RANDOM_ANALYTICS_ADMIN_IDS`
- `RANDOM_ANALYTICS_ADMIN_EMAILS`
- `RANDOM_ANALYTICS_STATE_FILE` (default: `backend/data/random-analytics-state.json`)
- `RANDOM_ANALYTICS_TIMEZONE` (default: `Asia/Manila`)
- `RANDOM_REPORT_LOG_LIMIT`
- `RANDOM_AUDIT_SESSION_LIMIT`
- `RANDOM_PROFILE_CACHE_TTL_MS`
- `RANDOM_PERSISTED_REPORTS_LIMIT`

## API Route Groups

Mounted in `server.js`:

- `/api/health` - health check
- `/api/messages` - global/room messages + reactions
- `/api/users` - profiles, presence, follow graph
- `/api/direct-messages` - conversations, DMs, unread count, reactions, unsend
- `/api/rooms` - room list/join/leave/archive/member preview/invites
- `/api/events` - events CRUD
- `/api/announcements` - announcements CRUD
- `/api/reports` - message reports
- `/api/media` - Cloudinary signature endpoint
- `/api/random` - random chat access, analytics, reports
- `/api/link-preview` - safe preview fetch via query param

See `endpointsAPI.md` and `routes/*.js` for details.

## Socket.IO Events

Core events handled by server:

- `room:join`, `room:leave`, `room:typing`
- `dm:join`, `dm:leave`, `dm:typing`
- Random chat events under `random:*` (queue, match, message, vote, report)

Server emits realtime events such as:

- `message:new`, `message:reaction`, `message:deleted`
- `dm:new`, `dm:reaction`, `dm:deleted`, `dm:notify`, `dm:user-typing`
- `room:user-typing`, `rooms:updated`
- `follow:notify`

## Security / Guardrails

- JWT verification through Supabase Auth middleware
- User-scoped Supabase client for request-level authorization checks
- Route and socket rate limiting
- Duplicate/rapid-send anti-spam guards
- Profanity masking
- Daily media quota enforcement
- Link preview endpoint blocks localhost/private-network targets

## Database

Apply SQL migrations from `../database/` before production usage:

- Start with `database_setup.sql`
- Add feature migrations (rooms, reports, reactions, social links, archive, retention)

See `../database/README.md` for migration notes.
