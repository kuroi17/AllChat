import { getChatSocket, uploadRoomMessageImage } from "./messages";
import { supabase } from "./supabase";
import { API_BASE_URL } from "./runtimeConfig";

const SOCKET_ACK_TIMEOUT_MS = 18000;

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

async function readErrorResponse(response, fallbackMessage) {
  try {
    const payload = await response.json();
    return payload?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function requestRandomApi(path, { method = "GET", body } = {}) {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      `Request failed (${method} ${path})`,
    );

    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  return response.json();
}

function ensureSocketConnected(socket, timeoutMs = 20000) {
  if (socket?.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let isDone = false;

    const timer = setTimeout(() => {
      if (isDone) return;
      isDone = true;
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
      reject(new Error("Connection timed out. Please try again."));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
    };

    const handleConnect = () => {
      if (isDone) return;
      isDone = true;
      cleanup();
      resolve();
    };

    const handleError = () => {
      if (isDone) return;
      isDone = true;
      cleanup();
      reject(new Error("Unable to connect to random chat server."));
    };

    socket.once("connect", handleConnect);
    socket.once("connect_error", handleError);

    if (!socket.connected) {
      socket.connect();
    }
  });
}

async function emitWithAck(
  socket,
  eventName,
  payload = {},
  timeoutMs = SOCKET_ACK_TIMEOUT_MS,
) {
  await ensureSocketConnected(socket, Math.max(timeoutMs, 18000));

  return new Promise((resolve, reject) => {
    let isSettled = false;

    const timer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      reject(new Error("Request timed out. Please try again."));
    }, timeoutMs);

    socket.emit(eventName, payload, (response) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (!response?.ok) {
        reject(new Error(response?.error || "Request failed"));
        return;
      }

      resolve(response);
    });
  });
}

export async function getRandomChatSocket() {
  return getChatSocket();
}

export async function getRandomSessionState(socket) {
  return emitWithAck(socket, "random:session:state", {});
}

export async function joinRandomQueue(socket) {
  return emitWithAck(socket, "random:queue:join", {});
}

export async function leaveRandomQueue(socket) {
  return emitWithAck(socket, "random:queue:leave", {});
}

export async function sendRandomSessionMessage(
  socket,
  { sessionId, content = "", imageUrl = "", replyToMessageId = null },
) {
  if (!sessionId) {
    throw new Error("Missing random chat session ID");
  }

  return emitWithAck(socket, "random:session:message", {
    sessionId,
    content,
    imageUrl,
    replyToMessageId,
  });
}

export async function toggleRandomMessageReaction(
  socket,
  { sessionId, messageId, emoji },
) {
  if (!sessionId) {
    throw new Error("Missing random chat session ID");
  }

  if (!messageId) {
    throw new Error("Missing random chat message ID");
  }

  if (!emoji) {
    throw new Error("Missing emoji reaction");
  }

  return emitWithAck(socket, "random:message:reaction", {
    sessionId,
    messageId,
    emoji,
  });
}

export async function sendRandomSessionTyping(socket, { sessionId }) {
  if (!sessionId) return;

  try {
    await emitWithAck(socket, "random:session:typing", { sessionId }, 4000);
  } catch {
    // Ignore typing failures to avoid noisy UX.
  }
}

export async function voteRandomSession(socket, { sessionId, decision }) {
  if (!sessionId) {
    throw new Error("Missing random chat session ID");
  }

  if (decision !== "extend" && decision !== "end") {
    throw new Error("Invalid vote decision");
  }

  return emitWithAck(socket, "random:session:vote", { sessionId, decision });
}

export async function leaveRandomSession(
  socket,
  { sessionId, reason = "left_random_chat" } = {},
) {
  return emitWithAck(socket, "random:session:leave", { sessionId, reason });
}

export function subscribeRandomChatEvents(socket, handlers = {}) {
  const entries = [
    ["random:queue:stats", handlers.onQueueStats],
    ["random:queue:joined", handlers.onQueueJoined],
    ["random:queue:left", handlers.onQueueLeft],
    ["random:matched", handlers.onMatched],
    ["random:session:warning", handlers.onWarning],
    ["random:vote:open", handlers.onVoteOpen],
    ["random:vote:update", handlers.onVoteUpdate],
    ["random:round:started", handlers.onRoundStarted],
    ["random:session:ended", handlers.onSessionEnded],
    ["random:message", handlers.onMessage],
    ["random:message:reaction", handlers.onReaction],
    ["random:typing", handlers.onTyping],
  ];

  const attached = [];

  for (const [eventName, handler] of entries) {
    if (typeof handler !== "function") continue;
    socket.on(eventName, handler);
    attached.push([eventName, handler]);
  }

  return () => {
    for (const [eventName, handler] of attached) {
      socket.off(eventName, handler);
    }
  };
}

export async function uploadRandomChatImage({ sessionId, file }) {
  if (!sessionId) {
    throw new Error("Missing random chat session ID");
  }

  return uploadRoomMessageImage({
    roomId: `random-${sessionId}`,
    file,
  });
}

export async function fetchRandomAnalytics(days = 7) {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.min(30, days)) : 7;
  return requestRandomApi(`/api/random/analytics?days=${safeDays}`, {
    method: "GET",
  });
}

export async function fetchRandomAccess() {
  return requestRandomApi("/api/random/access", {
    method: "GET",
  });
}

export async function fetchRandomReports(limit = 20) {
  const safeLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(200, limit))
    : 20;
  return requestRandomApi(`/api/random/reports?limit=${safeLimit}`, {
    method: "GET",
  });
}

export async function submitRandomSessionReport({
  sessionId,
  reportedUserId,
  reason,
  description,
}) {
  return requestRandomApi("/api/random/reports", {
    method: "POST",
    body: {
      sessionId,
      reportedUserId,
      reason,
      description,
    },
  });
}
