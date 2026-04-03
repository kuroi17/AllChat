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

const DM_MESSAGE_BASE_SELECT = "*, profiles:sender_id(username, avatar_url)";
const DM_MESSAGE_WITH_RELATIONS_SELECT =
  "*, profiles:sender_id(username, avatar_url), reply_message:reply_to_message_id(id, sender_id, content, image_url, created_at, profiles:sender_id(username, avatar_url)), reactions:direct_message_reactions(user_id, emoji, created_at)";

const createDirectMessageRateLimiter = createRateLimiter({
  scope: "direct-message-send",
  windowMs: chatLimits.directMessageRateWindowMs,
  maxRequests: chatLimits.directMessageRateMax,
  errorMessage:
    "Too many direct messages sent. Please wait a moment and try again.",
});

const createDirectMessageAntiSpamGuard = createAntiSpamGuard({
  scope: "direct-message-spam",
  minIntervalMs: chatLimits.directMessageMinIntervalMs,
  duplicateWindowMs: 10000,
});

const createConversationRateLimiter = createRateLimiter({
  scope: "direct-message-conversation-create",
  windowMs: 60000,
  maxRequests: 12,
  errorMessage:
    "Too many conversation requests. Please wait a moment and try again.",
});

const deleteDirectMessageRateLimiter = createRateLimiter({
  scope: "direct-message-delete",
  windowMs: 10000,
  maxRequests: 20,
  errorMessage:
    "Too many message delete requests. Please slow down and try again.",
});

const deleteConversationRateLimiter = createRateLimiter({
  scope: "direct-message-conversation-delete",
  windowMs: 60000,
  maxRequests: 6,
  errorMessage:
    "Too many conversation delete requests. Please wait before trying again.",
});

const DELETED_MESSAGE_MARKER = "__BSUALLCHAT_DM_DELETED__";

function buildDeletedMessageContent(username = "User") {
  const safeUsername =
    typeof username === "string"
      ? username.replace(/:/g, "").trim().slice(0, 80)
      : "User";
  return `${DELETED_MESSAGE_MARKER}:${safeUsername || "User"}`;
}

function parseDeletedByUsername(content) {
  if (typeof content !== "string") return null;
  if (!content.startsWith(DELETED_MESSAGE_MARKER)) return null;

  const suffix = content.slice(DELETED_MESSAGE_MARKER.length + 1).trim();
  return suffix || null;
}

function normalizeDeletedMessagePayload(message) {
  if (!message || typeof message.content !== "string") return message;
  if (!message.content.startsWith(DELETED_MESSAGE_MARKER)) return message;

  return {
    ...message,
    content: DELETED_MESSAGE_MARKER,
    image_url: null,
    deletedByUsername:
      parseDeletedByUsername(message.content) ||
      message?.profiles?.username ||
      "User",
  };
}

