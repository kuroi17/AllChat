const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET recent messages from global chat
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles:user_id(username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages by room
router.get("/:room", async (req, res) => {
  try {
    const { room } = req.params;
    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles:user_id(username, avatar_url)")
      .eq("room", room)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new message (requires authentication)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { content, room } = req.body;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const cleanedContent = typeof content === "string" ? content.trim() : "";
    const targetRoom =
      typeof room === "string" && room.trim() ? room.trim() : "global";

    // Validation
    if (!cleanedContent) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (cleanedContent.length > 2000) {
      return res.status(400).json({ error: "Message is too long" });
    }

    // Ensure a profile row exists to satisfy FK constraints.
    const { data: existingProfile, error: profileError } = await db
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!existingProfile) {
      const { error: createProfileError } = await db
        .from("profiles")
        .insert([{ id: userId }]);

      // Ignore race-condition duplicates and continue.
      if (createProfileError && createProfileError.code !== "23505") {
        throw createProfileError;
      }
    }

    const { data, error } = await db
      .from("messages")
      .insert([
        {
          user_id: userId,
          content: cleanedContent,
          room: targetRoom,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE message (only sender can delete)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify message belongs to user
    const { data: message, error: fetchError } = await db
      .from("messages")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error: deleteError } = await db
      .from("messages")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
