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

<h1 align="center">Proof of Users</h1>

<p>
The photos below show proof of users. What I did was post snapshots of my project system in several BSU groups. 
Surprisingly, many reactions appeared, which eventually corresponded to the server having many active users.
</p>

<p>
Eventually, not all things last forever. The activity slowly died down, but it was worth the shot and the time spent building this project while its relevance lasted.
</p>

<p align="center">
  <img src="../bsuAllChat/frontend/public/screenshots/ActualUse.png" width="80%">
</p>

<p align="center">
  <img src="../bsuAllChat/frontend/public/screenshots/bsuArasof.png" width="80%">
</p>

<p align="center">
  <img src="../bsuAllChat/frontend/public/screenshots/bsuCommunity.png" width="80%">
</p>

<p align="center">
  <img src="../bsuAllChat/frontend/public/screenshots/bsuCommunity2.png" width="80%">
</p>

<p align="center">
  <img src="../bsuAllChat/frontend/public/screenshots/bsuCommunity3.png" width="80%">
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