import { useEffect, useState } from "react";
import { useUser } from "../../common/UserContext";
import Message from "./Message";
import {
  fetchMessages,
  subscribeMessages,
  unsubscribeMessages,
} from "../../../utils/messages";

export default function MessagesList() {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel;
    const load = async () => {
      try {
        const msgs = await fetchMessages("global");
        setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();

    // Subscribe to new messages
    channel = subscribeMessages("global", async (msg) => {
      try {
        // fetch profile for incoming message's user if not present
        const profMap = await import("../../../utils/messages").then((m) => m.fetchProfilesByIds([msg.user_id]));
        const merged = { ...msg, profiles: profMap[msg.user_id] || null };
        setMessages((prev) => [...prev, merged]);
      } catch (e) {
        // fallback: append raw message
        setMessages((prev) => [...prev, msg]);
      }
    });

    // Listen for client-side optimistic events (sendMessage dispatch)
    const onLocal = (e) => {
      const msg = e.detail;
      // normalize to match fetchMessages shape
      setMessages((prev) => [
        ...prev,
        { ...msg, profiles: msg.user_id ? { id: msg.user_id } : null },
      ]);
    };
    window.addEventListener("newMessage", onLocal);

    return () => {
      if (channel) unsubscribeMessages(channel);
      window.removeEventListener("newMessage", onLocal);
    };
  }, []);

  if (loading) return <div>Loading messages...</div>;

  return (
    <div>
      {messages.map((msg) => (
        <Message
          key={msg.id}
          user={msg.profiles?.username || "User"}
          color={"bg-red-600"}
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
