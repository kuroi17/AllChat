const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");
const {
  createRateLimiter,
  createAntiSpamGuard,
} = require("../middleware/chatGuards");
const {
  chatLimits,
  validateMediaImageUrl,
  enforceDailyMediaQuota,
} = require("../utils/chatLimits");
const { sanitizeProfanity } = require("../utils/profanityFilter");

const router = express.Router();

const MESSAGE_WITH_RELATIONS_SELECT =
  "*, profiles:user_id(username, avatar_url), reactions:message_reactions(user_id, emoji, created_at)";

const createMessageRateLimiter = createRateLimiter({
  scope: "global-message-send",
  windowMs: chatLimits.globalMessageRateWindowMs,
  maxRequests: chatLimits.globalMessageRateMax,
  errorMessage: "Too many messages sent. Please wait a moment and try again.",
});

const createMessageAntiSpamGuard = createAntiSpamGuard({
  scope: "global-message-spam",
  minIntervalMs: chatLimits.globalMessageMinIntervalMs,
  duplicateWindowMs: 12000,
});

async function assertRoomAccess({ db, userId, room }) {
  const targetRoom = room || "global";

  if (targetRoom === "global") {
    return;
  }

  if (!targetRoom.startsWith("room:")) {
    const error = new Error("Invalid room");
    error.status = 400;
    throw error;
  }

  const roomId = targetRoom.replace("room:", "");
  const { data: membership, error: memberError } = await db
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw memberError;

  if (!membership) {
    const error = new Error("Not a room member");
    error.status = 403;
    throw error;
  }
}

async function getMessageRecord(messageId) {
  const { data: message, error } = await supabase
    .from("messages")
    .select("id, room, user_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw error;
  return message;
}

async function fetchMessageWithRelations(messageId) {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_WITH_RELATIONS_SELECT)
    .eq("id", messageId)
    .single();

  if (error) throw error;
  return data;
}

async function fetchMessageReactions(db, messageId) {
  const { data, error } = await db
    .from("message_reactions")
    .select("user_id, emoji, created_at")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// GET recent messages from global chat
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_WITH_RELATIONS_SELECT)
      .order("created_at", { ascending: false })
      .limit(chatLimits.globalMessageFetchLimit);

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

    await assertRoomAccess({ db, userId, room: targetRoom });

    const { data, error } = await supabase
      .from("messages")
      .select(MESSAGE_WITH_RELATIONS_SELECT)
      .eq("room", targetRoom)
      .order("created_at", { ascending: false })
      .limit(chatLimits.globalMessageFetchLimit);

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
      const sanitizedContent = sanitizeProfanity(cleanedContent);
      const targetRoom =
        typeof room === "string" && room.trim() ? room.trim() : "global";
      const mediaValidation = validateMediaImageUrl(imageUrl);
      const cleanedImageUrl = mediaValidation.ok ? mediaValidation.value : "";

      // Validation
      if (!cleanedContent && !cleanedImageUrl) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (cleanedContent.length > chatLimits.globalMessageMaxChars) {
        return res.status(400).json({ error: "Message is too long" });
      }

      if (!mediaValidation.ok) {
        return res
          .status(mediaValidation.status || 400)
          .json({ error: mediaValidation.error });
      }

      await assertRoomAccess({ db, userId, room: targetRoom });

      if (req.body?.replyToMessageId) {
        return res.status(400).json({
          error: "Replies are available only in direct messages.",
        });
      }

      if (cleanedImageUrl) {
        const mediaQuota = await enforceDailyMediaQuota({
          db,
          table: "messages",
          userColumn: "user_id",
          userId,
        });

        if (!mediaQuota.ok) {
          return res
            .status(mediaQuota.status || 429)
            .json({ error: mediaQuota.error });
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
            content: sanitizedContent || "",
            room: targetRoom,
            image_url: cleanedImageUrl || null,
          },
        ])
        .select("id")
        .single();

      if (error) throw error;
      const createdMessage = await fetchMessageWithRelations(data.id);

      const io = req.app.get("io");
      if (io) {
        io.to(`room:${targetRoom}`).emit("message:new", createdMessage);
      }

      res.status(201).json(createdMessage);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  },
);

// POST add reaction to a message
router.post("/:id/reactions", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const rawEmoji = req.body?.emoji;
    const emoji = typeof rawEmoji === "string" ? rawEmoji.trim() : "";

    if (!emoji) {
      return res.status(400).json({ error: "emoji is required" });
    }

    if (emoji.length > 16) {
      return res.status(400).json({ error: "emoji is too long" });
    }

    const message = await getMessageRecord(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const targetRoom = message.room || "global";
    await assertRoomAccess({ db, userId, room: targetRoom });

    const { error: insertError } = await db.from("message_reactions").upsert(
      [
        {
          message_id: id,
          user_id: userId,
          emoji,
        },
      ],
      { onConflict: "message_id,user_id,emoji" },
    );

    if (insertError) throw insertError;

    const reactions = await fetchMessageReactions(db, id);

    const io = req.app.get("io");
    if (io) {
      io.to(`room:${targetRoom}`).emit("message:reaction", {
        messageId: id,
        room: targetRoom,
        reactions,
      });
    }

    res.status(201).json({ messageId: id, reactions });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE remove reaction from a message
router.delete("/:id/reactions", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const rawEmoji = req.body?.emoji;
    const emoji = typeof rawEmoji === "string" ? rawEmoji.trim() : "";

    if (!emoji) {
      return res.status(400).json({ error: "emoji is required" });
    }

    const message = await getMessageRecord(id);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const targetRoom = message.room || "global";
    await assertRoomAccess({ db, userId, room: targetRoom });

    const { error: deleteError } = await db
      .from("message_reactions")
      .delete()
      .eq("message_id", id)
      .eq("user_id", userId)
      .eq("emoji", emoji);

    if (deleteError) throw deleteError;

    const reactions = await fetchMessageReactions(db, id);

    const io = req.app.get("io");
    if (io) {
      io.to(`room:${targetRoom}`).emit("message:reaction", {
        messageId: id,
        room: targetRoom,
        reactions,
      });
    }

    res.json({ messageId: id, reactions });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
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
