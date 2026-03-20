# Changelog

All notable changes to BSU AllChat are documented in this file.

## [2.0.0] - 2026-03-20

### Why 2.0.0

- Major platform shift from MVP architecture to a dedicated full-stack runtime.
- Deployment is now breaking compared with v1.0.0: frontend expects a Node.js API + Socket.IO server.

### Breaking Changes

- Added mandatory backend service (`backend/server.js`) for REST APIs and Socket.IO realtime.
- Frontend now depends on `VITE_API_URL` for API and realtime endpoints.
- Repository structure now includes dedicated `frontend/` and `backend/` app boundaries.

### Added

- Socket.IO realtime pipeline for global chat and direct messages.
- Node.js/Express REST routes for chat, DM, users, events, and announcements.
- Guardrails for abuse prevention (rate limiting + anti-spam checks).
- DM typing indicator.
- DM mobile long-press message actions (Messenger-style alternative to desktop menu trigger).
- Global chat visible send cooldown indicator.

### Changed

- Migrated chat and DM transport from direct client-only flows to backend-mediated flows.
- Improved notification and unread badge behavior with socket user-event alignment.
- DM send behavior now mirrors Messenger for mixed payloads:
  - Text and image sent together are emitted as separate message cards.
- DM message rendering upgraded for long text and constrained mobile media cards.

### Fixed

- DM optimistic + realtime dedupe issues.
- DM message options menu alignment and hover visibility issues.
- DM unsend consistency, including deleted-placeholder persistence across refresh.
- DM send latency feel for text messages via optimistic rendering + tuned send guard.
- Conversation navigation from user profiles.

### Performance

- Faster initial hydration/load behavior in global chat and direct messages.

---

## [1.0.0] - 2026-03-17

### Release Type

- MVP release.

### Highlights

- Global Chat with Supabase-backed realtime messaging.
- Direct Messages with unread indicators, media support, and unsend actions.
- Auth flows: email/password, Google OAuth, protected routing, password reset/change.
- Dynamic user profiles, follow/follower system, and notifications.
- Responsive/mobile-first UI with DM info panel and mobile nav support.
- Settings with persistent user preferences.
- Supabase RLS policies and SQL migration groundwork.

### Corrected Notes (vs original release text)

- Campus Info was not purely static in v1.0.0:
  - It already supported dynamic fetch for events/announcements with static fallback cards when no data existed.

---

## Versioning Policy

- Major (`x.0.0`): breaking runtime/deployment or architecture shifts.
- Minor (`x.y.0`): backward-compatible feature additions.
- Patch (`x.y.z`): fixes and internal quality improvements.
