import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../contexts/UserContext";
import Message from "./Message";
import ReportMessageModal from "../modals/ReportMessageModal";
import AppToast from "../common/AppToast";
import {
  addMessageReaction,
  fetchMessages,
  fetchProfilesByIds,
  removeMessageReaction,
  subscribeMessages,
  unsubscribeMessages,
} from "../../utils/messages";
import { submitMessageReport } from "../../utils/social";
import {
  defaultSettings,
  playNotificationSoundEffect,
  subscribeChatSettings,
  triggerNotificationHaptic,
} from "../../utils/settings";

const GLOBAL_MESSAGES_CACHE_KEY = "global_messages_cache_v1";

function dedupeMessagesById(items = []) {
  const uniq = [];
  const seen = new Set();

  for (const item of items) {
    if (!item || !item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    uniq.push(item);
  }

  return uniq;
}

export default function MessagesList({ scrollRef }) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [chatSettings, setChatSettings] = useState(defaultSettings);
  const containerRef = useRef(null);
  const profileCacheRef = useRef(new Map());
  const settingsRef = useRef(defaultSettings);
  const [reportTarget, setReportTarget] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState(null);

  const [initialMessages] = useState(() => {
    try {
      const cachedRaw = sessionStorage.getItem(GLOBAL_MESSAGES_CACHE_KEY);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
      return Array.isArray(cached) ? cached : [];
    } catch {
      return [];
    }
  });

  const { data: fetchedMessages, isLoading } = useQuery({
    queryKey: ["messages", "global"],
    queryFn: () => fetchMessages("global"),
    initialData: initialMessages.length ? initialMessages : undefined,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Helper to append message with dedup
  const appendMessage = (incoming) => {
    if (!incoming) return;
    const normalizedIncoming = {
      ...incoming,
      reactions: Array.isArray(incoming.reactions) ? incoming.reactions : [],
    };

    setMessages((prev) => {
      // dedupe by id (primary) or by content+timestamp fallback
      if (normalizedIncoming.id) {
        if (prev.some((p) => p.id === normalizedIncoming.id)) return prev;
        return [...prev, normalizedIncoming];
      }
      // fallback for messages without id yet
      if (
        prev.some(
          (p) =>
            p.content === normalizedIncoming.content &&
            p.created_at === normalizedIncoming.created_at,
        )
      )
        return prev;
      return [...prev, normalizedIncoming];
    });
  };

  const applyMessageReactions = (messageId, reactions) => {
    if (!messageId) return;
    const normalizedReactions = Array.isArray(reactions) ? reactions : [];

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, reactions: normalizedReactions }
          : message,
      ),
    );
  };

  const handleToggleReaction = async ({ messageId, emoji, reactedByMe }) => {
    if (!messageId || !emoji || !user?.id) return;

    const previousMessage = messages.find((item) => item.id === messageId);
    const previousReactions = Array.isArray(previousMessage?.reactions)
      ? previousMessage.reactions
      : [];

    if (reactedByMe) {
      let removed = false;
      const nextReactions = previousReactions.filter((item) => {
        if (!removed && item.user_id === user.id && item.emoji === emoji) {
          removed = true;
          return false;
        }
        return true;
      });
      applyMessageReactions(messageId, nextReactions);
    } else {
      applyMessageReactions(messageId, [
        ...previousReactions,
        {
          user_id: user.id,
          emoji,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    try {
      if (reactedByMe) {
        await removeMessageReaction(messageId, emoji);
      } else {
        await addMessageReaction(messageId, emoji);
      }
    } catch (error) {
      applyMessageReactions(messageId, previousReactions);
      setToast({
        type: "error",
        message: error.message || "Failed to update reaction.",
      });
      queryClient.invalidateQueries({ queryKey: ["messages", "global"] });
    }
  };

  const handleReportMessage = (target) => {
    if (!target?.userId) return;
    setReportTarget(target);
  };

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

  const handleSubmitReport = async ({ reason, description }) => {
    if (!reportTarget?.userId) return;
    try {
      setReporting(true);
      await submitMessageReport({
        messageId: reportTarget.messageId,
        messageType: "global",
        reportedUserId: reportTarget.userId,
        reason,
        description,
      });
      setReportTarget(null);
      setToast({
        type: "success",
        message: "Report submitted successfully. Thank you.",
      });
    } catch (error) {
      console.error("[MessagesList] Report submit failed:", error);
      setToast({
        type: "error",
        message: error.message || "Failed to submit report.",
      });
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => {
    if (!toast?.message) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    settingsRef.current = chatSettings;
  }, [chatSettings]);

  useEffect(() => {
    const unsubscribe = subscribeChatSettings(setChatSettings);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!Array.isArray(fetchedMessages)) return;

    fetchedMessages.forEach((msg) => {
      if (msg?.profiles?.id) {
        profileCacheRef.current.set(msg.profiles.id, msg.profiles);
      }
    });

    setMessages((prev) => {
      if (!prev.length) return dedupeMessagesById(fetchedMessages);
      return dedupeMessagesById([...fetchedMessages, ...prev]);
    });
  }, [fetchedMessages]);

  useEffect(() => {
    let mounted = true;
    let subscription;
    const bc =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("bsu_messages")
        : null;

    const setupRealtime = async () => {
      try {
        subscription = await subscribeMessages("global", {
          onNew: async (msg) => {
            if (!mounted) return;

            if (msg?.profiles?.id) {
              profileCacheRef.current.set(msg.profiles.id, msg.profiles);
              appendMessage(msg);
              bc?.postMessage(msg);
              notifyIncomingMessage(msg);
              return;
            }

            const cachedProfile = msg?.user_id
              ? profileCacheRef.current.get(msg.user_id)
              : null;

            if (cachedProfile) {
              const mergedFromCache = { ...msg, profiles: cachedProfile };
              appendMessage(mergedFromCache);
              bc?.postMessage(mergedFromCache);
              notifyIncomingMessage(mergedFromCache);
              return;
            }

            try {
              // fetch profile for incoming message's user if not present
              const profMap = await fetchProfilesByIds([msg.user_id]);
              const profile = profMap[msg.user_id] || null;

              if (profile?.id) {
                profileCacheRef.current.set(profile.id, profile);
              }

              const merged = { ...msg, profiles: profile };
              appendMessage(merged);
              bc?.postMessage(merged);
              notifyIncomingMessage(merged);
            } catch (e) {
              appendMessage(msg);
              bc?.postMessage(msg);
              notifyIncomingMessage(msg);
            }
          },
          onDeleted: (payload) => {
            if (!mounted) return;
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.id));
          },
          onReaction: (payload) => {
            if (!mounted) return;
            applyMessageReactions(payload?.messageId, payload?.reactions || []);
          },
        });
      } catch (error) {
        console.error("[MessagesList] Realtime subscribe failed:", error);
      }
    };

    setupRealtime();

    // Listen for messages from other tabs (same browser)
    if (bc) {
      bc.onmessage = (e) => {
        appendMessage(e.data);
      };
    }

    // Listen for client-side optimistic events (sendMessage dispatch)
    const onLocal = (e) => {
      const msg = e.detail;
      // normalize to match fetchMessages shape
      appendMessage({
        ...msg,
        profiles: msg.user_id ? { id: msg.user_id } : null,
      });
    };
    window.addEventListener("newMessage", onLocal);

    return () => {
      mounted = false;
      if (subscription) unsubscribeMessages(subscription);
      bc?.close();
      window.removeEventListener("newMessage", onLocal);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!messages.length) return;

    try {
      sessionStorage.setItem(
        GLOBAL_MESSAGES_CACHE_KEY,
        JSON.stringify(messages.slice(-200)),
      );
    } catch {
      // Ignore cache write failures.
    }
  }, [messages]);

  // Auto-scroll to bottom when messages update OR on initial load
  useEffect(() => {
    // prefer external scroll container if provided via prop
    const element = (scrollRef && scrollRef.current) || containerRef.current;
    if (!element) return;

    // Scroll immediately and after small delay to ensure DOM is updated
    const scrollToBottom = () => {
      element.scrollTop = element.scrollHeight;
    };

    scrollToBottom();
    const t = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length, scrollRef, isLoading]);

  const showLoading = isLoading && messages.length === 0;

  if (showLoading) {
    return (
      <div className="px-2 sm:px-6 py-4 space-y-3 sm:space-y-4 animate-pulse">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`global-skeleton-${index}`}
            className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div className="max-w-[70%] bg-white rounded-2xl px-4 py-3 shadow-sm space-y-2">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-40 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="px-2 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3"
    >
      {messages.map((msg) => (
        <Message
          key={msg.id}
          messageId={msg.id}
          user={msg.profiles?.username || "User"}
          userId={msg.user_id}
          avatarUrl={msg.profiles?.avatar_url}
          color={"bg-red-800"}
          time={new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          text={msg.content}
          reactions={msg.reactions}
          currentUserId={user?.id}
          me={msg.user_id === user.id}
          onReactToggle={handleToggleReaction}
          onReport={(payload) =>
            handleReportMessage({
              ...payload,
              messageId: msg.id,
            })
          }
        />
      ))}

      <ReportMessageModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
        reporting={reporting}
        reportedUsername={reportTarget?.username}
      />

      <AppToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
