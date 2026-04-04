<p align="center">
  <img src="frontend/public/favicon.png" alt="BSU AllChat Logo" width="150" height="150" style="border-radius: 12px;"/>
</p>

<h1 align="center">BSU AllChat — Campus Chat Platform</h1>
<p align="center"><b>Realtime campus chat with global rooms, direct messages, and profiles.</b></p>
<p align="center">
  A lightweight, open-source chat platform built with modern web tooling, realtime updates, and practical safety guardrails.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2.0-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-7.3.1-purple?logo=vite" />
  <img src="https://img.shields.io/badge/Express-4.18.2-green?logo=express" />
  <img src="https://img.shields.io/badge/Supabase-%40supabase%2Fsupabase--js-orange?logo=supabase" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8.3-lightgrey?logo=socket.io" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" />
</p>

---

## About BSU AllChat

BSU AllChat is a campus-first realtime chat platform offering global rooms, private rooms, direct messages, random 1v1 matching, user profiles, and realtime presence/notifications.

- Realtime global and room chat with Socket.IO
- Public and private rooms with invite tokens
- Private direct messages with reactions, replies, typing, and unsend-for-everyone
- Random queue-based 1v1 chat with abuse report flow and admin analytics access
- Profile system with follow/unfollow, banners, and social links
- Media attachments and server-side link previews
- Built-in anti-spam, rate limits, and media quotas

### Current Release Line

- Latest documented release in `CHANGELOG.md`: **v2.0.0**
- Why major: architecture moved from MVP flow to dedicated `Node.js + Express + Socket.IO` backend runtime.

---

## ✨ Features

- **Global + Room Chat**: Campus-wide global channel and room-specific threads.
- **Private Rooms & Invites**: Join private rooms through invite links/tokens.
- **Direct Messages**: Reactions, replies, media attachments, unread tracking, and unsend.
- **Random Chat**: Queue-based 1v1 matching with timed rounds, voting, and reporting.
- **Profile & Social Graph**: Follow/unfollow, user pages, profile banners, and social links.
- **Realtime Presence & Notifications**: Online indicators, typing indicators, unread badges, follow alerts.
- **Link Preview Service**: Backend-generated previews with URL safety checks and short-term cache.
- **Guardrails**: Rate limiting, anti-spam checks, profanity masking, and daily media caps.

---

## 🏗️ Project Structure

```text
bsuAllChat/
 ├─ frontend/                # React + Vite + Tailwind CSS client
 │  ├─ public/               # Static assets (favicon.png)
 │  ├─ src/                  # Components, pages, contexts, utils
 │  └─ package.json
 ├─ backend/                 # Express API + Socket.IO realtime server
 │  ├─ middleware/           # auth + chat guardrails
 │  ├─ realtime/             # random chat gateway + analytics store
 │  ├─ routes/               # REST route groups
 │  ├─ utils/                # supabase, limits, profanity, admin access
 │  └─ package.json
 ├─ database/                # SQL setup and incremental migrations
 ├─ docs/                    # deployment/setup guidance
 ├─ CHANGELOG.md
 └─ README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+ (recommended)
- npm v9+ or yarn
- Supabase project (database/auth/storage)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd bsuAllChat
```

### 2. Setup backend

```bash
cd backend
npm install
npm run dev
```

