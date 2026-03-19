import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import Message from "./Message";
import {
  fetchMessages,
  fetchProfilesByIds,
  subscribeMessages,
  unsubscribeMessages,
} from "../../utils/messages";

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
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  // Helper to append message with dedup
  const appendMessage = (incoming) => {
    if (!incoming) return;
    setMessages((prev) => {
      // dedupe by id (primary) or by content+timestamp fallback
      if (incoming.id) {
        if (prev.some((p) => p.id === incoming.id)) return prev;
        return [...prev, incoming];
      }
      // fallback for messages without id yet
      if (
        prev.some(
          (p) =>
            p.content === incoming.content &&
            p.created_at === incoming.created_at,
        )
      )
        return prev;
      return [...prev, incoming];
    });
  };

  useEffect(() => {
    let mounted = true;
    let subscription;
    const bc = new BroadcastChannel("bsu_messages");

    const load = async () => {
      let hydratedFromCache = false;

      try {
        const cachedRaw = sessionStorage.getItem(GLOBAL_MESSAGES_CACHE_KEY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

        if (Array.isArray(cached) && cached.length > 0) {
          setMessages(dedupeMessagesById(cached));
          setLoading(false);
          hydratedFromCache = true;
        }
      } catch {
        // Ignore cache read failures and continue to network fetch.
      }

      try {
        const msgs = await fetchMessages("global");
        const uniq = dedupeMessagesById(msgs);
        setMessages(uniq);
        sessionStorage.setItem(
          GLOBAL_MESSAGES_CACHE_KEY,
          JSON.stringify(uniq.slice(-200)),
        );
        console.log("[MessagesList] Loaded", uniq.length, "messages");
      } catch (err) {
        console.error("[MessagesList] Load error:", err);
      }

      if (!hydratedFromCache) {
        setLoading(false);
      }
    };
    load();

    const setupRealtime = async () => {
      try {
        subscription = await subscribeMessages("global", {
          onNew: async (msg) => {
            if (!mounted) return;

            console.log("[MessagesList] Realtime message received:", msg.id);

            try {
              // fetch profile for incoming message's user if not present
              const profMap = await fetchProfilesByIds([msg.user_id]);
              const merged = { ...msg, profiles: profMap[msg.user_id] || null };
              appendMessage(merged);
              bc.postMessage(merged);
            } catch (e) {
              console.warn(
                "[MessagesList] Failed to fetch profile, appending raw:",
                e,
              );
              appendMessage(msg);
              bc.postMessage(msg);
            }
          },
          onDeleted: (payload) => {
            if (!mounted) return;
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.id));
          },
        });
        console.log("[MessagesList] Subscribed to Socket.IO room");
      } catch (error) {
        console.error("[MessagesList] Realtime subscribe failed:", error);
      }
    };

    setupRealtime();

    // Listen for messages from other tabs (same browser)
    bc.onmessage = (e) => {
      console.log("[MessagesList] BroadcastChannel message received:", e.data);
      appendMessage(e.data);
    };

    // Listen for client-side optimistic events (sendMessage dispatch)
    const onLocal = (e) => {
      const msg = e.detail;
      console.log("[MessagesList] Local newMessage event:", msg);
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
      bc.close();
      window.removeEventListener("newMessage", onLocal);
    };
  }, []);

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
  }, [messages.length, scrollRef, loading]);

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
      className="px-2 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3"
    >
      {messages.map((msg) => (
        <Message
          key={msg.id}
          user={msg.profiles?.username || "User"}
          userId={msg.user_id}
          avatarUrl={msg.profiles?.avatar_url}
          color={"bg-red-800"}
          time={new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          text={msg.content}
          me={msg.user_id === user.id}
        />
      ))}
    </div>
  );
}
