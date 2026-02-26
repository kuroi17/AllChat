import { supabase } from "./supabase";

// Fetch messages for a room
export async function fetchMessages(room = "global") {
  // Fetch messages only, then fetch profiles separately to avoid
  // relying on a PostgREST foreign-key relationship which may not exist.
  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("*")
    .eq("room", room)
    .order("created_at", { ascending: true });

  if (msgErr) throw msgErr;

  // Collect unique user ids from messages
  const userIds = Array.from(
    new Set(messages.map((m) => m.user_id).filter(Boolean)),
  );

  let profilesMap = {};
  if (userIds.length) {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .in("id", userIds);

    if (!profErr && profiles) {
      profilesMap = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
    }
  }

  // Attach profile object (if any) to each message under `.profiles`
  const merged = messages.map((m) => ({
    ...m,
    profiles: profilesMap[m.user_id] || null,
  }));
  return merged;
}

// Send a message
export async function sendMessage({ userId, content, room = "global" }) {
  // Return the inserted row so callers can optimistically update UI.
  const { data, error } = await supabase
    .from("messages")
    .insert({ user_id: userId, content, room })
    .select()
    .single();

  if (error) throw error;

  // Emit a client-side event so local UI can update immediately
  try {
    window.dispatchEvent(new CustomEvent("newMessage", { detail: data }));
  } catch (e) {
    // ignore
  }

  return data;
}

// Subscribe to new messages
export function subscribeMessages(room = "global", callback) {
  const channel = supabase
    .channel(`messages-${room}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        if (payload.new.room === room) callback(payload.new);
      },
    )
    .subscribe();
  return channel;
}

// Remove subscription
export function unsubscribeMessages(channel) {
  supabase.removeChannel(channel);
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
