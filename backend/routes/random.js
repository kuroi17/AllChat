const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/chatGuards");
const { requireRandomAnalyticsAdmin } = require("../utils/adminAccess");

const router = express.Router();

const randomReportRateLimiter = createRateLimiter({
  scope: "random-session-report",
  windowMs: 60 * 1000,
  maxRequests: 6,
  errorMessage: "Too many random session reports. Please try again later.",
});

function parseLimit(value, fallback = 30, max = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseDays(value, fallback = 7, max = 30) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function getGateway(req) {
  return req.app.get("randomChatGateway");
}

router.get(
  "/analytics",
  verifyToken,
  requireRandomAnalyticsAdmin,
  (req, res) => {
    try {
      const gateway = getGateway(req);
      if (!gateway || typeof gateway.getAnalyticsSnapshot !== "function") {
        return res.status(503).json({
          error: "Random analytics service is not available.",
        });
      }

      const days = parseDays(req.query.days, 7, 30);
      const analytics = gateway.getAnalyticsSnapshot({ days });
      res.json(analytics);
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch analytics" });
    }
  },
);

router.get("/reports", verifyToken, requireRandomAnalyticsAdmin, (req, res) => {
  try {
    const gateway = getGateway(req);
    if (!gateway || typeof gateway.getRecentReports !== "function") {
      return res.status(503).json({
        error: "Random reports service is not available.",
      });
    }

    const limit = parseLimit(req.query.limit, 30, 200);
    const reports = gateway.getRecentReports({ limit });
    res.json(Array.isArray(reports) ? reports : []);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch reports" });
  }
});

router.post("/reports", verifyToken, randomReportRateLimiter, (req, res) => {
  try {
    const gateway = getGateway(req);
    if (!gateway || typeof gateway.submitReport !== "function") {
      return res.status(503).json({
        error: "Random report service is not available.",
      });
    }

    const sessionId =
      typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const reportedUserId =
      typeof req.body?.reportedUserId === "string"
        ? req.body.reportedUserId.trim()
        : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description : "";

    if (!sessionId) {
      return res.status(400).json({ error: "Missing random session ID." });
    }

    const result = gateway.submitReport({
      sessionId,
      reporterId: req.userId,
      reporterEmail: req.user?.email || "",
      reportedUserId,
      reason,
      description,
    });

    if (!result?.ok) {
      return res.status(result?.status || 400).json({
        error: result?.error || "Failed to submit random session report.",
      });
    }

    return res.status(201).json({
      ok: true,
      reportId: result.report?.id,
      createdAt: result.report?.createdAt,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || "Failed to submit report" });
  }
});

module.exports = router;
