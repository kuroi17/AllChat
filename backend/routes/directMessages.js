const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function parseLimit(value, fallback = 50, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

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

  const { data: lastMessage, error: lastMessageError } = await db
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastMessageError) throw lastMessageError;

  const { count: unreadCount, error: unreadError } = await db
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .gt("created_at", lastReadAt || "1970-01-01")
    .neq("sender_id", userId);

  if (unreadError) throw unreadError;

  const { data: conversationMeta, error: conversationMetaError } = await db
    .from("conversations")
    .select("updated_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationMetaError) throw conversationMetaError;

  return {
    conversationId,
    otherUser: participants?.[0]?.profiles || null,
    lastMessage: lastMessage || null,
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
router.post("/conversations/get-or-create", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const db = req.supabase || supabase;
    const targetUserId = req.body?.targetUserId;

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }

    if (targetUserId === userId) {
      return res
        .status(400)
        .json({ error: "Cannot start conversation with yourself" });
    }

    const { data: existing, error: existingError } = await db
      .from("conversation_participants")
      .select("conversation_id")
      .in("user_id", [userId, targetUserId]);

    if (existingError) throw existingError;

    if (existing && existing.length >= 2) {
      const conversationIds = existing.map((p) => p.conversation_id);
      const duplicateId = conversationIds.find(
        (id, index) => conversationIds.indexOf(id) !== index,
      );

      if (duplicateId) {
        return res.json({ conversationId: duplicateId, created: false });
      }
    }

    const { data: conversation, error: conversationError } = await db
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (conversationError) throw conversationError;

    const { error: participantsError } = await db
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, user_id: userId },
        { conversation_id: conversation.id, user_id: targetUserId },
      ]);

    if (participantsError) throw participantsError;

    res.status(201).json({ conversationId: conversation.id, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a conversation for participants (and cascade messages)
router.delete(
  "/conversations/:conversationId",
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
    const limit = parseLimit(req.query.limit, 100, 500);

    // Verify user is participant
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
      .select("*, profiles:sender_id(username, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new direct message
router.post("/", verifyToken, async (req, res) => {
  try {
    const { conversationId, content, imageUrl } = req.body;
    const senderId = req.userId;
    const db = req.supabase || supabase;
    const cleanedContent = typeof content === "string" ? content.trim() : "";

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    if (!cleanedContent && !imageUrl) {
      return res
        .status(400)
        .json({ error: "Message must include text or an image" });
    }

    if (cleanedContent.length > 4000) {
      return res.status(400).json({ error: "Message is too long" });
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

    const { data, error } = await db
      .from("direct_messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          content: cleanedContent || "",
          image_url: imageUrl || null,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE direct message
router.delete("/:messageId", verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify message belongs to user
    const { data: message, error: fetchError } = await db
      .from("direct_messages")
      .select("sender_id")
      .eq("id", messageId)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error: deleteError } = await db
      .from("direct_messages")
      .delete()
      .eq("id", messageId);

    if (deleteError) throw deleteError;
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
