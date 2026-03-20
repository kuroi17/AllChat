# BSU AllChat

BSU AllChat is a campus chat platform with global chat, direct messages, social profile features, and realtime notifications.

## Current Release Line

- Current recommended tag: **v2.0.0**
- Reason: major architecture/runtime shift from MVP (`v1.0.0`) to a dedicated Node.js + Socket.IO backend.

See [CHANGELOG.md](CHANGELOG.md) for corrected `v1.0.0` notes and full `v2.0.0` release notes.

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

Backend default URL: `http://localhost:4000`

Required backend environment variables:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server operations)
- `FRONTEND_URL` (optional, defaults to `http://localhost:5173`)
- `PORT` (optional, defaults to `4000`)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

Required frontend environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (example: `http://localhost:4000`)

## Versioning

- Major (`x.0.0`): breaking runtime/deployment or architecture shifts
- Minor (`x.y.0`): backward-compatible feature additions
- Patch (`x.y.z`): bug fixes and small improvements

## License

MIT
