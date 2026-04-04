# BSU AllChat Frontend

React + Vite single-page client for BSU AllChat.

## Stack

- React 19
- Vite 7
- React Router 7
- Tailwind CSS 4
- TanStack Query 5
- Socket.IO Client
- Supabase JS

## Quick Start

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Notes:

- `npm run build` runs `tsc -b && vite build`.
- Postbuild script generates `dist/404.html` from `dist/index.html` for SPA hosting fallback.

## Environment Variables

### Required

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (required in production)

### Optional / Recommended

- `VITE_ENABLE_MEDIA_UPLOADS` (default: `false`)
- `VITE_MEDIA_STORAGE_PROVIDER` (`supabase` or `cloudinary`, default: `supabase`)
- `VITE_CLOUDINARY_UPLOAD_FOLDER` (default: `bsuallchat`)
- `VITE_MAX_MEDIA_UPLOAD_BYTES` (default: `1048576`)
- `VITE_MAX_GLOBAL_MESSAGE_CHARS` (default: `1000`)
- `VITE_MAX_DIRECT_MESSAGE_CHARS` (default: `1500`)
- `VITE_PRESENCE_UPDATE_INTERVAL_MS` (default: `300000`)
- `VITE_PRESENCE_ACTIVITY_THROTTLE_MS` (default: `180000`)
- `VITE_ONLINE_USERS_REFETCH_INTERVAL_MS` (default: `180000`)

Important:

- If `VITE_API_URL` is not provided in development, runtime falls back to `https://allchatbackendservice.onrender.com`.
- If `VITE_API_URL` is missing in production build/runtime, the app throws an error by design.

## App Structure

- `src/App.tsx` - route map and protected/public route wiring
- `src/pages/` - page-level features (`GlobalChat`, `DirectMessage`, `RandomChat`, `RoomsList`, etc.)
- `src/components/` - UI and feature components grouped by domain
- `src/contexts/UserContext.jsx` - auth/profile/session presence updates
- `src/contexts/PresenceContext.jsx` - online users query provider
- `src/utils/` - API clients, socket setup, runtime config, helpers

## Routes

Public:

- `/auth`
- `/forget`
- `/change-password`

Protected:

- `/`
- `/dashboard`
- `/profile`
- `/user/:userId`
- `/dms`
- `/dm/new`
- `/dm/:conversationId`
- `/random`
- `/rooms`
- `/rooms/:roomId`
- `/invite/:token`
- `/settings`
- `/settings/rooms-archive`

## Realtime Behavior

- Uses shared Socket.IO instance from frontend utils.
- Auth token is passed in socket handshake.
- Typing events, new message events, reaction events, unread refresh notifications, and random chat lifecycle events are consumed across pages.

## Linting

```bash
npm run lint
```

ESLint config is in `eslint.config.js`.
