# Auto-Delete Old Messages - Setup Guide

## What This Does

**Problem:** Loading ALL messages every time is slow and wastes database resources.

**Solution:**

1. ✅ Load only last 100 messages (fast & efficient)
2. ✅ Auto-delete messages older than 1 day (keeps DB clean)

This is how Discord, Telegram, Slack handle global chats!

---

## Setup (Takes 5 minutes)

### Step 1: Install Supabase CLI

```powershell
npm install -g supabase
```

### Step 2: Login & Link Your Project

```powershell
supabase login
```

Then link to your project (get YOUR_PROJECT_REF from your Supabase dashboard URL):

```powershell
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3: Deploy the Cleanup Function

```powershell
supabase functions deploy cleanup-old-messages
```

### Step 4: Schedule Daily Auto-Cleanup

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-messages-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.functions.supabase.co/cleanup-old-messages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}' ::jsonb
  );
  $$
);
```

**Replace these:**

- `YOUR_PROJECT_REF` → From your Supabase project URL
- `YOUR_SERVICE_ROLE_KEY` → Dashboard → Settings → API → service_role key (secret!)

---

## Test It Works

```powershell
# Test the function manually
curl -X POST https://YOUR_PROJECT_REF.functions.supabase.co/cleanup-old-messages `
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Check the response - it should show how many messages were deleted!

---

## Monitor & Adjust

### View Logs

Dashboard → Edge Functions → cleanup-old-messages → Logs

### Change Retention Period

Want to keep messages longer? Edit `supabase/functions/cleanup-old-messages/index.ts` line 18:

```typescript
// Keep for 7 days instead of 1
oneDayAgo.setDate(oneDayAgo.getDate() - 7);
```

Then redeploy:

```powershell
supabase functions deploy cleanup-old-messages
```

---

## How It Saves You

- **Before:** Loading 10,000+ messages = slow & expensive
- **After:** Loading 100 messages = instant & free tier friendly ⚡

Your database will NEVER bloat! 🚀
