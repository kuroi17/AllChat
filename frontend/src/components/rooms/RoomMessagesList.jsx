import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "../../contexts/UserContext";
import {
  deleteMessage,
  fetchMessages,
  fetchProfilesByIds,
  subscribeMessages,
  unsubscribeMessages,
} from "../../utils/messages";
import {
  defaultSettings,
  playNotificationSoundEffect,
  subscribeChatSettings,
  triggerNotificationHaptic,
} from "../../utils/settings";

const DELETED_MARKER = "__BSUALLCHAT_ROOM_DELETED__";

function dedupeMessages(items = []) {
  const seen = new Set();
  return items.filter((msg) => {
    if (!msg?.id || seen.has(msg.id)) return false;
    seen.add(msg.id);
    return true;
  });
}

function normalizeMessageText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelyOptimisticMatch(optimisticMessage, incomingMessage) {
  if (!optimisticMessage?.optimistic || !incomingMessage) return false;
  if (!optimisticMessage.id?.startsWith("temp-room-")) return false;

  const optimisticText = normalizeMessageText(optimisticMessage.content);
  const incomingText = normalizeMessageText(incomingMessage.content);

  if (optimisticText !== incomingText) {
    return false;
  }

  if (optimisticMessage.user_id !== incomingMessage.user_id) {
    return false;
  }

  const optimisticTime = Date.parse(optimisticMessage.created_at || "");
  const incomingTime = Date.parse(incomingMessage.created_at || "");

  if (Number.isFinite(optimisticTime) && Number.isFinite(incomingTime)) {
    return Math.abs(incomingTime - optimisticTime) <= 45_000;
  }

  return true;
}

function mergeIncomingMessage(prevMessages, incomingMessage) {
  if (!incomingMessage?.id) {
    return prevMessages;
  }

  const existingIndex = prevMessages.findIndex(
    (item) => item.id === incomingMessage.id,
  );

  if (existingIndex !== -1) {
    const existingMessage = prevMessages[existingIndex];

    if (
      existingMessage?.profiles ||
      !incomingMessage?.profiles ||
      existingMessage.content === incomingMessage.content
    ) {
      return prevMessages;
    }

    const next = [...prevMessages];
    next[existingIndex] = {
      ...existingMessage,
      ...incomingMessage,
      optimistic: false,
    };
    return dedupeMessages(next);
  }

  const optimisticIndex = prevMessages.findIndex((item) =>
    isLikelyOptimisticMatch(item, incomingMessage),
  );

  if (optimisticIndex !== -1) {
    const next = [...prevMessages];
    const optimisticMessage = next[optimisticIndex] || {};
    next[optimisticIndex] = {
      ...incomingMessage,
      profiles: incomingMessage.profiles || optimisticMessage.profiles || null,
      optimistic: false,
    };
    return dedupeMessages(next);
  }

  return dedupeMessages([...prevMessages, incomingMessage]);
}

