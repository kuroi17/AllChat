const crypto = require("crypto");
const { supabase } = require("../utils/supabase");
const { createSocketRateLimiter } = require("../middleware/chatGuards");
const { sanitizeProfanity } = require("../utils/profanityFilter");
const { chatLimits, validateMediaImageUrl } = require("../utils/chatLimits");

function parsePositiveInt(name, fallbackValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallbackValue;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;

  return parsed;
}

const DEFAULT_SESSION_SECONDS = 180;
const DEFAULT_WARNING_SECONDS = 160;
const DEFAULT_VOTE_WINDOW_SECONDS = 20;
const MAX_RANDOM_MESSAGE_CHARS = 500;

const RANDOM_SESSION_SECONDS = parsePositiveInt(
  "RANDOM_CHAT_SESSION_SECONDS",
  DEFAULT_SESSION_SECONDS,
);

const RANDOM_WARNING_SECONDS = Math.min(
  parsePositiveInt("RANDOM_CHAT_WARNING_SECONDS", DEFAULT_WARNING_SECONDS),
  Math.max(RANDOM_SESSION_SECONDS - 1, 1),
);

const RANDOM_VOTE_WINDOW_SECONDS = parsePositiveInt(
  "RANDOM_CHAT_VOTE_WINDOW_SECONDS",
  DEFAULT_VOTE_WINDOW_SECONDS,
);

function buildFallbackProfile(userId) {
  const fallbackName = String(userId || "user").slice(0, 8);
  return {
    id: userId,
    username: fallbackName || "User",
    avatar_url: null,
  };
}

