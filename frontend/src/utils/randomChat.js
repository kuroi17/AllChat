import { getChatSocket, uploadRoomMessageImage } from "./messages";

const SOCKET_ACK_TIMEOUT_MS = 12000;

function emitWithAck(
  socket,
  eventName,
  payload = {},
  timeoutMs = SOCKET_ACK_TIMEOUT_MS,
) {
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
  { sessionId, content = "", imageUrl = "" },
) {
  if (!sessionId) {
    throw new Error("Missing random chat session ID");
  }

  return emitWithAck(socket, "random:session:message", {
    sessionId,
    content,
    imageUrl,
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
    ["random:queue:joined", handlers.onQueueJoined],
    ["random:queue:left", handlers.onQueueLeft],
    ["random:matched", handlers.onMatched],
    ["random:session:warning", handlers.onWarning],
    ["random:vote:open", handlers.onVoteOpen],
    ["random:vote:update", handlers.onVoteUpdate],
    ["random:round:started", handlers.onRoundStarted],
    ["random:session:ended", handlers.onSessionEnded],
    ["random:message", handlers.onMessage],
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
