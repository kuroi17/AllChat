const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const ONLINE_USERS_CACHE_TTL_MS = 45 * 1000;
const PRESENCE_MIN_WRITE_INTERVAL_MS = 2 * 60 * 1000;

let onlineUsersCache = {
  timestamp: 0,
  data: [],
};

const lastPresenceWriteAtByUserId = new Map();

function prunePresenceWriteMap(now) {
  if (lastPresenceWriteAtByUserId.size < 4000) return;

  const maxAgeMs = 24 * 60 * 60 * 1000;
  for (const [userId, timestamp] of lastPresenceWriteAtByUserId.entries()) {
    if (now - Number(timestamp || 0) > maxAgeMs) {
      lastPresenceWriteAtByUserId.delete(userId);
    }
  }
}

// Helper function to parse and validate "limit" query parameter for pagination
function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function normalizeProfileUsername(rawValue, fallback = "user") {
  const normalized = String(rawValue || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 24);

  if (normalized.length >= 3) {
    return normalized;
  }

  return String(fallback || "user")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 24);
}

function buildDefaultProfilePayload(user) {
  const metadata = user?.user_metadata || {};
  const isGuest = Boolean(user?.is_anonymous || metadata.is_guest === true);
  const fallbackName = isGuest
    ? `guest${String(user?.id || "")
        .replace(/-/g, "")
        .slice(0, 6)}`
    : (user?.id || "user").slice(0, 8);
  const displayName =
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    fallbackName;

  return {
    id: user?.id,
    username: normalizeProfileUsername(displayName, fallbackName),
    bio: "",
    avatar_url: metadata.avatar_url || metadata.picture || "",
    last_seen: new Date().toISOString(),
  };
}

// GET all users (for discovering people)
router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 100, 300);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, department, last_seen")
      .order("last_seen", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET online users (last_seen within 5 minutes)
router.get("/online", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 10, 100);
    const now = Date.now();

    if (
      now - onlineUsersCache.timestamp <= ONLINE_USERS_CACHE_TTL_MS &&
      Array.isArray(onlineUsersCache.data)
    ) {
      return res.json(onlineUsersCache.data.slice(0, limit));
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const queryLimit = Math.max(limit, 50);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, last_seen")
      .gte("last_seen", fiveMinutesAgo)
      .order("last_seen", { ascending: false })
      .limit(queryLimit);

    if (error) throw error;

    onlineUsersCache = {
      timestamp: now,
      data: Array.isArray(data) ? data : [],
    };

    res.json(onlineUsersCache.data.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET current user profile (requires authentication)
router.get("/me/profile", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return res.json(data);
    }

    // Auto-provision profile for newly confirmed users.
    const payload = buildDefaultProfilePayload(req.user);
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (createError) {
      throw createError;
    }

    res.json(created);
  } catch (err) {
    if (err?.code === "42501") {
      return res.status(500).json({
        error:
          "Profile provisioning is blocked by database RLS policy. Apply database/fix_profiles_rls_for_auth.sql.",
      });
    }

    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// PATCH current user presence (requires authentication)
router.patch("/me/presence", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;
    const now = Date.now();
    const lastWriteAt = Number(lastPresenceWriteAtByUserId.get(userId) || 0);

    prunePresenceWriteMap(now);

    if (now - lastWriteAt < PRESENCE_MIN_WRITE_INTERVAL_MS) {
      return res.json({
        ok: true,
        skipped: true,
        reason: "presence_write_throttled",
      });
    }

    const lastSeen = req.body?.lastSeen || new Date(now).toISOString();

    const { error } = await db
      .from("profiles")
      .update({ last_seen: lastSeen })
      .eq("id", userId);

    if (error) throw error;

    lastPresenceWriteAtByUserId.set(userId, now);
    onlineUsersCache.timestamp = 0;

    res.json({ ok: true, lastSeen });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET if authenticated user is following target user
router.get(
  "/:userId/is-following/:targetUserId",
  verifyToken,
  async (req, res) => {
    try {
      const { userId, targetUserId } = req.params;
      const db = req.supabase || supabase;

      if (req.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await db
        .from("follows")
        .select("follower_id")
        .eq("follower_id", userId)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      res.json({ isFollowing: !!data });
    } catch (err) {
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  },
);

// GET user profile by ID
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// UPDATE user profile (requires authentication)
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;
    const db = req.supabase || supabase;

    // Only allow users to update their own profile
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updateData = req.body;

    const { data, error } = await db
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET user's followers
router.get("/:userId/followers", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("follows")
      .select(
        "follower_id, profiles:follower_id(id, username, avatar_url, bio, last_seen)",
      )
      .eq("following_id", userId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET user's following
router.get("/:userId/following", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("follows")
      .select(
        "following_id, profiles:following_id(id, username, avatar_url, bio, last_seen)",
      )
      .eq("follower_id", userId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST follow user (requires authentication)
router.post("/:userId/follow", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.userId;
    const db = req.supabase || supabase;

    if (userId === followerId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const { error } = await db
      .from("follows")
      .insert([{ follower_id: followerId, following_id: userId }]);

    if (error) throw error;

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${userId}`).emit("follow:notify", {
        followerId,
        followingId: userId,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ message: "Followed" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// DELETE unfollow user (requires authentication)
router.delete("/:userId/follow", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const followerId = req.userId;
    const db = req.supabase || supabase;

    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", userId);

    if (error) throw error;
    res.json({ message: "Unfollowed" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
