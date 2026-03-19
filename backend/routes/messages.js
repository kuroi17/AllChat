const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");
const {
  createRateLimiter,
  createAntiSpamGuard,
} = require("../middleware/chatGuards");

const router = express.Router();

const createMessageRateLimiter = createRateLimiter({
  scope: "global-message-send",
  windowMs: 10000,
  maxRequests: 8,
  errorMessage: "Too many messages sent. Please wait a moment and try again.",
});

const createMessageAntiSpamGuard = createAntiSpamGuard({
  scope: "global-message-spam",
  minIntervalMs: 700,
  duplicateWindowMs: 12000,
});

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
router.post(
  "/",
  verifyToken,
  createMessageRateLimiter,
  createMessageAntiSpamGuard,
  async (req, res) => {
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
      const createdMessage = data[0];

      const io = req.app.get("io");
      if (io) {
        io.to(`room:${targetRoom}`).emit("message:new", createdMessage);
      }

      res.status(201).json(createdMessage);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// DELETE message (only sender can delete)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify message belongs to user
    const { data: message, error: fetchError } = await db
      .from("messages")
      .select("user_id, room, profiles:user_id(username)")
      .eq("id", id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.user_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const deletedAt = new Date().toISOString();
    let deletionMode = "soft";

    // Prefer soft delete when schema supports deleted_at; otherwise fallback to hard delete.
    const { error: updateError } = await db
      .from("messages")
      .update({ deleted_at: deletedAt })
      .eq("id", id);

    if (updateError) {
      const missingDeletedAtColumn =
        typeof updateError.message === "string" &&
        updateError.message.includes("deleted_at");

      if (!missingDeletedAtColumn) throw updateError;

      deletionMode = "hard";

      const { error: hardDeleteError } = await db
        .from("messages")
        .delete()
        .eq("id", id);

      if (hardDeleteError) throw hardDeleteError;
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`room:${message.room || "global"}`).emit("message:deleted", {
        id,
        room: message.room || "global",
        senderUsername: message.profiles?.username || "User",
        deletedAt,
        deletionMode,
      });
    }

    res.json({ message: "Message deleted", deletionMode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
