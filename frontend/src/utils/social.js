import { supabase } from "./supabase";
import { getChatSocket } from "./messages";
import {
  API_BASE_URL,
  ENABLE_MEDIA_UPLOADS,
  MAX_DIRECT_MESSAGE_CHARS,
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_MB,
  PRESENCE_ACTIVITY_THROTTLE_MS,
} from "./runtimeConfig";

const REQUEST_CACHE_TTL_MS = 20000;
const apiGetCache = new Map();
const pendingGetRequests = new Map();
let lastPresenceUpdateAt = 0;

function buildRequestCacheKey({ method, path, authKey }) {
  return `${method}:${path}:${authKey || "public"}`;
}

function getCachedResponse(cacheKey) {
  const entry = apiGetCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > REQUEST_CACHE_TTL_MS) {
    apiGetCache.delete(cacheKey);
    return null;
  }
  return entry.data;
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

async function readErrorResponse(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

async function requestApi(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  const normalizedMethod = method.toUpperCase();
  let authCacheKey = "";

  if (auth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
    authCacheKey = token.slice(-16);
  }

  const cacheKey = buildRequestCacheKey({
    method: normalizedMethod,
    path,
    authKey: authCacheKey,
  });

  if (normalizedMethod === "GET") {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) {
      return cached;
    }

    if (pendingGetRequests.has(cacheKey)) {
      return pendingGetRequests.get(cacheKey);
    }
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const executeRequest = async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: normalizedMethod,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const fallbackMessage = `Request failed (${normalizedMethod} ${path})`;
      const errorMessage = await readErrorResponse(response, fallbackMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;

    return response.json();
  };

  if (normalizedMethod !== "GET") {
    const result = await executeRequest();
    apiGetCache.clear();
    pendingGetRequests.clear();
    return result;
  }

  const pendingPromise = executeRequest()
    .then((result) => {
      apiGetCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    })
    .finally(() => {
      pendingGetRequests.delete(cacheKey);
    });

  pendingGetRequests.set(cacheKey, pendingPromise);
  return pendingPromise;
}

// ==================== PRESENCE TRACKING ====================

/**
 * Update user's last_seen timestamp to track online presence
 */
export async function updatePresence(userId) {
  if (!userId) return;

  const now = Date.now();
  if (now - lastPresenceUpdateAt < PRESENCE_ACTIVITY_THROTTLE_MS) {
    return;
  }

  lastPresenceUpdateAt = now;

  try {
    await requestApi("/api/users/me/presence", {
      method: "PATCH",
      auth: true,
      body: { lastSeen: new Date().toISOString() },
    });
  } catch (error) {
    console.error("[Presence] Update failed:", error);
  }
}

/**
 * Fetch online users (last_seen within last 5 minutes)
 * @param {number} limit - Max number of users to return
 */
export async function fetchOnlineUsers(limit = 10) {
  try {
    const safeLimit = Number.isFinite(limit) ? limit : 10;
    const data = await requestApi(
      `/api/users/online?limit=${encodeURIComponent(safeLimit)}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Presence] Fetch online users failed:", error);
    return [];
  }
}

/**
 * Check if a user is online (last_seen within 5 minutes)
 */
export function isUserOnline(lastSeen) {
  if (!lastSeen) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(lastSeen).getTime() > fiveMinutesAgo;
}

// ==================== FOLLOWING SYSTEM ====================

/**
 * Follow a user
 */
export async function followUser(followingId) {
  if (!followingId) {
    throw new Error("Missing user to follow");
  }

  await requestApi(`/api/users/${encodeURIComponent(followingId)}/follow`, {
    method: "POST",
    auth: true,
  });
  return true;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId) {
  if (!followingId) {
    throw new Error("Missing user to unfollow");
  }

  await requestApi(`/api/users/${encodeURIComponent(followingId)}/follow`, {
    method: "DELETE",
    auth: true,
  });
  return true;
}

/**
 * Fetch users the current user is following
 */
export async function fetchFollowing(userId) {
  if (!userId) return [];

  try {
    const data = await requestApi(
      `/api/users/${encodeURIComponent(userId)}/following`,
    );
    return (Array.isArray(data) ? data : [])
      .map((item) => item?.profiles || { id: item?.following_id })
      .filter((profile) => profile?.id);
  } catch (error) {
    console.error("[Follows] Fetch following failed:", error);
    return [];
  }
}

/**
 * Fetch users following the current user
 */
export async function fetchFollowers(userId) {
  if (!userId) return [];

  try {
    const data = await requestApi(
      `/api/users/${encodeURIComponent(userId)}/followers`,
    );
    return (Array.isArray(data) ? data : [])
      .map((item) => item?.profiles || { id: item?.follower_id })
      .filter((profile) => profile?.id);
  } catch (error) {
    console.error("[Follows] Fetch followers failed:", error);
    return [];
  }
}

/**
 * Check if current user is following another user
 */
export async function isFollowing(userId, targetUserId) {
  if (!userId || !targetUserId) return false;

  try {
    const data = await requestApi(
      `/api/users/${encodeURIComponent(userId)}/is-following/${encodeURIComponent(targetUserId)}`,
      { auth: true },
    );
    return !!data?.isFollowing;
  } catch (error) {
    console.error("[Follows] Check following failed:", error);
    return false;
  }
}

// ==================== DIRECT MESSAGES ====================

/**
 * Get or create a DM conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2) {
  if (!userId1 || !userId2) {
    throw new Error("Missing users for conversation");
  }

  const data = await requestApi(
    "/api/direct-messages/conversations/get-or-create",
    {
      method: "POST",
      auth: true,
      body: { targetUserId: userId2 },
    },
  );

  if (!data?.conversationId) {
    throw new Error("Failed to resolve conversation");
  }

  return data.conversationId;
}

/**
 * Fetch all conversations for a user
 */
export async function fetchConversations(userId) {
  if (!userId) return [];

  try {
    const data = await requestApi("/api/direct-messages/conversations", {
      auth: true,
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[DM] Fetch conversations failed:", error);
    return [];
  }
}

/**
 * Fetch context for a specific conversation
 */
export async function fetchConversationContext(conversationId) {
  if (!conversationId) {
    throw new Error("Missing conversation ID");
  }

  return requestApi(
    `/api/direct-messages/conversations/${encodeURIComponent(conversationId)}/context`,
    { auth: true },
  );
}

/**
 * Fetch total unread direct messages for a user (across all conversations)
 */
export async function fetchUnreadDirectMessageCount(userId) {
  if (!userId) return 0;

  try {
    const data = await requestApi(
      "/api/direct-messages/conversations/unread-count",
      { auth: true },
    );
    return Number(data?.count) || 0;
  } catch (error) {
    console.error("[DM] Fetch unread count failed:", error);
    return 0;
  }
}

/**
 * Upload an image to the DM media storage bucket
 */
export async function uploadDirectMessageImage({
  file,
  conversationId,
  userId,
}) {
  if (!file) throw new Error("No image selected");
  if (!conversationId || !userId)
    throw new Error("Missing conversation context");

  if (!ENABLE_MEDIA_UPLOADS) {
    throw new Error("Image uploads are currently disabled.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error(`Image size must be ${MAX_MEDIA_UPLOAD_MB}MB or less`);
  }

  const extension = file.name.split(".").pop() || "jpg";
  const safeExtension = extension.toLowerCase();
  const filePath = `${conversationId}/${userId}-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("dm-media")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("dm-media").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Send a direct message
 */
export async function sendDirectMessage({
  conversationId,
  senderId,
  content,
  imageUrl = null,
}) {
  if (!conversationId || !senderId) {
    throw new Error("Missing message context");
  }

  const cleanedContent = content?.trim() || "";

  if (!cleanedContent && !imageUrl) {
    throw new Error("Message must include text or an image");
  }

  if (cleanedContent.length > MAX_DIRECT_MESSAGE_CHARS) {
    throw new Error(
      `Message is too long (max ${MAX_DIRECT_MESSAGE_CHARS} characters).`,
    );
  }

  return requestApi("/api/direct-messages", {
    method: "POST",
    auth: true,
    body: {
      conversationId,
      content: cleanedContent,
      imageUrl,
    },
  });
}

/**
 * Unsend a direct message for everyone (sender only)
 */
export async function unsendDirectMessageForEveryone({ messageId, senderId }) {
  if (!messageId || !senderId) {
    throw new Error("Missing message ID or sender ID");
  }

  await requestApi(`/api/direct-messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    auth: true,
  });

  return true;
}

/**
 * Fetch messages in a conversation
 */
export async function fetchDirectMessages(conversationId, limit = 75) {
  if (!conversationId) return [];

  try {
    const safeLimit = Number.isFinite(limit) ? limit : 75;
    const data = await requestApi(
      `/api/direct-messages/${encodeURIComponent(conversationId)}?limit=${encodeURIComponent(safeLimit)}`,
      { auth: true },
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[DM] Fetch messages failed:", error);
    return [];
  }
}

/**
 * Fetch image media shared in a conversation
 */
export async function fetchDirectMessageMedia(conversationId, limit = 12) {
  if (!conversationId) return [];

  try {
    const safeLimit = Number.isFinite(limit) ? limit : 12;
    const data = await requestApi(
      `/api/direct-messages/conversations/${encodeURIComponent(conversationId)}/media?limit=${encodeURIComponent(safeLimit)}`,
      { auth: true },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[DM] Fetch shared media failed:", error);
    return [];
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId, userId) {
  if (!conversationId || !userId) return;

  try {
    await requestApi(
      `/api/direct-messages/conversations/${encodeURIComponent(conversationId)}/read`,
      {
        method: "PATCH",
        auth: true,
      },
    );
  } catch (error) {
    console.error("[DM] Mark as read failed:", error);
  }
}

// ==================== REPORTS ====================

export async function submitMessageReport({
  messageId,
  messageType,
  reportedUserId,
  roomId,
  conversationId,
  reason,
  description,
}) {
  if (!messageId || !messageType || !reason) {
    throw new Error("Missing report details");
  }

  return requestApi("/api/reports", {
    method: "POST",
    auth: true,
    body: {
      messageId,
      messageType,
      reportedUserId,
      roomId,
      conversationId,
      reason,
      description,
    },
  });
}

// ==================== REPORTS ====================

/**
 * Delete a conversation the current user is part of
 */
export async function deleteConversation(conversationId, userId) {
  if (!conversationId || !userId) {
    throw new Error("Missing conversation ID or user ID");
  }

  await requestApi(
    `/api/direct-messages/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: "DELETE",
      auth: true,
    },
  );

  return true;
}

export async function subscribeUserRealtime(
  userId,
  { onDirectMessageNotification, onFollowNotification } = {},
) {
  if (!userId) {
    throw new Error("Missing user ID");
  }

  const socket = await getChatSocket();

  const handleDirectMessageNotification = (payload) => {
    if (
      payload?.recipientId === userId &&
      typeof onDirectMessageNotification === "function"
    ) {
      onDirectMessageNotification(payload);
    }
  };

  const handleFollowNotification = (payload) => {
    if (
      payload?.followingId === userId &&
      typeof onFollowNotification === "function"
    ) {
      onFollowNotification(payload);
    }
  };

  socket.on("dm:notify", handleDirectMessageNotification);
  socket.on("follow:notify", handleFollowNotification);

  return {
    socket,
    handleDirectMessageNotification,
    handleFollowNotification,
  };
}

export function unsubscribeUserRealtime(subscription) {
  if (!subscription) return;

  subscription.socket.off(
    "dm:notify",
    subscription.handleDirectMessageNotification,
  );
  subscription.socket.off(
    "follow:notify",
    subscription.handleFollowNotification,
  );
}

export async function subscribeConversationRealtime(
  conversationId,
  { onInsert, onDelete } = {},
) {
  if (!conversationId) {
    throw new Error("Missing conversation ID");
  }

  const socket = await getChatSocket();

  await new Promise((resolve, reject) => {
    socket.emit("dm:join", { conversationId }, (ack) => {
      if (ack?.ok) {
        resolve();
      } else {
        reject(new Error(ack?.error || "Failed to join conversation room"));
      }
    });
  });

  const handleInsert = (message) => {
    if (
      message?.conversation_id === conversationId &&
      typeof onInsert === "function"
    ) {
      onInsert(message);
    }
  };

  const handleDelete = (payload) => {
    if (
      payload?.conversationId === conversationId &&
      typeof onDelete === "function"
    ) {
      onDelete(payload);
    }
  };

  socket.on("dm:new", handleInsert);
  socket.on("dm:deleted", handleDelete);

  return {
    socket,
    conversationId,
    handleInsert,
    handleDelete,
  };
}

export function unsubscribeConversationRealtime(subscription) {
  if (!subscription) return;

  subscription.socket.off("dm:new", subscription.handleInsert);
  subscription.socket.off("dm:deleted", subscription.handleDelete);
  subscription.socket.emit("dm:leave", {
    conversationId: subscription.conversationId,
  });
}

// ==================== CAMPUS INFO ====================

/**
 * Fetch upcoming campus events
 */
export async function fetchCampusEvents(limit = 5) {
  try {
    const safeLimit = Number.isFinite(limit) ? limit : 5;
    const data = await requestApi(
      `/api/events?limit=${encodeURIComponent(safeLimit)}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Events] Fetch failed:", error);
    return [];
  }
}

/**
 * Fetch latest announcements
 */
export async function fetchAnnouncements(limit = 3) {
  try {
    const safeLimit = Number.isFinite(limit) ? limit : 3;
    const data = await requestApi(
      `/api/announcements?limit=${encodeURIComponent(safeLimit)}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Announcements] Fetch failed:", error);
    return [];
  }
}

/**
 * Create a campus event (admin/authenticated users)
 */
export async function createCampusEvent({
  title,
  description,
  eventDate,
  location,
}) {
  return requestApi("/api/events", {
    method: "POST",
    auth: true,
    body: {
      title,
      description,
      location,
      eventDate,
    },
  });
}

/**
 * Create an announcement (admin/authenticated users)
 */
export async function createAnnouncement({ title, content }) {
  return requestApi("/api/announcements", {
    method: "POST",
    auth: true,
    body: {
      title,
      content,
    },
  });
}

// ==================== PUBLIC ROOMS ====================

/**
 * Fetch public rooms (MVP)
 */
export async function fetchPublicRooms(limit = 20) {
  try {
    const safeLimit = Number.isFinite(limit) ? limit : 20;
    const data = await requestApi(
      `/api/rooms?limit=${encodeURIComponent(safeLimit)}`,
      { auth: true },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Rooms] Fetch failed:", error);
    return [];
  }
}

/**
 * Fetch rooms the current user has joined
 */
export async function fetchJoinedRooms() {
  try {
    const data = await requestApi("/api/rooms/joined", { auth: true });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Rooms] Fetch joined failed:", error);
    return [];
  }
}

/**
 * Create a public room (authenticated)
 */
export async function createPublicRoom({
  title,
  description,
  isPublic = true,
  location = null,
  capacity = null,
}) {
  return requestApi("/api/rooms", {
    method: "POST",
    auth: true,
    body: { title, description, isPublic, location, capacity },
  });
}

/**
 * Fetch a single room by ID
 */
export async function fetchRoom(roomId) {
  if (!roomId) throw new Error("Missing room ID");
  return requestApi(`/api/rooms/${encodeURIComponent(roomId)}`, {
    auth: true,
  });
}

/**
 * Join a room (increments participant count on the server)
 */
export async function joinPublicRoom(roomId) {
  if (!roomId) throw new Error("Missing room ID");
  return requestApi(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: "POST",
    auth: true,
  });
}

/**
 * Create or fetch an invite token for a room
 */
export async function createRoomInvite(roomId) {
  if (!roomId) throw new Error("Missing room ID");
  return requestApi(`/api/rooms/${encodeURIComponent(roomId)}/invites`, {
    method: "POST",
    auth: true,
  });
}

/**
 * Fetch room preview (limited info)
 */
export async function fetchRoomPreview(roomId) {
  if (!roomId) throw new Error("Missing room ID");
  return requestApi(`/api/rooms/${encodeURIComponent(roomId)}/preview`, {
    auth: true,
  });
}

/**
 * Fetch invite preview (limited info)
 */
export async function fetchRoomInvitePreview(token) {
  if (!token) throw new Error("Missing invite token");
  return requestApi(`/api/rooms/invites/${encodeURIComponent(token)}/preview`, {
    auth: true,
  });
}

/**
 * Join a room with an invite token
 */
export async function joinRoomWithInvite(token) {
  if (!token) throw new Error("Missing invite token");
  return requestApi(`/api/rooms/invites/${encodeURIComponent(token)}/join`, {
    method: "POST",
    auth: true,
  });
}

/**
 * Fetch room members preview
 */
export async function fetchRoomMembers(roomId, limit = 6) {
  if (!roomId) return [];

  try {
    const safeLimit = Number.isFinite(limit) ? limit : 6;
    const data = await requestApi(
      `/api/rooms/${encodeURIComponent(roomId)}/members?limit=${encodeURIComponent(safeLimit)}`,
      { auth: true },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Rooms] Fetch members failed:", error);
    return [];
  }
}

/**
 * Update room avatar URL
 */
export async function updateRoomAvatar(roomId, avatarUrl) {
  if (!roomId || !avatarUrl) throw new Error("Missing room avatar data");
  return requestApi(`/api/rooms/${encodeURIComponent(roomId)}/avatar`, {
    method: "PATCH",
    auth: true,
    body: { avatarUrl },
  });
}

export async function uploadRoomAvatar({ roomId, file }) {
  if (!roomId) throw new Error("Missing room ID");
  if (!file) throw new Error("No image selected");

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size must be 5MB or less");
  }

  const extension = file.name.split(".").pop() || "jpg";
  const safeExtension = extension.toLowerCase();
  const filePath = `${roomId}/avatar-${Date.now()}.${safeExtension}`;

  const { error: uploadError } = await supabase.storage
    .from("room-avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("room-avatars").getPublicUrl(filePath);

  return publicUrl;
}
