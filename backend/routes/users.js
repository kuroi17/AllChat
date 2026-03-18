const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Helper function to parse and validate "limit" query parameter for pagination
function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
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
    res.status(500).json({ error: err.message });
  }
});

// GET online users (last_seen within 5 minutes)
router.get("/online", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 10, 300);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, last_seen")
      .gte("last_seen", fiveMinutesAgo)
      .order("last_seen", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH current user presence (requires authentication)
router.patch("/me/presence", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;
    const lastSeen = req.body?.lastSeen || new Date().toISOString();

    const { error } = await db
      .from("profiles")
      .update({ last_seen: lastSeen })
      .eq("id", userId);

    if (error) throw error;
    res.json({ ok: true, lastSeen });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// GET user's followers
router.get("/:userId/followers", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id, profiles:follower_id(username, avatar_url)")
      .eq("following_id", userId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user's following
router.get("/:userId/following", async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from("follows")
      .select("following_id, profiles:following_id(username, avatar_url)")
      .eq("follower_id", userId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(201).json({ message: "Followed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
