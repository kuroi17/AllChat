import { supabase } from "./supabase";

/**
 * Fetch notifications for the current user
 * Returns notifications from DMs, mentions, and announcements
 */
export async function fetchNotifications(userId, limit = 20) {
  if (!userId) return [];

  try {
    const notifications = [];

    // 1. Fetch unread DMs (based on each participant's last_read_at)
    const { data: userConversations, error: convError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId);

    if (convError) throw convError;

    const conversationIds = (userConversations || []).map(
      (c) => c.conversation_id,
    );
    const lastReadByConversation = new Map(
      (userConversations || []).map((c) => [
        c.conversation_id,
        c.last_read_at ? new Date(c.last_read_at).getTime() : 0,
      ]),
    );

    if (conversationIds.length > 0) {
      const { data: dmMessages, error: dmError } = await supabase
        .from("direct_messages")
        .select(
          `
          id,
          content,
          created_at,
          sender_id,
          conversation_id,
          profiles!direct_messages_sender_id_fkey(id, username, avatar_url)
        `,
        )
        .in("conversation_id", conversationIds)
        .neq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (dmError) throw dmError;

      (dmMessages || []).forEach((msg) => {
        const messageTime = new Date(msg.created_at).getTime();
        const lastReadTime =
          lastReadByConversation.get(msg.conversation_id) || 0;
        const isUnread = messageTime > lastReadTime;

        if (!isUnread) return;

        notifications.push({
          id: `dm-${msg.id}`,
          type: "dm",
          userId: msg.sender_id,
          username: msg.profiles?.username || "Someone",
          avatarUrl: msg.profiles?.avatar_url,
          message: "sent you a direct message",
          time: msg.created_at,
          read: false,
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
    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select(
        `
        created_at,
        follower_id,
        profiles!follows_follower_id_fkey(id, username, avatar_url)
      `,
      )
      .eq("following_id", userId) // People who followed this user
      .order("created_at", { ascending: false })
      .limit(10);

    if (followsError) throw followsError;

    if (follows) {
      follows.forEach((follow) => {
        notifications.push({
          id: `follow-${follow.follower_id}-${follow.created_at}`,
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data: message } = await supabase
      .from("direct_messages")
      .select("conversation_id")
      .eq("id", messageId)
      .maybeSingle();

    if (!message?.conversation_id) return;

    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", message.conversation_id)
      .eq("user_id", user.id);
  }
  // For mentions and other types, you might want to create a separate notifications table
}
