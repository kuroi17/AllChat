import { supabase } from "./supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

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

  if (auth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed (${method} ${path})`;
    const errorMessage = await readErrorResponse(response, fallbackMessage);
    throw new Error(errorMessage);
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  return response.json();
}

// ==================== PRESENCE TRACKING ====================

/**
 * Update user's last_seen timestamp to track online presence
 */
export async function updatePresence(userId) {
  if (!userId) return;

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
      .map((item) => item?.profiles)
      .filter(Boolean);
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
      .map((item) => item?.profiles)
      .filter(Boolean);
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

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image size must be 8MB or less");
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
export async function fetchDirectMessages(conversationId, limit = 100) {
  if (!conversationId) return [];

  try {
    const safeLimit = Number.isFinite(limit) ? limit : 100;
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
