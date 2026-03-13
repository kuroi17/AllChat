import { supabase } from "./supabase";

// ==================== PRESENCE TRACKING ====================

/**
 * Update user's last_seen timestamp to track online presence
 */
export async function updatePresence(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", userId);

  if (error) console.error("[Presence] Update failed:", error);
}

/**
 * Fetch online users (last_seen within last 5 minutes)
 * @param {number} limit - Max number of users to return
 */
export async function fetchOnlineUsers(limit = 10) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio, last_seen")
    .gte("last_seen", fiveMinutesAgo)
    .order("last_seen", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Presence] Fetch online users failed:", error);
    return [];
  }

  return data || [];
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: followingId,
  });

  if (error) throw error;
  return true;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followingId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  if (error) throw error;
  return true;
}

/**
 * Fetch users the current user is following
 */
export async function fetchFollowing(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `
      following_id,
      profiles!follows_following_id_fkey(
        id,
        username,
        avatar_url,
        bio,
        last_seen
      )
    `,
    )
    .eq("follower_id", userId);

  if (error) {
    console.error("[Follows] Fetch following failed:", error);
    return [];
  }

  // Flatten the result
  return (data || []).map((f) => f.profiles).filter(Boolean);
}

/**
 * Fetch users following the current user
 */
export async function fetchFollowers(userId) {
  const { data, error } = await supabase
    .from("follows")
    .select(
      `
      follower_id,
      profiles!follows_follower_id_fkey(
        id,
        username,
        avatar_url,
        bio,
        last_seen
      )
    `,
    )
    .eq("following_id", userId);

  if (error) {
    console.error("[Follows] Fetch followers failed:", error);
    return [];
  }

  return (data || []).map((f) => f.profiles).filter(Boolean);
}

/**
 * Check if current user is following another user
 */
export async function isFollowing(userId, targetUserId) {
  const { data, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (error) {
    console.error("[Follows] Check following failed:", error);
    return false;
  }

  return !!data;
}

// ==================== DIRECT MESSAGES ====================

/**
 * Get or create a DM conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2) {
  // Check if conversation already exists
  const { data: existing } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .in("user_id", [userId1, userId2]);

  if (existing && existing.length >= 2) {
    // Find conversation that has both users
    const conversationIds = existing.map((p) => p.conversation_id);
    const duplicates = conversationIds.filter(
      (id, index) => conversationIds.indexOf(id) !== index,
    );

    if (duplicates.length > 0) {
      return duplicates[0]; // Return existing conversation
    }
  }

  // Create new conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({})
    .select()
    .single();

  if (convError) throw convError;

  // Add both participants
  const { error: partError } = await supabase
    .from("conversation_participants")
    .insert([
      { conversation_id: conversation.id, user_id: userId1 },
      { conversation_id: conversation.id, user_id: userId2 },
    ]);

  if (partError) throw partError;

  return conversation.id;
}

/**
 * Fetch all conversations for a user
 */
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      conversations(id, updated_at),
      last_read_at
    `,
    )
    .eq("user_id", userId)
    .order("last_read_at", { ascending: false });

  if (error) {
    console.error("[DM] Fetch conversations failed:", error);
    return [];
  }

  // Get other participant and last message for each conversation
  const enriched = await Promise.all(
    (data || []).map(async (conv) => {
      // Get other participant
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id, profiles(id, username, avatar_url, last_seen)")
        .eq("conversation_id", conv.conversation_id)
        .neq("user_id", userId);

      // Get last message
      const { data: lastMsg } = await supabase
        .from("direct_messages")
        .select("content, created_at, sender_id")
        .eq("conversation_id", conv.conversation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count unread messages
      const { count: unreadCount } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.conversation_id)
        .gt("created_at", conv.last_read_at || "1970-01-01")
        .neq("sender_id", userId);

      return {
        conversationId: conv.conversation_id,
        otherUser: participants?.[0]?.profiles || null,
        lastMessage: lastMsg,
        unreadCount: unreadCount || 0,
        updatedAt: conv.conversations?.updated_at,
      };
    }),
  );

  return enriched.filter((c) => c.otherUser);
}

/**
 * Fetch total unread direct messages for a user (across all conversations)
 */
export async function fetchUnreadDirectMessageCount(userId) {
  if (!userId) return 0;

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (conversationsError) {
    console.error("[DM] Fetch unread count failed:", conversationsError);
    return 0;
  }

  const counts = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.conversation_id)
        .gt("created_at", conv.last_read_at || "1970-01-01")
        .neq("sender_id", userId);

      return count || 0;
    }),
  );

  return counts.reduce((sum, count) => sum + count, 0);
}

/**
 * Send a direct message
 */
export async function sendDirectMessage({ conversationId, senderId, content }) {
  console.log("[sendDirectMessage] Inserting:", {
    conversationId,
    senderId,
    content,
  });

  // Check Supabase auth session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  console.log("[sendDirectMessage] Auth session:", {
    hasSession: !!session,
    sessionUserId: session?.user?.id,
    senderIdMatches: session?.user?.id === senderId,
  });

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("[sendDirectMessage] Insert failed:", error);
    throw error;
  }

  // Update conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

/**
 * Fetch messages in a conversation
 */
export async function fetchDirectMessages(conversationId, limit = 100) {
  const { data, error } = await supabase
    .from("direct_messages")
    .select(
      `
      *,
      profiles:sender_id(id, username, avatar_url)
    `,
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[DM] Fetch messages failed:", error);
    return [];
  }

  return (data || []).reverse(); // Oldest first
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId, userId) {
  const { error } = await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (error) console.error("[DM] Mark as read failed:", error);
}

// ==================== CAMPUS INFO ====================

/**
 * Fetch upcoming campus events
 */
export async function fetchCampusEvents(limit = 5) {
  const { data, error } = await supabase
    .from("campus_events")
    .select("*")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[Events] Fetch failed:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch latest announcements
 */
export async function fetchAnnouncements(limit = 3) {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Announcements] Fetch failed:", error);
    return [];
  }

  return data || [];
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("campus_events")
    .insert({
      title,
      description,
      event_date: eventDate,
      location,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create an announcement (admin/authenticated users)
 */
export async function createAnnouncement({ title, content }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      content,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