Backend required environment variables:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FRONTEND_URL` (required in production)

Backend recommended environment variables:

- `SUPABASE_SERVICE_ROLE_KEY` (recommended for server-side operations)
- `PORT` (default `4000`)
- `ENABLE_MEDIA_UPLOADS` (default `false`)
- `ENABLE_EXTERNAL_MEDIA_URLS` (default `true`)
- `ALLOWED_MEDIA_HOSTS` (CSV)
- `MAX_MEDIA_MESSAGES_PER_DAY` (default `5`)
- `GLOBAL_MESSAGE_RATE_MAX`, `GLOBAL_MESSAGE_RATE_WINDOW_MS`, `GLOBAL_MESSAGE_MIN_INTERVAL_MS`
- `DIRECT_MESSAGE_RATE_MAX`, `DIRECT_MESSAGE_RATE_WINDOW_MS`, `DIRECT_MESSAGE_MIN_INTERVAL_MS`
- `CLOUDINARY_URL` (only needed for Cloudinary signing endpoint)

### 3. Setup frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (required for production builds)

Frontend recommended environment variables:

- `VITE_ENABLE_MEDIA_UPLOADS` (default `false`)
- `VITE_MEDIA_STORAGE_PROVIDER` (`supabase` or `cloudinary`)
- `VITE_CLOUDINARY_UPLOAD_FOLDER` (default `bsuallchat`)
- `VITE_MAX_MEDIA_UPLOAD_BYTES` (default `1048576`)
- `VITE_MAX_GLOBAL_MESSAGE_CHARS` (default `1000`)
- `VITE_MAX_DIRECT_MESSAGE_CHARS` (default `1500`)
- `VITE_PRESENCE_UPDATE_INTERVAL_MS` (default `300000`)
- `VITE_PRESENCE_ACTIVITY_THROTTLE_MS` (default `180000`)
- `VITE_ONLINE_USERS_REFETCH_INTERVAL_MS` (default `180000`)

> Note: media uploads are intentionally disabled by default in both backend and frontend runtime config.

---

## 🛠️ Technology Stack

### Frontend

- React 19 + Vite 7
- React Router 7
- Tailwind CSS 4
- TanStack Query 5
- Socket.IO client
- Supabase JS client

### Backend

- Node.js + Express 4
- Socket.IO 4
- Supabase JS client
- In-memory rate-limiter/anti-spam middleware

### Data / Platform

- Supabase PostgreSQL (tables, RLS policies, migrations)
- Supabase Auth (JWT)
- Supabase Storage and/or Cloudinary for media URLs

---

## 📋 Current Status

### ✅ Implemented

- Global chat and room chat with realtime events
- DM conversations with replies, reactions, typing, media, unread counters
- Random chat queue and timed 1v1 session flow
- Room invites, room archives, and room avatar updates
- Follow/unfollow, profile pages, and presence updates
- Message reporting for global/room/DM + random-session report pipeline
- Link preview endpoint with SSRF-oriented URL checks and 10-minute cache

### 🔧 Operational Notes

- CORS origin is controlled by backend `FRONTEND_URL`.
- Backend health endpoint is `GET /api/health`.
- In development, frontend runtime fallback points to `https://allchatbackendservice.onrender.com` when `VITE_API_URL` is not provided.

---

## 📝 API Overview

Core route groups mounted by the backend:

- `GET/POST/DELETE /api/messages` and reactions under `/api/messages/:id/reactions`
- `GET/PATCH/PUT/POST/DELETE /api/users/*` for profiles, presence, and follow graph
- `GET/POST/PATCH/DELETE /api/direct-messages/*` for conversations, messages, reactions, and unread counts
- `GET/POST/PATCH/DELETE /api/rooms/*` for room listing, join/leave, archives, members, and invites
- `GET/POST/PUT/DELETE /api/events/*`
- `GET/POST/PUT/DELETE /api/announcements/*`
- `POST /api/reports` for message reports
- `POST /api/media/cloudinary/signature` for signed Cloudinary uploads
- `GET /api/random/access`, `GET /api/random/analytics`, `GET/POST /api/random/reports`
- `GET /api/link-preview?url=<encoded-url>`

For endpoint-level details, see `backend/endpointsAPI.md` and route files in `backend/routes/`.

---

## 🧱 Database & Migrations

Run `database/database_setup.sql` first, then apply additive migrations as needed (examples):

- `database/add_public_rooms_table.sql`
- `database/add_dm_media_support.sql`
- `database/add_message_reactions_and_replies.sql`
- `database/add_dm_reactions_and_replies.sql`
- `database/add_message_reports.sql`
- `database/add_room_leave_archive.sql`
- `database/add_profile_banner_support.sql`
- `database/add_profile_social_links.sql`
- `database/add_message_retention_policy.sql`

Helpful references:

- `database/README.md`
- `docs/DEPLOY_GUARDRAILS.md`
- `docs/GOOGLE_OAUTH_SETUP.md`

---

## 🤝 Contributing

Contributions are welcome: bug reports, feature requests, and pull requests.

- Open an issue first for major changes.
- Keep PR scope focused.
- Use separate commits per task/feature/fix.

---

## 📄 License

MIT (see `LICENSE`).

---

## 👨‍💻 Author

Built with ❤️ by the BSU AllChat contributors.

Happy chatting! 🚀
