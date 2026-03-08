import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import Message from "./Message";
import {
  fetchMessages,
  subscribeMessages,
  unsubscribeMessages,
} from "../../utils/messages";

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
    let channel;
    const bc = new BroadcastChannel("bsu_messages");

    const load = async () => {
      try {
        const msgs = await fetchMessages("global");
        // dedupe initial fetch by id
        const uniq = [];
        const seen = new Set();
        for (const m of msgs) {
          if (m && m.id && !seen.has(m.id)) {
            seen.add(m.id);
            uniq.push(m);
          }
        }
        setMessages(uniq);
        console.log("[MessagesList] Loaded", uniq.length, "messages");
      } catch (err) {
        console.error("[MessagesList] Load error:", err);
      }
      setLoading(false);
    };
    load();

    // Subscribe to new messages from Supabase Realtime
    channel = subscribeMessages("global", async (msg) => {
      console.log("[MessagesList] Realtime message received:", msg.id);
      try {
        // fetch profile for incoming message's user if not present
        const profMap = await import("../../utils/messages").then((m) =>
          m.fetchProfilesByIds([msg.user_id]),
        );
        const merged = { ...msg, profiles: profMap[msg.user_id] || null };
        console.log(
          "[MessagesList] Appending realtime message with profile:",
          merged,
        );
        appendMessage(merged);
        // broadcast to other tabs in same browser
        bc.postMessage(merged);
      } catch (e) {
        // fallback: append raw message
        console.warn(
          "[MessagesList] Failed to fetch profile, appending raw:",
          e,
        );
        appendMessage(msg);
        bc.postMessage(msg);
      }
    });
    console.log("[MessagesList] Subscribed to Supabase realtime channel");

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
      if (channel) unsubscribeMessages(channel);
      bc.close();
      window.removeEventListener("newMessage", onLocal);
    };
  }, []);

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
    <div ref={containerRef} className="px-6 py-4 space-y-3">
      {messages.map((msg) => (
        <Message
          key={msg.id}
          user={msg.profiles?.username || "User"}
          userId={msg.user_id}
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
