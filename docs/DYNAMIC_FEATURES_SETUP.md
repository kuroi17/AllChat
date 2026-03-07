# Dynamic Features Setup Guide

Complete guide to set up and test the new dynamic features: Online Presence, Following, Direct Messages, and Campus Info.

---

## What's Been Made Dynamic?

### ✅ 1. Online Now (Right Panel)

- Shows users who were active in the last 5 minutes
- Auto-refreshes every 30 seconds
- Displays avatar or colored initial
- Shows green dot for online users

### ✅ 2. Following (Left Sidebar)

- Shows users you're actually following from the database
- Clickable to view user profiles
- Empty state when not following anyone

### ✅ 3. Direct Messages (Left Sidebar)

- Shows real DM conversations
- Displays unread message count
- Shows online status of conversation partner
- Empty state when no conversations

### ✅ 4. Campus Info (Right Panel)

- Displays upcoming events from database
- Shows latest announcements
- Falls back to static data if database is empty

---

## Setup Instructions

### Step 1: Run Database Migration

1. Open **Supabase Dashboard** → **SQL Editor**
2. Create new query
3. Copy and paste contents from `database_migration.sql`
4. Click **Run** (or Ctrl+Enter)
5. Wait for success message

This creates:

- `last_seen` column in profiles
- `conversations`, `conversation_participants`, `direct_messages` tables
- `campus_events`, `announcements` tables
- Indexes for performance
- Row Level Security (RLS) policies

### Step 2: Insert Sample Data (Optional but Recommended)

1. In Supabase SQL Editor, create another new query
2. Copy and paste contents from `sample_data.sql`
3. Click **Run**

This adds:

- 3 sample campus events
- 3 sample announcements
- Sets some users as "online" for testing

### Step 3: Test the Features

1. **Start your dev server:**

   ```bash
   npm run dev
   ```

2. **Open the app:**
   - Go to http://localhost:5173
   - Sign in with your account

3. **Test Online Presence:**
   - You should appear in "Online Now" section (right panel)
   - Open app in another browser/incognito with different account
   - Both users should show as online

4. **Test Following:**
   - To follow someone, run in SQL Editor:
     ```sql
     INSERT INTO follows (follower_id, following_id) VALUES
     ('your-user-id', 'other-user-id');
     ```
   - Replace with actual user IDs from Authentication > Users
   - Refresh app - should see user in "Following" section

5. **Test Direct Messages:**
   - To create a test DM conversation:
     ```sql
     -- Get or remember two user IDs from your profiles table
     -- Then run this to create a conversation:
     WITH new_conv AS (
       INSERT INTO conversations DEFAULT VALUES
       RETURNING id
     )
     INSERT INTO conversation_participants (conversation_id, user_id)
     SELECT id, unnest(ARRAY['user-id-1'::uuid, 'user-id-2'::uuid])
     FROM new_conv;
     ```
   - Then insert a message:
     ```sql
     INSERT INTO direct_messages (conversation_id, sender_id, content)
     VALUES ('conversation-id-here', 'sender-id', 'Hello!');
     ```
   - Refresh app - should see conversation in "Direct Messages"

6. **Test Campus Info:**
   - Should see events and announcements from sample data
   - Right panel should display "Hackathon 2024" and other events

---

## How It Works

### Online Presence Tracking

**UserContext.jsx** automatically:

- Updates `last_seen` timestamp every 2 minutes
- Updates on mouse move, keyboard input, clicks
- Provides presence data to all components

**RightPanel.jsx**:

- Fetches users with `last_seen` within last 5 minutes
- Refreshes every 30 seconds
- Shows green dot for online users

### Following System

**Sidebar.jsx**:

- Fetches `follows` table for current user
- Shows top 5 followed users
- Displays avatar and username
- Links to user profile pages

### Direct Messages

**Sidebar.jsx**:

- Fetches all conversations for current user
- Shows other participant info
- Displays unread count
- Links to DM conversation view (to be implemented)

### Campus Info

**RightPanel.jsx**:

- Fetches upcoming events (future dates only)
- Fetches latest announcements
- Falls back to static content if empty

---

## Adding Real Data

