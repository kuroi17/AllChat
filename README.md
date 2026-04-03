# BSU AllChat

BSU AllChat is a campus chat platform with global chat, direct messages, social profile features, and realtime notifications.

## Current Release Line

- Current recommended tag: **v2.1.0**
- Reason: major architecture/runtime shift from MVP (`v1.0.0`) to a dedicated Node.js + Socket.IO backend.

See [CHANGELOG.md](CHANGELOG.md) for corrected `v1.0.0` notes and full `v2.1.0` release notes.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, Socket.IO
- Data/Auth/Storage: Supabase

## Key Features

- Global chat realtime messaging
- Direct messages with unsend actions, media sharing, typing indicator
- Mobile long-press actions for DM message menu
- Follow/unfollow and profile system
- Notifications and unread badges
- Responsive UI for desktop and mobile
- Basic anti-spam/rate limiting guardrails

## Repository Structure

- `frontend/`: web client
- `backend/`: API + realtime server
- `database/`: SQL setup/migration resources
- `docs/`: project docs

## Local Setup

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Backend default URL: `https://allchatbackendservice.onrender.com`

Required backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server operations)
- `FRONTEND_URL` (required in production)
- `PORT` (optional, defaults to `4000`)

Optional backend media provider variables:

- `CLOUDINARY_URL` (required only if using Cloudinary signed uploads)
- `ENABLE_EXTERNAL_MEDIA_URLS` (default `true`, allows trusted external media hosts)
- `ALLOWED_MEDIA_HOSTS` (comma-separated extra hosts)

Recommended backend guardrails for launch:

- `ENABLE_MEDIA_UPLOADS` (set `false` on free tier)
- `MAX_MEDIA_MESSAGES_PER_DAY` (default `5`)
- `GLOBAL_MESSAGE_RATE_MAX` (default `5`)
- `DIRECT_MESSAGE_RATE_MAX` (default `6`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `https://allchat-3dfr.onrender.com`

Required frontend environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (example: `https://allchatbackendservice.onrender.com`)

Recommended frontend guardrails for launch:

- `VITE_ENABLE_MEDIA_UPLOADS` (`false` to disable uploads by default)
- `VITE_MAX_MEDIA_UPLOAD_BYTES` (default `1048576`, 1MB)
- `VITE_ONLINE_USERS_REFETCH_INTERVAL_MS` (default `60000`)

Optional frontend media provider variables:

- `VITE_MEDIA_STORAGE_PROVIDER` (`supabase` or `cloudinary`)
- `VITE_CLOUDINARY_UPLOAD_FOLDER` (default `bsuallchat`)

## Launch Readiness

- Apply SQL migrations before deployment, including:
  - `database/add_message_reports.sql`
  - `database/add_message_retention_policy.sql`
- Follow [`docs/DEPLOY_GUARDRAILS.md`](docs/DEPLOY_GUARDRAILS.md) for monitoring thresholds and canary rollout.

## Versioning

- Major (`x.0.0`): breaking runtime/deployment or architecture shifts
- Minor (`x.y.0`): backward-compatible feature additions
- Patch (`x.y.z`): bug fixes and small improvements

## License

MIT
