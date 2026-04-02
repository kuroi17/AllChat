const express = require("express");
const { supabase } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/chatGuards");

const router = express.Router();

const reportRateLimiter = createRateLimiter({
  scope: "message-report",
  windowMs: 60000,
  maxRequests: 6,
  errorMessage: "Too many reports submitted. Please try again later.",
});

const allowedTypes = new Set(["global", "room", "dm"]);

router.post("/", verifyToken, reportRateLimiter, async (req, res) => {
  try {
    const db = req.supabase || supabase;
    const reporterId = req.userId;
    const {
      messageId,
      messageType,
      reportedUserId,
      roomId,
      conversationId,
      reason,
      description,
    } = req.body || {};

    if (!messageId || !messageType || !allowedTypes.has(messageType)) {
      return res.status(400).json({ error: "Missing or invalid report data" });
    }

    const safeReason = typeof reason === "string" ? reason.trim() : "";
    const safeDescription =
      typeof description === "string" ? description.trim() : "";

    if (!safeReason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

    if (safeReason.length > 120 || safeDescription.length > 1000) {
      return res.status(400).json({ error: "Report details are too long" });
    }

    const { error } = await db.from("message_reports").insert([
      {
        reporter_id: reporterId,
        reported_user_id: reportedUserId || null,
        message_id: messageId,
        message_type: messageType,
        room_id: roomId || null,
        conversation_id: conversationId || null,
        reason: safeReason,
        description: safeDescription || null,
      },
    ]);

    if (error) throw error;

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