// this function is used to parse and validate the "limit" query parameter for pagination
// it ensures the limit is a positive number and doesn't exceed the maximum allowed value
function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function getDirectMessageRecord(db, messageId) {
  const { data, error } = await db
    .from("direct_messages")
    .select("id, conversation_id, sender_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function fetchDirectMessageWithRelations(db, messageId) {
  const { data, error } = await db
    .from("direct_messages")
    .select(DM_MESSAGE_WITH_RELATIONS_SELECT)
    .eq("id", messageId)
    .single();

  if (!error) {
    return {
      ...data,
      reply_message: data?.reply_message || null,
      reactions: Array.isArray(data?.reactions) ? data.reactions : [],
    };
  }

  // Allow read operations to keep working before the DM reactions/replies migration is applied.
  if (error.code !== "PGRST200") {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await db
    .from("direct_messages")
    .select(DM_MESSAGE_BASE_SELECT)
    .eq("id", messageId)
    .single();

  if (fallbackError) throw fallbackError;

  return {
    ...fallbackData,
    reply_message: null,
    reactions: [],
  };
}

async function fetchConversationMessagesWithRelations(
  db,
  conversationId,
  limit,
) {
  const { data, error } = await db
    .from("direct_messages")
    .select(DM_MESSAGE_WITH_RELATIONS_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!error) {
    return (data || []).map((message) => ({
      ...message,
      reply_message: message?.reply_message || null,
      reactions: Array.isArray(message?.reactions) ? message.reactions : [],
    }));
  }

  if (error.code !== "PGRST200") {
    throw error;
  }

  const { data: fallbackData, error: fallbackError } = await db
    .from("direct_messages")
    .select(DM_MESSAGE_BASE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (fallbackError) throw fallbackError;

  return (fallbackData || []).map((message) => ({
    ...message,
    reply_message: null,
    reactions: [],
  }));
}

async function fetchDirectMessageReactions(db, messageId) {
  const { data, error } = await db
    .from("direct_message_reactions")
    .select("user_id, emoji, created_at")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// Helper function to ensure a user is a participant in a conversation
async function ensureConversationParticipant(db, conversationId, userId) {
  const { data: participant, error } = await db
    .from("conversation_participants")
    .select("conversation_id, user_id, last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return participant;
}

// Helper function to get conversation summary (other user info, last message, unread count)
async function getConversationSummary(db, conversationId, userId, lastReadAt) {
  const { data: participants, error: participantsError } = await db
    .from("conversation_participants")
    .select(
      "user_id, profiles:user_id(id, username, avatar_url, bio, last_seen)",
    )
    .eq("conversation_id", conversationId)
    .neq("user_id", userId)
    .limit(1);

  if (participantsError) throw participantsError;

  // Get the most recent message in the conversation

  const { data: lastMessage, error: lastMessageError } = await db
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessageError) throw lastMessageError;

  // Count unread messages for the current user

  const { count: unreadCount, error: unreadError } = await db
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .gt("created_at", lastReadAt || "1970-01-01")
    .neq("sender_id", userId);

  if (unreadError) throw unreadError;

  // Also fetch conversation metadata for sorting by recent activity

  const { data: conversationMeta, error: conversationMetaError } = await db
    .from("conversations")
    .select("updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationMetaError) throw conversationMetaError;

  return {
    conversationId,
    otherUser: participants?.[0]?.profiles || null,
    lastMessage: lastMessage
      ? normalizeDeletedMessagePayload(lastMessage)
      : null,
    unreadCount: unreadCount || 0,
    updatedAt: conversationMeta?.updated_at || null,
  };
}

// GET total unread count across all conversations
router.get("/conversations/unread-count", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;

    const { data: conversations, error: conversationsError } = await db
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (conversationsError) throw conversationsError;

    const counts = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await db
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.conversation_id)
          .gt("created_at", conv.last_read_at || "1970-01-01")
          .neq("sender_id", userId);

        return count || 0;
      }),
    );

    const total = counts.reduce((sum, count) => sum + count, 0);
    res.json({ count: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET conversation context (other user profile)
router.get(
  "/conversations/:conversationId/context",
  verifyToken,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.userId;
      const db = req.supabase || supabase;

      const participant = await ensureConversationParticipant(
        db,
        conversationId,
        userId,
      );

      if (!participant) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const summary = await getConversationSummary(
        db,
        conversationId,
        userId,
        participant.last_read_at,
      );

      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET shared media for a conversation
router.get(
  "/conversations/:conversationId/media",
  verifyToken,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.userId;
      const db = req.supabase || supabase;
      const limit = parseLimit(req.query.limit, 12, 100);

      const participant = await ensureConversationParticipant(
        db,
        conversationId,
        userId,
      );

      if (!participant) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { data, error } = await db
        .from("direct_messages")
        .select("id, conversation_id, sender_id, image_url, created_at")
        .eq("conversation_id", conversationId)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// PATCH mark conversation as read for current user
router.patch(
  "/conversations/:conversationId/read",
  verifyToken,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.userId;
      const db = req.supabase || supabase;
      const timestamp = req.body?.lastReadAt || new Date().toISOString();

      const participant = await ensureConversationParticipant(
        db,
        conversationId,
        userId,
      );

      if (!participant) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { error } = await db
        .from("conversation_participants")
        .update({ last_read_at: timestamp })
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (error) throw error;
      res.json({ ok: true, lastReadAt: timestamp });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST get or create a conversation with target user
router.post(
  "/conversations/get-or-create",
  verifyToken,
  createConversationRateLimiter,
  async (req, res) => {
    try {
      const userId = req.userId;
      const adminDb = supabase;
      const targetUserId = req.body?.targetUserId;

      if (!targetUserId) {
        return res.status(400).json({ error: "targetUserId is required" });
      }

      if (targetUserId === userId) {
        return res
          .status(400)
          .json({ error: "Cannot start conversation with yourself" });
      }

      const { data: targetProfile, error: targetProfileError } = await adminDb
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetProfileError) throw targetProfileError;
      if (!targetProfile) {
        return res.status(404).json({ error: "Target user not found" });
      }

      const [
        { data: currentUserConversations, error: currentUserError },
        { data: targetUserConversations, error: targetUserError },
      ] = await Promise.all([
        adminDb
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId),
        adminDb
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", targetUserId),
      ]);

      if (currentUserError) throw currentUserError;
      if (targetUserError) throw targetUserError;

      const targetConversationIds = new Set(
        (targetUserConversations || []).map((row) => row.conversation_id),
      );

      const existingConversation = (currentUserConversations || []).find(
        (row) => targetConversationIds.has(row.conversation_id),
      );

      if (existingConversation?.conversation_id) {
        return res.json({
          conversationId: existingConversation.conversation_id,
          created: false,
        });
      }

      const { data: conversation, error: conversationError } = await adminDb
        .from("conversations")
        .insert({})
        .select("id")
        .single();

      if (conversationError) throw conversationError;

      const { error: participantsError } = await adminDb
        .from("conversation_participants")
        .insert([
          { conversation_id: conversation.id, user_id: userId },
          { conversation_id: conversation.id, user_id: targetUserId },
        ]);

      if (participantsError) {
        // Best effort cleanup if participant insert fails.
        await adminDb.from("conversations").delete().eq("id", conversation.id);

        if (participantsError.code === "42501") {
          return res.status(500).json({
            error:
              "Server is missing service-role permissions for direct messages.",
          });
        }

        throw participantsError;
      }

      res.status(201).json({ conversationId: conversation.id, created: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// DELETE a conversation for participants (and cascade messages)
router.delete(
  "/conversations/:conversationId",
  verifyToken,
  deleteConversationRateLimiter,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.userId;
      const db = req.supabase || supabase;

      const participant = await ensureConversationParticipant(
        db,
        conversationId,
        userId,
      );

      if (!participant) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { error } = await db
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      res.json({ message: "Conversation deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET all conversations for current user
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;
    const { data: rows, error } = await db
      .from("conversation_participants")
      .select(
        "conversation_id, joined_at, last_read_at, conversations(id, created_at, updated_at)",
      )
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false });

    if (error) throw error;

    const summaries = await Promise.all(
      (rows || []).map((row) =>
        getConversationSummary(
          db,
          row.conversation_id,
          userId,
          row.last_read_at,
        ),
      ),
    );

    res.json(summaries.filter((item) => item.otherUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET messages in a conversation
router.get("/:conversationId", verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const limit = parseLimit(
      req.query.limit,
      chatLimits.directMessageFetchLimit,
      200,
    );

    // Verify user is participant
    const participant = await ensureConversationParticipant(
      db,
      conversationId,
      userId,
    );

    if (!participant) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const messages = await fetchConversationMessagesWithRelations(
      db,
      conversationId,
      limit,
    );
    res.json((messages || []).map(normalizeDeletedMessagePayload));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new direct message
router.post(
  "/",
  verifyToken,
  createDirectMessageRateLimiter,
  createDirectMessageAntiSpamGuard,
  async (req, res) => {
    try {
      const { conversationId, content, imageUrl, replyToMessageId } = req.body;
      const senderId = req.userId;
      const db = req.supabase || supabase;
      const cleanedContent = typeof content === "string" ? content.trim() : "";
      const sanitizedContent = sanitizeProfanity(cleanedContent);
      const mediaValidation = validateMediaImageUrl(imageUrl);
      const cleanedImageUrl = mediaValidation.ok ? mediaValidation.value : "";

      if (!conversationId) {
        return res.status(400).json({ error: "conversationId is required" });
      }

      if (!cleanedContent && !cleanedImageUrl) {
        return res
          .status(400)
          .json({ error: "Message must include text or an image" });
      }

      if (cleanedContent.length > chatLimits.directMessageMaxChars) {
        return res.status(400).json({ error: "Message is too long" });
      }

      if (!mediaValidation.ok) {
        return res
          .status(mediaValidation.status || 400)
          .json({ error: mediaValidation.error });
      }

      // Verify sender belongs to the conversation.
      const { data: participant, error: participantError } = await db
        .from("conversation_participants")
        .select("conversation_id")
        .eq("conversation_id", conversationId)
        .eq("user_id", senderId)
        .maybeSingle();

      if (participantError) throw participantError;

      if (!participant) {
        return res.status(403).json({ error: "Not authorized" });
      }

      let validatedReplyToId = null;
      if (replyToMessageId) {
        const parentMessage = await getDirectMessageRecord(
          db,
          replyToMessageId,
        );

        if (!parentMessage) {
          return res.status(404).json({ error: "Reply target not found" });
        }

        if (parentMessage.conversation_id !== conversationId) {
          return res.status(400).json({
            error: "Reply target must be in the same conversation",
          });
        }

        validatedReplyToId = parentMessage.id;
      }

      if (cleanedImageUrl) {
        const mediaQuota = await enforceDailyMediaQuota({
          db,
          table: "direct_messages",
          userColumn: "sender_id",
          userId: senderId,
        });

        if (!mediaQuota.ok) {
          return res
            .status(mediaQuota.status || 429)
            .json({ error: mediaQuota.error });
        }
      }

      const payload = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: sanitizedContent || "",
        image_url: cleanedImageUrl || null,
      };

      if (validatedReplyToId) {
        payload.reply_to_message_id = validatedReplyToId;
      }

      const { data, error } = await db
        .from("direct_messages")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;
      const createdMessage = await fetchDirectMessageWithRelations(db, data.id);

      const io = req.app.get("io");
      if (io) {
        io.to(`dm:${conversationId}`).emit("dm:new", createdMessage);

        // Notify participants outside the active conversation room so badges can refresh.
        const { data: participants } = await db
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", senderId);

        (participants || []).forEach((participant) => {
          io.to(`user:${participant.user_id}`).emit("dm:notify", {
            conversationId,
            messageId: createdMessage.id,
            senderId,
            recipientId: participant.user_id,
          });
        });
      }

      res.status(201).json(createdMessage);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// POST add reaction to a direct message
router.post("/:messageId/reactions", verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
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

    const message = await getDirectMessageRecord(db, messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const participant = await ensureConversationParticipant(
      db,
      message.conversation_id,
      userId,
    );

    if (!participant) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error: insertError } = await db
      .from("direct_message_reactions")
      .upsert(
        [
          {
            message_id: messageId,
            user_id: userId,
            emoji,
          },
        ],
        { onConflict: "message_id,user_id,emoji" },
      );

    if (insertError) throw insertError;

    const reactions = await fetchDirectMessageReactions(db, messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(`dm:${message.conversation_id}`).emit("dm:reaction", {
        messageId,
        conversationId: message.conversation_id,
        reactions,
      });
    }

    res.status(201).json({ messageId, reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove reaction from a direct message
router.delete("/:messageId/reactions", verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    const rawEmoji = req.body?.emoji;
    const emoji = typeof rawEmoji === "string" ? rawEmoji.trim() : "";

    if (!emoji) {
      return res.status(400).json({ error: "emoji is required" });
    }

    const message = await getDirectMessageRecord(db, messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const participant = await ensureConversationParticipant(
      db,
      message.conversation_id,
      userId,
    );

    if (!participant) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error: deleteError } = await db
      .from("direct_message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);

    if (deleteError) throw deleteError;

    const reactions = await fetchDirectMessageReactions(db, messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(`dm:${message.conversation_id}`).emit("dm:reaction", {
        messageId,
        conversationId: message.conversation_id,
        reactions,
      });
    }

    res.json({ messageId, reactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE direct message
router.delete(
  "/:messageId",
  verifyToken,
  deleteDirectMessageRateLimiter,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.userId;
      const db = req.supabase || supabase;

      // Verify message belongs to user and get sender info
      const { data: message, error: fetchError } = await db
        .from("direct_messages")
        .select(
          "sender_id, conversation_id, created_at, profiles:sender_id(username)",
        )
        .eq("id", messageId)
        .single();

      if (fetchError || !message) {
        return res.status(404).json({ error: "Message not found" });
      }

      if (message.sender_id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const deletedContent = buildDeletedMessageContent(
        message.profiles?.username || "User",
      );

      // Soft delete in-place first.
      const { data: updatedRows, error: updateError } = await db
        .from("direct_messages")
        .update({
          content: deletedContent,
          image_url: null,
        })
        .eq("id", messageId)
        .eq("sender_id", userId)
        .select("id");

      if (updateError) throw updateError;

      // Fallback path for schemas/policies where UPDATE can no-op.
      if (!updatedRows || updatedRows.length === 0) {
        const { data: deletedRows, error: deleteError } = await db
          .from("direct_messages")
          .delete()
          .eq("id", messageId)
          .eq("sender_id", userId)
          .select("id");

        if (deleteError) throw deleteError;

        if (!deletedRows || deletedRows.length === 0) {
          return res.status(403).json({
            error: "Unable to unsend this message for everyone.",
          });
        }

        const { error: tombstoneInsertError } = await db
          .from("direct_messages")
          .insert([
            {
              id: messageId,
              conversation_id: message.conversation_id,
              sender_id: userId,
              content: deletedContent,
              image_url: null,
              created_at: message.created_at,
            },
          ]);

        if (tombstoneInsertError) throw tombstoneInsertError;
      }

      const io = req.app.get("io");
      if (io) {
        io.to(`dm:${message.conversation_id}`).emit("dm:deleted", {
          id: messageId,
          conversationId: message.conversation_id,
          senderUsername: message.profiles?.username || "User",
        });
      }

      res.json({ message: "Message deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

module.exports = router;