function createRandomChatGateway(io) {
  const waitingQueue = [];
  const queuedUsers = new Map();
  const activeSessions = new Map();
  const userToSessionId = new Map();
  const randomMediaQuota = new Map();

  let isMatchingInProgress = false;

  const queueRateLimiter = createSocketRateLimiter({
    scope: "random-queue-action",
    windowMs: 10000,
    maxRequests: 12,
    errorMessage: "Too many queue actions. Please try again.",
  });

  const messageRateLimiter = createSocketRateLimiter({
    scope: "random-message-send",
    windowMs: 10000,
    maxRequests: 8,
    errorMessage: "You are sending too fast. Please slow down.",
  });

  const typingRateLimiter = createSocketRateLimiter({
    scope: "random-message-typing",
    windowMs: 10000,
    maxRequests: 45,
    errorMessage: "Typing updates are too frequent.",
  });

  const voteRateLimiter = createSocketRateLimiter({
    scope: "random-vote-action",
    windowMs: 10000,
    maxRequests: 10,
    errorMessage: "Too many vote actions. Please wait a moment.",
  });

  function getSocketById(socketId) {
    return io.sockets.sockets.get(socketId) || null;
  }

  function getDayKey() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function consumeRandomMediaQuota(userId) {
    const maxMediaPerDay = Number(chatLimits.maxMediaMessagesPerDay) || 0;
    if (maxMediaPerDay <= 0) return true;

    const key = String(userId || "");
    if (!key) return false;

    const dayKey = getDayKey();
    const state = randomMediaQuota.get(key);

    if (!state || state.dayKey !== dayKey) {
      randomMediaQuota.set(key, { dayKey, count: 1 });
      return true;
    }

    if (state.count >= maxMediaPerDay) {
      return false;
    }

    state.count += 1;
    randomMediaQuota.set(key, state);
    return true;
  }

  async function resolveUserProfile(userId) {
    if (!userId) return buildFallbackProfile(userId);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return buildFallbackProfile(userId);

      return {
        id: data.id,
        username: data.username || buildFallbackProfile(userId).username,
        avatar_url: data.avatar_url || null,
      };
    } catch {
      return buildFallbackProfile(userId);
    }
  }

  function removeUserFromQueue(userId) {
    if (!userId) return;

    queuedUsers.delete(userId);

    for (let index = waitingQueue.length - 1; index >= 0; index -= 1) {
      if (waitingQueue[index] === userId) {
        waitingQueue.splice(index, 1);
      }
    }
  }

  function clearSessionTimers(session) {
    if (!session) return;

    if (session.warningTimer) {
      clearTimeout(session.warningTimer);
      session.warningTimer = null;
    }

    if (session.voteOpenTimer) {
      clearTimeout(session.voteOpenTimer);
      session.voteOpenTimer = null;
    }

    if (session.voteDeadlineTimer) {
      clearTimeout(session.voteDeadlineTimer);
      session.voteDeadlineTimer = null;
    }
  }

  function findSessionByUserId(userId) {
    const sessionId = userToSessionId.get(userId);
    if (!sessionId) return null;

    const session = activeSessions.get(sessionId);
    if (!session) {
      userToSessionId.delete(userId);
      return null;
    }

    return session;
  }

  function buildSessionPayloadForUser(session, userId) {
    const participants = Array.isArray(session.participants)
      ? session.participants
      : [];

    const self = participants.find((item) => item.userId === userId) || null;
    const partner = participants.find((item) => item.userId !== userId) || null;

    return {
      sessionId: session.id,
      roomName: session.roomName,
      round: session.round,
      phase: session.phase,
      roundStartedAt: session.roundStartedAt,
      durationSeconds: session.durationSeconds,
      warningSeconds: session.warningSeconds,
      voteWindowSeconds: session.voteWindowSeconds,
      voteDeadlineAt: session.voteDeadlineAt || null,
      selfProfile: self?.profile || buildFallbackProfile(userId),
      partnerProfile: partner?.profile || null,
    };
  }

  function endSession(
    sessionId,
    { reason = "ended", endedByUserId = null } = {},
  ) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    clearSessionTimers(session);

    io.to(session.roomName).emit("random:session:ended", {
      sessionId,
      reason,
      endedByUserId,
      endedAt: Date.now(),
    });

    for (const participant of session.participants) {
      userToSessionId.delete(participant.userId);

      const participantSocket = getSocketById(participant.socketId);
      if (participantSocket) {
        participantSocket.leave(session.roomName);
      }
    }

    activeSessions.delete(sessionId);
  }

  function scheduleRoundTimers(session) {
    clearSessionTimers(session);

    const now = Date.now();
    const warningAt = session.roundStartedAt + session.warningSeconds * 1000;
    const voteOpenAt = session.roundStartedAt + session.durationSeconds * 1000;

    const warningDelay = Math.max(0, warningAt - now);
    const voteOpenDelay = Math.max(0, voteOpenAt - now);

    session.warningTimer = setTimeout(() => {
      const currentSession = activeSessions.get(session.id);
      if (!currentSession || currentSession.phase !== "chat") return;

      io.to(currentSession.roomName).emit("random:session:warning", {
        sessionId: currentSession.id,
        round: currentSession.round,
        secondsRemaining: Math.max(
          currentSession.durationSeconds - currentSession.warningSeconds,
          0,
        ),
      });
    }, warningDelay);

    session.voteOpenTimer = setTimeout(() => {
      openVotePhase(session.id);
    }, voteOpenDelay);
  }

  function openVotePhase(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session || session.phase !== "chat") return;

    session.phase = "vote";
    session.votes.clear();
    session.voteDeadlineAt = Date.now() + session.voteWindowSeconds * 1000;

    io.to(session.roomName).emit("random:vote:open", {
      sessionId: session.id,
      round: session.round,
      voteDeadlineAt: session.voteDeadlineAt,
      voteWindowSeconds: session.voteWindowSeconds,
    });

    session.voteDeadlineTimer = setTimeout(() => {
      const currentSession = activeSessions.get(session.id);
      if (!currentSession || currentSession.phase !== "vote") return;

      endSession(session.id, { reason: "vote_timeout" });
    }, session.voteWindowSeconds * 1000);
  }

  function startNextRound(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session) return;

    session.phase = "chat";
    session.round += 1;
    session.roundStartedAt = Date.now();
    session.voteDeadlineAt = null;
    session.votes.clear();

    if (session.voteDeadlineTimer) {
      clearTimeout(session.voteDeadlineTimer);
      session.voteDeadlineTimer = null;
    }

    io.to(session.roomName).emit("random:round:started", {
      sessionId: session.id,
      round: session.round,
      roundStartedAt: session.roundStartedAt,
      durationSeconds: session.durationSeconds,
      warningSeconds: session.warningSeconds,
    });

    scheduleRoundTimers(session);
  }

  function handleVoteDecision(sessionId) {
    const session = activeSessions.get(sessionId);
    if (!session || session.phase !== "vote") return;

    const participantUserIds = session.participants.map((item) => item.userId);
    const decisions = participantUserIds.map((userId) =>
      session.votes.get(userId),
    );

    if (decisions.includes("end")) {
      endSession(sessionId, { reason: "ended_by_vote" });
      return;
    }

    if (decisions.every((decision) => decision === "extend")) {
      startNextRound(sessionId);
    }
  }

  async function maybeMatchUsers() {
    if (isMatchingInProgress) return;
    if (waitingQueue.length < 2) return;

    isMatchingInProgress = true;

    try {
      while (waitingQueue.length >= 2) {
        const firstUserId = waitingQueue.shift();
        const secondUserId = waitingQueue.shift();

        if (!firstUserId || !secondUserId || firstUserId === secondUserId) {
          if (firstUserId) removeUserFromQueue(firstUserId);
          if (secondUserId) removeUserFromQueue(secondUserId);
          continue;
        }

        const firstQueued = queuedUsers.get(firstUserId);
        const secondQueued = queuedUsers.get(secondUserId);

        if (!firstQueued || !secondQueued) continue;

        const firstSocket = getSocketById(firstQueued.socketId);
        const secondSocket = getSocketById(secondQueued.socketId);

        if (!firstSocket || !secondSocket) {
          removeUserFromQueue(firstUserId);
          removeUserFromQueue(secondUserId);
          continue;
        }

        if (
          findSessionByUserId(firstUserId) ||
          findSessionByUserId(secondUserId)
        ) {
          removeUserFromQueue(firstUserId);
          removeUserFromQueue(secondUserId);
          continue;
        }

        queuedUsers.delete(firstUserId);
        queuedUsers.delete(secondUserId);

        const firstProfile =
          firstQueued.profile || (await resolveUserProfile(firstUserId));
        const secondProfile =
          secondQueued.profile || (await resolveUserProfile(secondUserId));

        const sessionId = crypto.randomUUID();
        const roomName = `random:${sessionId}`;

        const session = {
          id: sessionId,
          roomName,
          participants: [
            {
              userId: firstUserId,
              socketId: firstSocket.id,
              profile: firstProfile,
            },
            {
              userId: secondUserId,
              socketId: secondSocket.id,
              profile: secondProfile,
            },
          ],
          round: 1,
          phase: "chat",
          roundStartedAt: Date.now(),
          durationSeconds: RANDOM_SESSION_SECONDS,
          warningSeconds: RANDOM_WARNING_SECONDS,
          voteWindowSeconds: RANDOM_VOTE_WINDOW_SECONDS,
          voteDeadlineAt: null,
          votes: new Map(),
          warningTimer: null,
          voteOpenTimer: null,
          voteDeadlineTimer: null,
        };

        activeSessions.set(sessionId, session);
        userToSessionId.set(firstUserId, sessionId);
        userToSessionId.set(secondUserId, sessionId);

        firstSocket.join(roomName);
        secondSocket.join(roomName);

        firstSocket.emit(
          "random:matched",
          buildSessionPayloadForUser(session, firstUserId),
        );
        secondSocket.emit(
          "random:matched",
          buildSessionPayloadForUser(session, secondUserId),
        );

        scheduleRoundTimers(session);
      }
    } finally {
      isMatchingInProgress = false;
    }
  }

  async function handleQueueJoin(socket, ack) {
    if (!queueRateLimiter(socket, ack)) return;

    const userId = socket.userId;
    if (!userId) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Not authenticated" });
      }
      return;
    }

    if (findSessionByUserId(userId)) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Already in an active random chat session" });
      }
      return;
    }

    removeUserFromQueue(userId);

    const profile = await resolveUserProfile(userId);
    queuedUsers.set(userId, {
      userId,
      socketId: socket.id,
      profile,
      queuedAt: Date.now(),
    });

    waitingQueue.push(userId);

    if (typeof ack === "function") {
      ack({
        ok: true,
        state: "queued",
        queueSize: waitingQueue.length,
      });
    }

    socket.emit("random:queue:joined", {
      queueSize: waitingQueue.length,
      queuedAt: Date.now(),
    });

    await maybeMatchUsers();
  }

  function handleQueueLeave(socket, ack) {
    if (!queueRateLimiter(socket, ack)) return;

    removeUserFromQueue(socket.userId);

    if (typeof ack === "function") {
      ack({ ok: true, state: "idle" });
    }

    socket.emit("random:queue:left", { state: "idle" });
  }

  function handleSessionState(socket, ack) {
    const userId = socket.userId;
    const session = findSessionByUserId(userId);

    if (session) {
      const payload = buildSessionPayloadForUser(session, userId);
      if (typeof ack === "function") {
        ack({ ok: true, state: "matched", session: payload });
      }
      return;
    }

    if (queuedUsers.has(userId)) {
      if (typeof ack === "function") {
        ack({ ok: true, state: "queued", queueSize: waitingQueue.length });
      }
      return;
    }

    if (typeof ack === "function") {
      ack({ ok: true, state: "idle" });
    }
  }

  function handleSessionMessage(socket, payload, ack) {
    if (!messageRateLimiter(socket, ack)) return;

    const userId = socket.userId;
    const sessionId = payload?.sessionId;
    const session = findSessionByUserId(userId);

    if (!session || session.id !== sessionId) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "No active random chat session" });
      }
      return;
    }

    if (session.phase !== "chat") {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Session is waiting for decision votes" });
      }
      return;
    }

    const rawContent =
      typeof payload?.content === "string" ? payload.content : "";
    const cleanedContent = rawContent.trim();
    const sanitizedContent = sanitizeProfanity(cleanedContent);

    const mediaValidation = validateMediaImageUrl(payload?.imageUrl);
    if (!mediaValidation.ok) {
      if (typeof ack === "function") {
        ack({ ok: false, error: mediaValidation.error || "Invalid image URL" });
      }
      return;
    }

    const imageUrl = mediaValidation.value;

    if (!sanitizedContent && !imageUrl) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Message cannot be empty" });
      }
      return;
    }

    if (sanitizedContent.length > MAX_RANDOM_MESSAGE_CHARS) {
      if (typeof ack === "function") {
        ack({
          ok: false,
          error: `Message is too long (max ${MAX_RANDOM_MESSAGE_CHARS} characters).`,
        });
      }
      return;
    }

    if (imageUrl && !consumeRandomMediaQuota(userId)) {
      if (typeof ack === "function") {
        ack({
          ok: false,
          error: `Daily image upload limit reached (${chatLimits.maxMediaMessagesPerDay}/day).`,
        });
      }
      return;
    }

    const participant = session.participants.find(
      (item) => item.userId === userId,
    );
    const profile = participant?.profile || buildFallbackProfile(userId);

    const messagePayload = {
      id: crypto.randomUUID(),
      sessionId,
      room: session.roomName,
      round: session.round,
      user_id: userId,
      content: sanitizedContent || "",
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      profiles: {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
      },
    };

    io.to(session.roomName).emit("random:message", messagePayload);

    if (typeof ack === "function") {
      ack({ ok: true, messageId: messagePayload.id });
    }
  }

  function handleSessionTyping(socket, payload, ack) {
    if (!typingRateLimiter(socket, ack)) return;

    const userId = socket.userId;
    const sessionId = payload?.sessionId;
    const session = findSessionByUserId(userId);

    if (!session || session.id !== sessionId || session.phase !== "chat") {
      if (typeof ack === "function") {
        ack({ ok: false, error: "No active random chat session" });
      }
      return;
    }

    socket.to(session.roomName).emit("random:typing", {
      sessionId,
      userId,
      timestamp: Date.now(),
    });

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  }

  function handleSessionVote(socket, payload, ack) {
    if (!voteRateLimiter(socket, ack)) return;

    const userId = socket.userId;
    const sessionId = payload?.sessionId;
    const decision = payload?.decision;
    const session = findSessionByUserId(userId);

    if (!session || session.id !== sessionId) {
      if (typeof ack === "function") {
        ack({ ok: false, error: "No active random chat session" });
      }
      return;
    }

    if (session.phase !== "vote") {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Voting is not open yet" });
      }
      return;
    }

    if (decision !== "extend" && decision !== "end") {
      if (typeof ack === "function") {
        ack({ ok: false, error: "Invalid decision" });
      }
      return;
    }

    session.votes.set(userId, decision);

    const votes = session.participants.map((participant) => ({
      userId: participant.userId,
      decision: session.votes.get(participant.userId) || null,
    }));

    io.to(session.roomName).emit("random:vote:update", {
      sessionId,
      votes,
    });

    if (typeof ack === "function") {
      ack({ ok: true, decision });
    }

    handleVoteDecision(session.id);
  }

  function handleSessionLeave(socket, payload, ack) {
    const userId = socket.userId;
    const session = findSessionByUserId(userId);

    if (!session) {
      if (typeof ack === "function") {
        ack({ ok: true });
      }
      return;
    }

    endSession(session.id, {
      reason: payload?.reason || "left_random_chat",
      endedByUserId: userId,
    });

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  }

  function handleDisconnect(socket) {
    removeUserFromQueue(socket.userId);

    const session = findSessionByUserId(socket.userId);
    if (session) {
      endSession(session.id, {
        reason: "partner_left",
        endedByUserId: socket.userId,
      });
    }
  }

  function bindSocket(socket) {
    socket.on("random:queue:join", async (_payload, ack) => {
      try {
        await handleQueueJoin(socket, ack);
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, error: error.message || "Failed to join queue" });
        }
      }
    });

    socket.on("random:queue:leave", (_payload, ack) => {
      handleQueueLeave(socket, ack);
    });

    socket.on("random:session:state", (_payload, ack) => {
      handleSessionState(socket, ack);
    });

    socket.on("random:session:message", (payload, ack) => {
      handleSessionMessage(socket, payload, ack);
    });

    socket.on("random:session:typing", (payload, ack) => {
      handleSessionTyping(socket, payload, ack);
    });

    socket.on("random:session:vote", (payload, ack) => {
      handleSessionVote(socket, payload, ack);
    });

    socket.on("random:session:leave", (payload, ack) => {
      handleSessionLeave(socket, payload, ack);
    });

    socket.on("disconnect", () => {
      handleDisconnect(socket);
    });
  }

  return {
    bindSocket,
  };
}

module.exports = {
  createRandomChatGateway,
};
