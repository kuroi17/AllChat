const rateWindowStore = new Map();
const spamStateStore = new Map();
const socketRateWindowStore = new Map();

function actorKey(req, scope) {
  const actorId = req.userId || req.ip || "anonymous";
  return `${scope}:${actorId}`;
}

function cleanupRateWindow(windowMs) {
  if (rateWindowStore.size < 5000) return;

  const cutoff = Date.now() - windowMs * 2;
  for (const [key, timestamps] of rateWindowStore.entries()) {
    const recent = timestamps.filter((ts) => ts > cutoff);
    if (recent.length === 0) {
      rateWindowStore.delete(key);
    } else {
      rateWindowStore.set(key, recent);
    }
  }
}

function cleanupSpamState(maxAgeMs) {
  if (spamStateStore.size < 5000) return;

  const cutoff = Date.now() - maxAgeMs * 2;
  for (const [key, state] of spamStateStore.entries()) {
    if (state.lastSentAt < cutoff) {
      spamStateStore.delete(key);
    }
  }
}

function cleanupSocketRateWindow(windowMs) {
  if (socketRateWindowStore.size < 5000) return;

  const cutoff = Date.now() - windowMs * 2;
  for (const [key, timestamps] of socketRateWindowStore.entries()) {
    const recent = timestamps.filter((ts) => ts > cutoff);
    if (recent.length === 0) {
      socketRateWindowStore.delete(key);
    } else {
      socketRateWindowStore.set(key, recent);
    }
  }
}

function normalizeContent(content) {
  if (typeof content !== "string") return "";
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function createRateLimiter({
  scope,
  windowMs,
  maxRequests,
  errorMessage = "Too many requests. Please try again shortly.",
}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = actorKey(req, scope);

    const previous = rateWindowStore.get(key) || [];
    const recent = previous.filter((ts) => now - ts < windowMs);

    if (recent.length >= maxRequests) {
      const retryAfterMs = Math.max(0, windowMs - (now - recent[0]));
      return res.status(429).json({
        error: errorMessage,
        retryAfterMs,
      });
    }

    recent.push(now);
    rateWindowStore.set(key, recent);
    cleanupRateWindow(windowMs);
    next();
  };
}

function createAntiSpamGuard({
  scope,
  minIntervalMs = 700,
  duplicateWindowMs = 12000,
  fastMessageError = "You are sending messages too quickly. Please slow down.",
  duplicateMessageError = "Duplicate message detected. Please avoid repeating the same message.",
}) {
  return (req, res, next) => {
    const key = actorKey(req, scope);
    const now = Date.now();
    const normalizedContent = normalizeContent(req.body?.content);

    const previous = spamStateStore.get(key);

    if (previous && now - previous.lastSentAt < minIntervalMs) {
      const retryAfterMs = Math.max(
        0,
        minIntervalMs - (now - previous.lastSentAt),
      );
      return res.status(429).json({
        error: fastMessageError,
        retryAfterMs,
      });
    }

    if (
      normalizedContent &&
      previous &&
      normalizedContent === previous.lastContent &&
      now - previous.lastContentAt < duplicateWindowMs
    ) {
      const retryAfterMs = Math.max(
        0,
        duplicateWindowMs - (now - previous.lastContentAt),
      );
      return res.status(429).json({
        error: duplicateMessageError,
        retryAfterMs,
      });
    }

    spamStateStore.set(key, {
      lastSentAt: now,
      lastContent: normalizedContent || previous?.lastContent || "",
      lastContentAt: normalizedContent ? now : previous?.lastContentAt || 0,
    });

    cleanupSpamState(Math.max(minIntervalMs, duplicateWindowMs));
    next();
  };
}

function createSocketRateLimiter({
  scope,
  windowMs,
  maxRequests,
  errorMessage = "Too many requests. Please try again shortly.",
}) {
  return (socket, ack) => {
    const now = Date.now();
    const actorId = socket.userId || socket.id || "anonymous";
    const key = `${scope}:${actorId}`;

    const previous = socketRateWindowStore.get(key) || [];
    const recent = previous.filter((ts) => now - ts < windowMs);

    if (recent.length >= maxRequests) {
      const retryAfterMs = Math.max(0, windowMs - (now - recent[0]));

      if (typeof ack === "function") {
        ack({
          ok: false,
          error: errorMessage,
          retryAfterMs,
        });
      }

      return false;
    }

    recent.push(now);
    socketRateWindowStore.set(key, recent);
    cleanupSocketRateWindow(windowMs);
    return true;
  };
}

module.exports = {
  createRateLimiter,
  createAntiSpamGuard,
  createSocketRateLimiter,
};
