import { supabase } from "./supabase";
import { io } from "socket.io-client";
import {
  API_BASE_URL,
  CLOUDINARY_UPLOAD_FOLDER,
  ENABLE_MEDIA_UPLOADS,
  MEDIA_STORAGE_PROVIDER,
  MAX_GLOBAL_MESSAGE_CHARS,
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_MB,
} from "./runtimeConfig";

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

  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      auth: { token },
      autoConnect: false,
      // allow polling fallback when websocket upgrades fail (some proxies/load-balancers)
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io",
      reconnection: true,
      // Keep retrying in mobile/background resume scenarios.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,
    });

    socketToken = token;
  } else if (socketToken !== token) {
    // Keep one socket instance so existing listeners stay attached.
    socketToken = token;
    socketInstance.auth = { token };

    if (socketInstance.connected || socketInstance.active) {
      socketInstance.disconnect();
    }
  }

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

// Fetch messages for a room (limit to last 50 for better egress control)
export async function fetchMessages(room = "global", limit = 50) {
  const encodedRoom = encodeURIComponent(room);
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/messages/${encodedRoom}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
export async function sendMessage({
  userId,
  content,
  room = "global",
  imageUrl,
  replyToMessageId = null,
  emitLocalEvent = true,
}) {
  const trimmed = typeof content === "string" ? content.trim() : "";
  const trimmedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

  if (!trimmed && !trimmedImageUrl) {
    throw new Error("Message cannot be empty");
  }

  if (trimmed.length > MAX_GLOBAL_MESSAGE_CHARS) {
    throw new Error(
      `Message is too long (max ${MAX_GLOBAL_MESSAGE_CHARS} characters).`,
    );
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
    body: JSON.stringify({
      content: trimmed,
      room,
      imageUrl: trimmedImageUrl || null,
      replyToMessageId: replyToMessageId || null,
    }),
  });

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to send message",
    );
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Emit a client-side event so local UI can update immediately.
  // Room chat can opt out because it already has explicit optimistic + replace events.
  if (emitLocalEvent) {
    try {
      window.dispatchEvent(new CustomEvent("newMessage", { detail: data }));
      // Also broadcast to other tabs via BroadcastChannel
      const bc = new BroadcastChannel("bsu_messages");
      bc.postMessage(data);
      bc.close();
    } catch (e) {
      // ignore - BroadcastChannel may not be available in all browsers
    }
  }

  return data;
}

// Subscribe to new or deleted messages in a room
export async function subscribeMessages(
  room = "global",
  { onNew, onDeleted, onReaction, onTyping } = {},
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

  const handleReaction = (payload) => {
    if (payload?.room === targetRoom && typeof onReaction === "function") {
      onReaction(payload);
    }
  };

  const handleTyping = (payload) => {
    if (payload?.room === targetRoom && typeof onTyping === "function") {
      onTyping(payload);
    }
  };

  socket.on("message:new", handleNew);
  socket.on("message:deleted", handleDeleted);
  socket.on("message:reaction", handleReaction);
  socket.on("room:user-typing", handleTyping);

  return {
    socket,
    room: targetRoom,
    handleNew,
    handleDeleted,
    handleReaction,
    handleTyping,
  };
}

// Remove subscription
export function unsubscribeMessages(subscription) {
  if (!subscription) return;

  subscription.socket.off("message:new", subscription.handleNew);
  subscription.socket.off("message:deleted", subscription.handleDeleted);
  subscription.socket.off("message:reaction", subscription.handleReaction);
  subscription.socket.off("room:user-typing", subscription.handleTyping);
  subscription.socket.emit("room:leave", { room: subscription.room });
}

export async function emitRoomTyping(room = "global") {
  const socket = await getChatSocket();
  const targetRoom = typeof room === "string" && room.trim() ? room : "global";
  socket.emit("room:typing", { room: targetRoom });
}

export async function addMessageReaction(messageId, emoji) {
  if (!messageId) throw new Error("Missing message ID");
  if (!emoji) throw new Error("Missing emoji");

  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    },
  );

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to add reaction",
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function removeMessageReaction(messageId, emoji) {
  if (!messageId) throw new Error("Missing message ID");
  if (!emoji) throw new Error("Missing emoji");

  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
    },
  );

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to remove reaction",
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteMessage(messageId) {
  if (!messageId) throw new Error("Missing message ID");
  const token = await getAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/messages/${encodeURIComponent(messageId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorMessage = await readErrorResponse(
      response,
      "Failed to delete message",
    );
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function uploadRoomMessageImage({ roomId, file }) {
  if (!roomId) throw new Error("Missing room ID");
  if (!file) throw new Error("No image selected");

  if (!ENABLE_MEDIA_UPLOADS) {
    throw new Error("Image uploads are currently disabled.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error(`Image size must be ${MAX_MEDIA_UPLOAD_MB}MB or less`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Not authenticated");
  }

  if (MEDIA_STORAGE_PROVIDER === "cloudinary") {
    const token = await getAccessToken();

    const signedResponse = await fetch(
      `${API_BASE_URL}/api/media/cloudinary/signature`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceType: "image",
          folder: `${CLOUDINARY_UPLOAD_FOLDER}/rooms/${roomId}`,
        }),
      },
    );

    if (!signedResponse.ok) {
      const errorMessage = await readErrorResponse(
        signedResponse,
        "Failed to initialize Cloudinary upload",
      );
      throw new Error(errorMessage);
    }

    const signedUpload = await signedResponse.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", String(signedUpload.apiKey));
    formData.append("timestamp", String(signedUpload.timestamp));
    formData.append("signature", signedUpload.signature);

    if (signedUpload.folder) {
      formData.append("folder", signedUpload.folder);
    }

    const uploadResponse = await fetch(signedUpload.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorMessage = await readErrorResponse(
        uploadResponse,
        "Cloudinary upload failed",
      );
      throw new Error(errorMessage);
    }

    const uploadData = await uploadResponse.json();
    const uploadedUrl = uploadData?.secure_url || uploadData?.url;

    if (!uploadedUrl) {
      throw new Error("Cloudinary upload did not return a media URL");
    }

    return uploadedUrl;
  }

  const extension = file.name.split(".").pop() || "jpg";
  const safeExtension = extension.toLowerCase();
  const filePath = `${roomId}/${userId}-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("room-media")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("room-media").getPublicUrl(filePath);

  return publicUrl;
}

// Fetch profiles by ids and return map
export async function fetchProfilesByIds(ids = []) {
  if (!ids.length) return {};
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .in("id", ids);
  if (error) throw error;
  return (profiles || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});
}
