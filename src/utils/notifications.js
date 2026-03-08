import { supabase } from "./supabase";

/**
 * Fetch notifications for the current user
 * Returns notifications from DMs, mentions, and announcements
 */
export async function fetchNotifications(userId, limit = 20) {
  if (!userId) return [];

  try {
    const notifications = [];

    // 1. Fetch recent DMs sent to the user (from different conversations)
    const { data: dmMessages } = await supabase
      .from("direct_messages")
      .select(
        `
        id,
        content,
        created_at,
        sender_id,
        conversation_id,
        read,
        profiles:sender_id(id, username, avatar_url)
      `,
      )
      .neq("sender_id", userId) // Not sent by current user
      .order("created_at", { ascending: false })
      .limit(10);

    // Filter to only include messages where user is a participant
    if (dmMessages && dmMessages.length > 0) {
      // Get conversations where user is a participant
      const { data: userConversations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      const userConvoIds = new Set(
        (userConversations || []).map((c) => c.conversation_id),
      );

      dmMessages
        .filter((msg) => userConvoIds.has(msg.conversation_id))
        .forEach((msg) => {
          notifications.push({
            id: `dm-${msg.id}`,
            type: "dm",
            userId: msg.sender_id,
            username: msg.profiles?.username || "Someone",
            avatarUrl: msg.profiles?.avatar_url,
            message: "sent you a direct message",
            time: msg.created_at,
            read: msg.read || false,
            link: `/dm/${msg.conversation_id}`,
          });
        });
    }

    // 2. Fetch recent mentions in global chat
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (profile?.username) {
      const { data: mentions } = await supabase
        .from("messages")
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles:user_id(id, username, avatar_url)
        `,
        )
        .neq("user_id", userId) // Not sent by current user
        .ilike("content", `%@${profile.username}%`) // Contains @username
        .eq("room", "global")
        .order("created_at", { ascending: false })
        .limit(5);

      if (mentions) {
        mentions.forEach((msg) => {
          notifications.push({
            id: `mention-${msg.id}`,
            type: "mention",
            userId: msg.user_id,
            username: msg.profiles?.username || "Someone",
            avatarUrl: msg.profiles?.avatar_url,
            message: "mentioned you in Global Chat",
            time: msg.created_at,
            read: false, // You could track this separately in DB
            link: "/",
          });
        });
      }
    }

    // 3. Fetch recent follows (people who followed current user)
    const { data: follows } = await supabase
      .from("follows")
      .select(
        `
        id,
        created_at,
        follower_id,
        profiles:follower_id(id, username, avatar_url)
      `,
      )
      .eq("following_id", userId) // People who followed this user
      .order("created_at", { ascending: false })
      .limit(10);

    if (follows) {
      follows.forEach((follow) => {
        notifications.push({
          id: `follow-${follow.id}`,
          type: "follow",
          userId: follow.follower_id,
          username: follow.profiles?.username || "Someone",
          avatarUrl: follow.profiles?.avatar_url,
          message: "started following you",
          time: follow.created_at,
          read: false,
          link: `/user/${follow.follower_id}`,
        });
      });
    }

    // 4. You could add announcements here if you have an announcements table
    // For now, we'll skip this

    // Sort all notifications by time (newest first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Limit to requested number
    return notifications.slice(0, limit);
  } catch (error) {
    console.error("[Notifications] Error fetching:", error);
    return [];
  }
}

/**
 * Format relative time for notifications
 */
export function formatNotificationTime(timestamp) {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Mark notification as read (for DMs, update the message read status)
 */
export async function markNotificationRead(notificationId, type) {
  if (type === "dm") {
    const messageId = notificationId.replace("dm-", "");
    await supabase
      .from("direct_messages")
      .update({ read: true })
      .eq("id", messageId);
  }
  // For mentions and other types, you might want to create a separate notifications table
}
