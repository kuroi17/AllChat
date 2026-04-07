const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// GET all announcements
router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 50, 200);
    const { data, error } = await supabase
      .from("announcements")
      .select("*, profiles:created_by(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET single announcement by ID
router.get("/:announcementId", async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { data, error } = await supabase
      .from("announcements")
      .select("*, profiles:created_by(username, avatar_url)")
      .eq("id", announcementId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST new announcement (requires authentication)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    const createdBy = req.userId;
    const db = req.supabase || supabase;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const { data, error } = await db
      .from("announcements")
      .insert([
        {
          title,
          content,
          created_by: createdBy,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// UPDATE announcement (only creator can update)
router.put("/:announcementId", verifyToken, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify user is creator
    const { data: announcement, error: fetchError } = await db
      .from("announcements")
      .select("created_by")
      .eq("id", announcementId)
      .single();

    if (fetchError || !announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    if (announcement.created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data, error } = await db
      .from("announcements")
      .update(req.body)
      .eq("id", announcementId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// DELETE announcement (only creator can delete)
router.delete("/:announcementId", verifyToken, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify user is creator
    const { data: announcement, error: fetchError } = await db
      .from("announcements")
      .select("created_by")
      .eq("id", announcementId)
      .single();

    if (fetchError || !announcement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    if (announcement.created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await db
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) throw error;
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
