import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Phone,
  Video,
  Loader2,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../utils/supabase";
import {
  getOrCreateConversation,
  fetchDirectMessages,
  sendDirectMessage,
  markConversationAsRead,
  isUserOnline,
} from "../utils/social";

export default function DirectMessage() {
  const { conversationId: routeConversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [conversationId, setConversationId] = useState(routeConversationId);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    initializeConversation();
  }, [routeConversationId, searchParams]);

  useEffect(() => {
    if (conversationId && user) {
      loadMessages();
      markConversationAsRead(conversationId, user.id);

      // Subscribe to new messages
      const channel = supabase
        .channel(`dm:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMessage = payload.new;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
            scrollToBottom();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  async function initializeConversation() {
    try {
      setLoading(true);

      // If no conversationId in route, check for userId in query params to create new conversation
      if (!routeConversationId) {
        const userId = searchParams.get("userId");
        if (!userId) {
          navigate(-1);
          return;
        }

        // Create or get existing conversation
        const conversationId = await getOrCreateConversation(user.id, userId);
        if (conversationId) {
          // Redirect to the conversation URL
          navigate(`/dm/${conversationId}`, { replace: true });
          setConversationId(conversationId);
        }
        return;
      }

      // Fetch conversation participants to get other user
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", routeConversationId);

      if (participantsError) throw participantsError;

      const otherUserId = participants.find(
        (p) => p.user_id !== user.id,
      )?.user_id;
      if (!otherUserId) {
        throw new Error("Other user not found");
      }

      // Fetch other user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();

      if (profileError) throw profileError;

      setOtherUser({
        ...profile,
        isOnline: isUserOnline(profile.last_seen),
      });
    } catch (error) {
      console.error("Error initializing conversation:", error);
      
      // Set user-friendly error message
      if (error.code === '42P17') {
        setError("Database not set up. Please run the migration SQL first.");
      } else if (error.code === 'PGRST200') {
        setError("Database tables are missing. Please run the migration SQL.");
      } else {
        setError("Failed to load conversation. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    try {
      const msgs = await fetchDirectMessages(conversationId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!messageText.trim() || sending || !conversationId) return;

    try {
      setSending(true);
      const trimmedText = messageText.trim();
      setMessageText("");

      await sendDirectMessage(conversationId, user.id, trimmedText);
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageText(trimmedText); // Restore message on error
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <Sidebar showExtras={false} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <Sidebar showExtras={false} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Conversation not found
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-800 text-sm mb-2">{error}</p>
              {error.includes("migration") && (
                <p className="text-red-600 text-xs">
                  Run database_setup.sql in your Supabase SQL Editor
                </p>
              )}
            </div>
            <button
              onClick={() => navigate(-1)}
              className=" cursor-pointer px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Go back
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <Sidebar showExtras={false} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />

      {/* Main DM chat area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* DM Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {/* Other user info */}
              <div className="flex items-center gap-3">
                <div
                  className="relative cursor-pointer"
                  onClick={() => navigate(`/user/${otherUser.id}`)}
                >
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold">
                      {(otherUser.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {otherUser.username || "Anonymous"}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {otherUser.isOnline ? "Active now" : "Offline"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages area - scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
          <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-3 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar (only for other user) */}
                      {!isMe && (
                        <div className="shrink-0">
                          {otherUser.avatar_url ? (
                            <img
                              src={otherUser.avatar_url}
                              alt={otherUser.username}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white text-sm font-bold">
                              {(otherUser.username || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message bubble */}
                      <div>
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isMe
                              ? "bg-red-600 text-white rounded-br-sm"
                              : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed wrap-break-word">
                            {msg.content}
                          </p>
                        </div>
                        <p
                          className={`text-xs text-gray-500 mt-1 ${
                            isMe ? "text-right" : "text-left"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input - fixed at bottom */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3">
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500 transition-all">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder={`Message ${otherUser.username || "user"}...`}
                  rows="1"
                  className="w-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500"
                  style={{ maxHeight: "120px" }}
                  disabled={sending}
                />
              </div>
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Right sidebar - optional user info panel */}
      <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden xl:block">
        <div className="p-6">
          {/* User profile card */}
          <div className="text-center">
            <div className="mx-auto w-24 h-24 mb-4">
              {otherUser.avatar_url ? (
                <img
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-red-800 flex items-center justify-center text-white text-3xl font-bold">
                  {otherUser.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {otherUser.username}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {otherUser.isOnline ? "Active now" : "Offline"}
            </p>

            <button
              onClick={() => navigate(`/user/${otherUser.id}`)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              View Profile
            </button>
          </div>

          {/* Shared content section */}
          <div className="mt-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Shared Media
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="aspect-square bg-gray-200 rounded-lg"
                ></div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="mt-8 space-y-2">
            <button className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Search in Conversation
            </button>
            <button className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              Mute Notifications
            </button>
            <button className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
              Block User
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
