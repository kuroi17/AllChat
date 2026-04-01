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
  minIntervalMs: 3000,
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
router.get("/:room", verifyToken, async (req, res) => {
  try {
    const { room } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const targetRoom = room || "global";

    if (targetRoom !== "global" && targetRoom.startsWith("room:")) {
      const roomId = targetRoom.replace("room:", "");
      const { data: membership, error: memberError } = await db
        .from("room_members")
        .select("room_id")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError) throw memberError;

      if (!membership) {
        return res.status(403).json({ error: "Not a room member" });
      }
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles:user_id(username, avatar_url)")
      .eq("room", targetRoom)
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
      const { content, room, imageUrl } = req.body;
      const userId = req.userId;
      const db = req.supabase || supabase;
      const cleanedContent = typeof content === "string" ? content.trim() : "";
      const targetRoom =
        typeof room === "string" && room.trim() ? room.trim() : "global";
      const cleanedImageUrl =
        typeof imageUrl === "string" ? imageUrl.trim() : "";

      // Validation
      if (!cleanedContent && !cleanedImageUrl) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (cleanedContent.length > 2000) {
        return res.status(400).json({ error: "Message is too long" });
      }

      if (targetRoom !== "global" && targetRoom.startsWith("room:")) {
        const roomId = targetRoom.replace("room:", "");
        const { data: membership, error: memberError } = await db
          .from("room_members")
          .select("room_id")
          .eq("room_id", roomId)
          .eq("user_id", userId)
          .maybeSingle();

        if (memberError) throw memberError;

        if (!membership) {
          return res.status(403).json({ error: "Not a room member" });
        }
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
            content: cleanedContent || "",
            room: targetRoom,
            image_url: cleanedImageUrl || null,
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

    const isRoomMessage =
      typeof message.room === "string" && message.room.startsWith("room:");

    if (isRoomMessage) {
      const { error: updateError } = await db
        .from("messages")
        .update({
          content: "__BSUALLCHAT_ROOM_DELETED__",
          image_url: null,
        })
        .eq("id", id);

      if (updateError) throw updateError;
    } else {
      // Hard delete for global chat (UI expects removed messages)
      const { error: deleteError } = await db
        .from("messages")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`room:${message.room || "global"}`).emit("message:deleted", {
        id,
        room: message.room || "global",
        senderUsername: message.profiles?.username || "User",
      });
    }

    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