export default function RoomMessagesList({ roomId, onMediaUpdate }) {
  const { user, profile } = useUser();
  const [messages, setMessages] = useState([]);
  const [chatSettings, setChatSettings] = useState(defaultSettings);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const containerRef = useRef(null);
  const settingsRef = useRef(defaultSettings);

  const hiddenMessageStorageKey =
    user?.id && roomId ? `room_hidden_messages:${user.id}:${roomId}` : null;

  const roomKey = `room:${roomId}`;

  const { data: fetchedMessages, isLoading: loading } = useQuery({
    queryKey: ["messages", "room", roomId],
    queryFn: () => fetchMessages(roomKey),
    enabled: !!roomId,
  });

  useEffect(() => {
    settingsRef.current = chatSettings;
  }, [chatSettings]);

  useEffect(() => {
    const unsubscribe = subscribeChatSettings(setChatSettings);
    return unsubscribe;
  }, []);

  const notifyIncomingMessage = (incomingMessage) => {
    if (!incomingMessage?.user_id || incomingMessage.user_id === user?.id) {
      return;
    }

    const currentSettings = settingsRef.current;
    if (currentSettings?.doNotDisturb) return;

    if (currentSettings?.soundEffects) {
      playNotificationSoundEffect();
    }

    triggerNotificationHaptic();
  };

  useEffect(() => {
    if (!Array.isArray(fetchedMessages)) return;
    const incoming = fetchedMessages;
    setMessages((prev) => {
      const next =
        prev.length === 0
          ? dedupeMessages(incoming)
          : dedupeMessages([...incoming, ...prev]);

      if (
        next.length === prev.length &&
        next.every(
          (msg, index) =>
            msg.id === prev[index]?.id &&
            msg.content === prev[index]?.content &&
            msg.image_url === prev[index]?.image_url,
        )
      ) {
        return prev;
      }

      return next;
    });
  }, [fetchedMessages]);

  useEffect(() => {
    let mounted = true;
    let subscription;

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
              setMessages((prev) => mergeIncomingMessage(prev, merged));
              notifyIncomingMessage(merged);
            } catch (e) {
              setMessages((prev) => mergeIncomingMessage(prev, msg));
              notifyIncomingMessage(msg);
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

    const handleLocal = (event) => {
      const msg = event.detail;
      if (!msg || msg.room !== roomKey) return;
      const enriched = msg.profiles
        ? msg
        : {
            ...msg,
            profiles:
              msg.user_id === user?.id
                ? {
                    username: profile?.username || "You",
                    avatar_url: profile?.avatar_url || null,
                  }
                : null,
          };
      setMessages((prev) => dedupeMessages([...prev, enriched]));
    };

    const handleOptimistic = (event) => {
      const msg = event.detail;
      if (!msg || msg.room !== roomKey) return;
      setMessages((prev) => dedupeMessages([...prev, msg]));
    };

    const handleReplace = (event) => {
      const { clientTempId, message } = event.detail || {};
      if (!clientTempId || !message) return;
      if (message.room !== roomKey) return;
      setMessages((prev) => {
        const index = prev.findIndex(
          (item) =>
            item.id === clientTempId || item.clientTempId === clientTempId,
        );
        if (index === -1) {
          return dedupeMessages([...prev, message]);
        }

        const next = [...prev];
        const previous = next[index] || {};
        next[index] = {
          ...message,
          profiles: message.profiles || previous.profiles || null,
          optimistic: false,
        };
        return dedupeMessages(next);
      });
    };

    const handleRemove = (event) => {
      const { clientTempId } = event.detail || {};
      if (!clientTempId) return;
      setMessages((prev) =>
        prev.filter(
          (item) =>
            item.id !== clientTempId && item.clientTempId !== clientTempId,
        ),
      );
    };

    window.addEventListener("newMessage", handleLocal);
    window.addEventListener("roomMessage:optimistic", handleOptimistic);
    window.addEventListener("roomMessage:replace", handleReplace);
    window.addEventListener("roomMessage:remove", handleRemove);

    return () => {
      mounted = false;
      if (subscription) unsubscribeMessages(subscription);
      window.removeEventListener("newMessage", handleLocal);
      window.removeEventListener("roomMessage:optimistic", handleOptimistic);
      window.removeEventListener("roomMessage:replace", handleReplace);
      window.removeEventListener("roomMessage:remove", handleRemove);
    };
  }, [roomId, user?.id, profile?.username, profile?.avatar_url]);

  useEffect(() => {
    if (!hiddenMessageStorageKey) {
      setHiddenMessageIds([]);
      return;
    }

    try {
      const stored = localStorage.getItem(hiddenMessageStorageKey);
      if (!stored) {
        setHiddenMessageIds([]);
        return;
      }
      const parsed = JSON.parse(stored);
      setHiddenMessageIds(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.warn("[RoomMessagesList] Failed to read hidden messages", err);
      setHiddenMessageIds([]);
    }
  }, [hiddenMessageStorageKey]);

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
      .filter((msg) => msg.image_url && !hiddenMessageIds.includes(msg.id))
      .slice(-6)
      .reverse();
    onMediaUpdate(mediaItems);
  }, [messages, hiddenMessageIds, onMediaUpdate]);

  const persistHiddenMessageIds = (nextHiddenIds) => {
    if (!hiddenMessageStorageKey) return;
    localStorage.setItem(
      hiddenMessageStorageKey,
      JSON.stringify(nextHiddenIds),
    );
  };

  const handleDeleteForYou = (messageId) => {
    setHiddenMessageIds((prev) => {
      if (prev.includes(messageId)) return prev;
      const nextHiddenIds = [...prev, messageId];
      persistHiddenMessageIds(nextHiddenIds);
      return nextHiddenIds;
    });
    setActiveMenuId(null);
    setDeleteTarget(null);
  };

  const handleOpenDeleteModal = (message) => {
    setDeleteTarget(message);
  };

  const handleCloseDeleteModal = () => {
    if (deletingId) return;
    setDeleteTarget(null);
  };

  const handleDelete = async (messageId) => {
    try {
      setDeletingId(messageId);
      await deleteMessage(messageId);
      setActiveMenuId(null);
    } catch (err) {
      console.error("[RoomMessagesList] Delete failed:", err);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="px-3 sm:px-6 py-4 space-y-4 h-full animate-pulse">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`room-message-skeleton-${index}`}
            className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div className="max-w-[85%] w-64 bg-white rounded-2xl border border-gray-100 px-4 py-3 space-y-2 shadow-sm">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-44 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const visibleMessages = messages.filter(
    (msg) => !hiddenMessageIds.includes(msg.id),
  );
  const deleteTargetIsMe = deleteTarget?.user_id === user?.id;
  const deleteTargetIsDeleted =
    typeof deleteTarget?.content === "string" &&
    deleteTarget.content.startsWith(DELETED_MARKER);

  return (
    <>
      <div
        ref={containerRef}
        className="px-3 sm:px-6 py-4 space-y-4 overflow-y-auto h-full"
      >
        {visibleMessages.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        {visibleMessages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          const isDeleted =
            typeof msg.content === "string" &&
            msg.content.startsWith(DELETED_MARKER);
          const avatarUrl = msg.profiles?.avatar_url;
          const username = msg.profiles?.username || "User";
          const createdAtLabel = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

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
                    {createdAtLabel && (
                      <span className="text-[10px] text-gray-400">
                        {createdAtLabel}
                      </span>
                    )}
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

                    {!isDeleted && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuId((prev) =>
                            prev === msg.id ? null : msg.id,
                          )
                        }
                        className={`absolute top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                          isMe ? "-right-8" : "-left-8"
                        } ${
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
                      <div
                        className={`absolute mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            handleOpenDeleteModal(msg);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Delete message
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete message?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose how you want to delete this message.
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => handleDeleteForYou(deleteTarget.id)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Delete for me
              </button>

              {deleteTargetIsMe && !deleteTargetIsDeleted && (
                <button
                  type="button"
                  onClick={() => handleDelete(deleteTarget.id)}
                  disabled={deletingId === deleteTarget.id}
                  className="w-full rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {deletingId === deleteTarget.id
                    ? "Deleting..."
                    : "Delete for everyone"}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCloseDeleteModal}
              disabled={deletingId === deleteTarget.id}
              className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
