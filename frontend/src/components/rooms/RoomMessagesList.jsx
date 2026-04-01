import { useEffect, useRef, useState } from "react";
import { Loader2, MoreVertical } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import {
  deleteMessage,
  fetchMessages,
  fetchProfilesByIds,
  subscribeMessages,
  unsubscribeMessages,
} from "../../utils/messages";

const DELETED_MARKER = "__BSUALLCHAT_ROOM_DELETED__";

function dedupeMessages(items = []) {
  const seen = new Set();
  return items.filter((msg) => {
    if (!msg?.id || seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}

export default function RoomMessagesList({ roomId, onMediaUpdate }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let subscription;
    const roomKey = `room:${roomId}`;

    const load = async () => {
      try {
        const items = await fetchMessages(roomKey);
        if (!mounted) return;
        setMessages(dedupeMessages(items));
      } catch (err) {
        console.error("[RoomMessagesList] Load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const setupRealtime = async () => {
      try {
        subscription = await subscribeMessages(roomKey, {
          onNew: async (msg) => {
            if (!mounted) return;
            if (!msg) return;

            try {
              const profMap = await fetchProfilesByIds([msg.user_id]);
              const merged = {
                ...msg,
                profiles: profMap[msg.user_id] || msg.profiles || null,
              };
              setMessages((prev) => dedupeMessages([...prev, merged]));
            } catch (e) {
              setMessages((prev) => dedupeMessages([...prev, msg]));
            }
          },
          onDeleted: (payload) => {
            if (!mounted) return;
            if (!payload?.id) return;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.id
                  ? {
                      ...msg,
                      content: DELETED_MARKER,
                      image_url: null,
                      deletedByUsername: payload.senderUsername,
                    }
                  : msg,
              ),
            );
          },
        });
      } catch (error) {
        console.error("[RoomMessagesList] Realtime subscribe failed:", error);
      }
    };

    setupRealtime();

    return () => {
      mounted = false;
      if (subscription) unsubscribeMessages(subscription);
    };
  }, [roomId]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const scrollToBottom = () => {
      element.scrollTop = element.scrollHeight;
    };

    scrollToBottom();
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length, loading]);

  useEffect(() => {
    if (typeof onMediaUpdate !== "function") return;
    const mediaItems = messages
      .filter((msg) => msg.image_url)
      .slice(-6)
      .reverse();
    onMediaUpdate(mediaItems);
  }, [messages, onMediaUpdate]);

  const handleDelete = async (messageId) => {
    try {
      setDeletingId(messageId);
      await deleteMessage(messageId);
      setActiveMenuId(null);
    } catch (err) {
      console.error("[RoomMessagesList] Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="px-3 sm:px-6 py-4 space-y-4 overflow-y-auto h-full"
    >
      {messages.length === 0 && (
        <div className="text-center text-sm text-gray-500 py-8">
          No messages yet. Start the conversation!
        </div>
      )}
      {messages.map((msg) => {
        const isMe = msg.user_id === user?.id;
        const isDeleted =
          typeof msg.content === "string" &&
          msg.content.startsWith(DELETED_MARKER);
        const avatarUrl = msg.profiles?.avatar_url;
        const username = msg.profiles?.username || "User";

        return (
          <div
            key={msg.id}
            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`group relative flex gap-3 max-w-[85%] ${
                isMe ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white text-xs font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-800">
                    {username}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`relative rounded-2xl px-3 py-2 text-xs sm:text-sm shadow-sm ${
                    isMe ? "bg-red-800 text-white" : "bg-white text-gray-700"
                  }`}
                >
                  {isDeleted ? (
                    <p className="italic text-gray-300">Message deleted</p>
                  ) : (
                    <>
                      {msg.image_url && (
                        <img
                          src={msg.image_url}
                          alt="Room media"
                          className="mb-2 w-full max-w-60 rounded-xl object-cover"
                        />
                      )}
                      {msg.content && (
                        <p className="whitespace-pre-wrap wrap-anywhere">
                          {msg.content}
                        </p>
                      )}
                    </>
                  )}

                  {isMe && !isDeleted && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId((prev) =>
                          prev === msg.id ? null : msg.id,
                        )
                      }
                      className={`absolute -right-8 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                        activeMenuId === msg.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-label="Message options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}

                  {activeMenuId === msg.id && !isDeleted && (
                    <div className="absolute right-0 mt-2 w-36 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleDelete(msg.id)}
                        disabled={deletingId === msg.id}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {deletingId === msg.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
