const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// GET all upcoming events
router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 20, 100);
    const { data, error } = await supabase
      .from("campus_events")
      .select("*, profiles:created_by(username, avatar_url)")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// GET single event by ID
router.get("/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { data, error } = await supabase
      .from("campus_events")
      .select("*, profiles:created_by(username, avatar_url)")
      .eq("id", eventId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST new event (requires authentication)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, eventDate, location } = req.body;
    const createdBy = req.userId;
    const db = req.supabase || supabase;

    if (!title || !eventDate) {
      return res
        .status(400)
        .json({ error: "Title and eventDate are required" });
    }

    const { data, error } = await db
      .from("campus_events")
      .insert([
        {
          title,
          description,
          event_date: eventDate,
          location,
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

// UPDATE event (only creator can update)
router.put("/:eventId", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify user is creator
    const { data: event, error: fetchError } = await db
      .from("campus_events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data, error } = await db
      .from("campus_events")
      .update(req.body)
      .eq("id", eventId)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// DELETE event (only creator can delete)
router.delete("/:eventId", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify user is creator
    const { data: event, error: fetchError } = await db
      .from("campus_events")
      .select("created_by")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.created_by !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await db.from("campus_events").delete().eq("id", eventId);

    if (error) throw error;
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;
