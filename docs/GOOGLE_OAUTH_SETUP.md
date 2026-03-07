# Google OAuth Integration Guide

Complete step-by-step guide to add Google OAuth to your bsuAllChat app.

---

## Step 1: Set Up Google OAuth Credentials

### 1.1 Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. Sign in with your Google account
3. Create a new project or select existing one:
   - Click the project dropdown at the top
   - Click "New Project"
   - Name it: `bsuAllChat` or similar
   - Click "Create"

### 1.2 Enable Google+ API (Optional for profile info)

1. In the search bar, type "Google+ API"
2. Click "Enable"

### 1.3 Configure OAuth Consent Screen

1. Go to: **APIs & Services** → **OAuth consent screen** (left sidebar)
2. Choose **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the form:
   - **App name:** `Campus Global Chat`
   - **User support email:** Your email
   - **App logo:** (optional, can skip for now)
   - **Authorized domains:** Leave empty for now
   - **Developer contact email:** Your email
5. Click **Save and Continue**
6. **Scopes:** Click **Add or Remove Scopes**
   - Select: `userinfo.email`
   - Select: `userinfo.profile`
   - Click **Update** → **Save and Continue**
7. **Test users:** (If in Testing mode)
   - Add your email and other test users
   - Click **Save and Continue**
8. Click **Back to Dashboard**

### 1.4 Create OAuth 2.0 Credentials

1. Go to: **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Choose **Application type:** `Web application`
4. Fill in:
   - **Name:** `bsuAllChat Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:5173
     ```
   - **Authorized redirect URIs:**
     ```
     https://isvykxiszyhaupmydzrv.supabase.co/auth/v1/callback
     ```
     (Replace `isvykxiszyhaupmydzrv` with your Supabase project ref from `.env`)
5. Click **Create**
6. **IMPORTANT:** Copy and save:
   - **Client ID** (looks like: `123456789-abc...googleusercontent.com`)
   - **Client Secret** (keep this secret!)

---

## Step 2: Configure Google Provider in Supabase

### 2.1 Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project: `bsuAllChat`

### 2.2 Enable Google Provider

1. Go to: **Authentication** → **Providers** (left sidebar)
2. Find **Google** in the list
3. Toggle it **ON** (enable)
4. Fill in:
   - **Client ID:** (paste from Google Cloud Console)
   - **Client Secret:** (paste from Google Cloud Console)
5. Click **Save**

### 2.3 Verify Redirect URL

- Supabase will show you the redirect URL
- Make sure it matches what you added in Google Cloud Console:
  ```
  https://isvykxiszyhaupmydzrv.supabase.co/auth/v1/callback
  ```

---

## Step 3: Update Your Code

### 3.1 Add Google Sign-In Button to Auth.jsx

The code has been updated with a "Continue with Google" button.

### 3.2 How It Works

- Clicking "Continue with Google" calls `supabase.auth.signInWithOAuth()`
- User is redirected to Google for authentication
- After approval, Google redirects back to your app
- Supabase creates the user account automatically
- Profile is auto-created via trigger or in code

---

## Step 4: Test Google OAuth

### 4.1 Start Your Dev Server

```bash
npm run dev
```

### 4.2 Test Login Flow

1. Go to: http://localhost:5173/auth
2. Click **"Continue with Google"** button
3. Choose your Google account
4. Approve permissions (email, profile)
5. You should be redirected back to your app
6. Check if you're logged in (should redirect to `/` - GlobalChat)

### 4.3 Verify User in Supabase

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. You should see your new user with:
   - Provider: `google`
   - Email: Your Google email
   - Last sign in: Just now

### 4.4 Verify Profile Created

1. Go to Supabase Dashboard → **Database** → **Table Editor** → **profiles**
2. Check if a profile row was created for your user_id
3. If not, check the profile creation logic in your code

---

## Step 5: Production Deployment

### 5.1 Update Google Cloud Console

When deploying to production (e.g., Vercel, Netlify):

1. Go back to Google Cloud Console → **Credentials**
2. Edit your OAuth client
3. Add production URLs:
   - **Authorized JavaScript origins:**
     ```
     https://yourdomain.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://isvykxiszyhaupmydzrv.supabase.co/auth/v1/callback
     ```
4. Click **Save**

### 5.2 Update OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Click **Publish App** (to go from Testing to Production)
3. Submit for verification if needed (for public launch)

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

- **Cause:** Redirect URI doesn't match what's configured in Google Cloud Console
- **Fix:** Make sure the redirect URI in Google Cloud Console exactly matches:
  ```
  https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
  ```

### Error: "Access blocked: This app's request is invalid"

- **Cause:** OAuth consent screen not configured
- **Fix:** Complete Step 1.3 (Configure OAuth Consent Screen)

### User signs in but no profile created

- **Cause:** Profile isn't auto-created on OAuth sign-in
- **Fix:** Check `Auth.jsx` - the `handleGoogleSignIn` function should create a profile after successful sign-in

### "This app isn't verified" warning

- **Expected:** Normal in testing mode
- **Action:** Click "Advanced" → "Go to Campus Global Chat (unsafe)" during development
- **Fix for production:** Submit your app for Google verification

---

## Security Best Practices

1. **Never commit secrets:**
   - Don't add Client Secret to your code or `.env` file in Git
   - Keep it only in Supabase Dashboard

2. **Use HTTPS in production:**
   - Google OAuth requires HTTPS for production domains

3. **Restrict redirect URIs:**
   - Only add exact URLs you control
   - Never use wildcards like `https://*.vercel.app`

4. **Test mode vs Production:**
   - Keep in Test mode during development
   - Publish to Production only when ready for public use

---

## Next Steps

✅ Google OAuth is now integrated!

**Optional enhancements:**

- Add Facebook OAuth
- Add GitHub OAuth
- Add Discord OAuth
- Show user's Google avatar in profile
- Pre-fill username from Google display name

---

## Quick Reference

**Your Supabase Project:**

- URL: `https://isvykxiszyhaupmydzrv.supabase.co`
- Redirect URI: `https://isvykxiszyhaupmydzrv.supabase.co/auth/v1/callback`

**Google Cloud Console:**

- https://console.cloud.google.com/apis/credentials

**Supabase Dashboard:**

- https://supabase.com/dashboard/project/isvykxiszyhaupmydzrv/auth/providers
