const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// GET public rooms (limited)
router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 20, 200);
    const { data, error } = await supabase
      .from("public_rooms")
      .select("*, profiles:creator_id(username, avatar_url)")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single room
router.get("/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { data, error } = await supabase
      .from("public_rooms")
      .select("*, profiles:creator_id(username, avatar_url)")
      .eq("id", roomId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a room (authenticated users)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      isPublic = true,
      capacity,
    } = req.body;
    const createdBy = req.userId;
    const db = req.supabase || supabase;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const { data, error } = await db
      .from("public_rooms")
      .insert([
        {
          title,
          description,
          location,
          is_public: !!isPublic,
          capacity: capacity || null,
          creator_id: createdBy,
        },
      ])
      .select();

    if (error) throw error;

    const room = data && data[0] ? data[0] : null;
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a room (increments participant_count atomically via RPC)
router.post("/:roomId/join", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase.rpc("increment_room_participants", {
      p_room_id: roomId,
    });

    if (error) throw error;

    const participantCount =
      Array.isArray(data) && data[0] ? data[0].participant_count : null;

    // Broadcast update over Socket.IO if available
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("rooms:updated", { roomId, participantCount });
      }
    } catch (e) {
      // ignore socket errors
    }

    res.json({ participantCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room (owner only)
router.delete("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify owner
    const { data: room, error: fetchError } = await db
      .from("public_rooms")
      .select("creator_id")
      .eq("id", roomId)
      .single();

    if (fetchError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.creator_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await db.from("public_rooms").delete().eq("id", roomId);
    if (error) throw error;

    res.json({ message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