### Add a Campus Event

Run in SQL Editor:

```sql
INSERT INTO campus_events (title, description, event_date, location)
VALUES (
  'Your Event Title',
  'Event description here',
  '2026-04-01 10:00:00+00',  -- Adjust date/time
  'Location Name'
);
```

### Add an Announcement

```sql
INSERT INTO announcements (title, content)
VALUES (
  'Announcement Title',
  'Your announcement message here'
);
```

### Follow a User

```sql
-- Get user IDs from Authentication > Users in Supabase Dashboard
INSERT INTO follows (follower_id, following_id)
VALUES (
  'your-user-id-here',
  'user-to-follow-id-here'
);
```

### Create a DM Conversation

Use the helper function in your code:

```javascript
import { getOrCreateConversation, sendDirectMessage } from "./utils/social";

// Create/get conversation
const conversationId = await getOrCreateConversation(userId1, userId2);

// Send a message
await sendDirectMessage({
  conversationId,
  senderId: currentUserId,
  content: "Hello!",
});
```

---

## Troubleshooting

### "No one online right now"

- **Cause:** No users have `last_seen` within last 5 minutes
- **Fix:** Open the app and move your mouse - your presence will update
- **Manual fix:** Run in SQL Editor:
  ```sql
  UPDATE profiles SET last_seen = NOW() WHERE id = 'your-user-id';
  ```

### "Not following anyone yet"

- **Cause:** No rows in `follows` table
- **Fix:** Add follows using SQL queries above

### "No conversations yet"

- **Cause:** No DM conversations created
- **Fix:** Use the SQL queries above or implement DM UI to create conversations

### No events/announcements showing

- **Cause:** Tables are empty
- **Fix:** Run `sample_data.sql` or insert your own data

### RLS Policy Errors

- **Cause:** Row Level Security preventing access
- **Fix:** Make sure you're authenticated and check policies in database_migration.sql

---

## Next Steps

### 🚀 Upcoming Features to Implement

1. **DM Chat UI** - Full page for direct message conversations
2. **User Profile Pages** - View and edit user profiles
3. **Follow/Unfollow Buttons** - UI to follow users from profile pages
4. **Event Registration** - Allow users to register for events
5. **Admin Panel** - Create events/announcements from UI
6. **Notifications** - Real-time notifications for DMs and mentions
7. **Search** - Search users, events, messages

### 📊 Monitor Performance

Check these in Supabase Dashboard > Database > Logs:

- Query performance
- RLS policy execution times
- Index usage

### 🔒 Security Checklist

- ✅ RLS enabled on all new tables
- ✅ Users can only see their own conversations
- ✅ Users can only send DMs in conversations they're part of
- ✅ Anyone can view public events/announcements
- ⚠️ Add admin role check for creating events/announcements (optional)

---

## API Reference

All functions are in **src/utils/social.js**:

### Presence

- `updatePresence(userId)` - Update last_seen
- `fetchOnlineUsers(limit)` - Get online users
- `isUserOnline(lastSeen)` - Check if user is online

### Following

- `followUser(followingId)` - Follow a user
- `unfollowUser(followingId)` - Unfollow a user
- `fetchFollowing(userId)` - Get users you follow
- `fetchFollowers(userId)` - Get your followers
- `isFollowing(userId, targetUserId)` - Check follow status

### Direct Messages

- `getOrCreateConversation(userId1, userId2)` - Get/create DM conversation
- `fetchConversations(userId)` - Get all conversations
- `sendDirectMessage({ conversationId, senderId, content })` - Send DM
- `fetchDirectMessages(conversationId, limit)` - Get messages
- `markConversationAsRead(conversationId, userId)` - Mark as read

### Campus Info

- `fetchCampusEvents(limit)` - Get upcoming events
- `fetchAnnouncements(limit)` - Get announcements
- `createCampusEvent({ title, description, eventDate, location })` - Create event
- `createAnnouncement({ title, content })` - Create announcement

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase Dashboard > Logs
3. Verify RLS policies are correct
4. Ensure tables were created successfully
5. Check that sample data was inserted

All features are now dynamic and ready for testing! 🎉
