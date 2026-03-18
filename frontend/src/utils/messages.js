import { supabase } from "./supabase";
import { io } from "socket.io-client";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
let socketInstance = null;
let socketToken = null;

async function readErrorResponse(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function getChatSocket() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error("Not authenticated");
  }

  if (!socketInstance || socketToken !== token) {
    if (socketInstance) {
      socketInstance.disconnect();
    }

    socketInstance = io(API_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
      withCredentials: true,
    });
    socketToken = token;
  }

  return socketInstance;
}

// Fetch messages for a room (limit to last 100 for performance)
export async function fetchMessages(room = "global", limit = 100) {
  const encodedRoom = encodeURIComponent(room);
  const response = await fetch(`${API_BASE_URL}/api/messages/${encodedRoom}`);

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to fetch messages",
    );
    throw new Error(errorMessage);
  }

  const messages = await response.json();
  const bounded = Array.isArray(messages) ? messages.slice(0, limit) : [];

  // API returns newest first; UI expects oldest to newest.
  return bounded.reverse();
}

// Send a message
export async function sendMessage({ userId, content, room = "global" }) {
  const trimmed = typeof content === "string" ? content.trim() : "";

  if (!trimmed) {
    throw new Error("Message cannot be empty");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  const currentUserId = session?.user?.id;

  if (!token || !currentUserId) {
    throw new Error("You must be logged in to send a message");
  }

  if (userId && userId !== currentUserId) {
    throw new Error("You can only send messages as yourself");
  }

  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content: trimmed, room }),
  });

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to send message",
    );
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Emit a client-side event so local UI can update immediately
  try {
    window.dispatchEvent(new CustomEvent("newMessage", { detail: data }));
    // Also broadcast to other tabs via BroadcastChannel
    const bc = new BroadcastChannel("bsu_messages");
    bc.postMessage(data);
    bc.close();
  } catch (e) {
    // ignore - BroadcastChannel may not be available in all browsers
  }

  return data;
}

// Subscribe to new or deleted messages in a room
export async function subscribeMessages(
  room = "global",
  { onNew, onDeleted } = {},
) {
  const targetRoom = room || "global";
  const socket = await getChatSocket();

  socket.emit("room:join", { room: targetRoom });

  const handleNew = (message) => {
    if (message?.room === targetRoom && typeof onNew === "function") {
      onNew(message);
    }
  };

  const handleDeleted = (payload) => {
    if (payload?.room === targetRoom && typeof onDeleted === "function") {
      onDeleted(payload);
    }
  };

  socket.on("message:new", handleNew);
  socket.on("message:deleted", handleDeleted);

  return {
    socket,
    room: targetRoom,
    handleNew,
    handleDeleted,
  };
}

// Remove subscription
export function unsubscribeMessages(subscription) {
  if (!subscription) return;

  subscription.socket.off("message:new", subscription.handleNew);
  subscription.socket.off("message:deleted", subscription.handleDeleted);
  subscription.socket.emit("room:leave", { room: subscription.room });
}

// Fetch profiles by ids and return map
export async function fetchProfilesByIds(ids = []) {
  if (!ids.length) return {};
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", ids);
  if (error) throw error;
  return profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
}
