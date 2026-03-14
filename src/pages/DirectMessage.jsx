import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Loader2,
  UserPlus,
  UserMinus,
  ImagePlus,
  X,
  MoreVertical,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import EmojiPickerButton from "../components/common/EmojiPickerButton";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../utils/supabase";
import {
  getOrCreateConversation,
  fetchDirectMessages,
  fetchDirectMessageMedia,
  sendDirectMessage,
  uploadDirectMessageImage,
  markConversationAsRead,
  unsendDirectMessageForEveryone,
  isUserOnline,
  isFollowing,
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
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
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [sharedMedia, setSharedMedia] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const imageInputRef = useRef(null);

  const hiddenMessageStorageKey =
    user?.id && conversationId
      ? `dm_hidden_messages:${user.id}:${conversationId}`
      : null;

  const visibleMessages = messages.filter(
    (msg) => !hiddenMessageIds.includes(msg.id),
  );

  const visibleSharedMedia = sharedMedia.filter(
    (item) => !hiddenMessageIds.includes(item.id),
  );

  useEffect(() => {
    initializeConversation();
  }, [routeConversationId, searchParams]);

  useEffect(() => {
    if (conversationId && user) {
      loadMessages();
      loadSharedMedia(conversationId);
      markConversationAsRead(conversationId, user.id);

      // Subscribe to new messages
      const channel = supabase
        .channel(`dm:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const deletedMessageId = payload.old?.id;
            if (!deletedMessageId) return;

            setMessages((prev) =>
              prev.filter((m) => m.id !== deletedMessageId),
            );
            setSharedMedia((prev) =>
              prev.filter((item) => item.id !== deletedMessageId),
            );
            setActiveMessageMenuId((prev) =>
              prev === deletedMessageId ? null : prev,
            );
          },
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log(
              "[DirectMessage] Realtime message received:",
              payload.new,
            );
            const newMessage = payload.new;
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === newMessage.id)) {
                console.log("[DirectMessage] Duplicate message, skipping");
                return prev;
              }
              console.log("[DirectMessage] Adding new message to state");
              return [...prev, newMessage];
            });

            if (newMessage.image_url) {
              setSharedMedia((prev) => {
                if (prev.some((item) => item.id === newMessage.id)) return prev;
                return [newMessage, ...prev].slice(0, 12);
              });
            }

            markConversationAsRead(conversationId, user.id);
            scrollToBottom();
          },
        )
        .subscribe((status) => {
          console.log("[DirectMessage] Subscription status:", status);
        });

      return () => {
        console.log("[DirectMessage] Cleaning up realtime subscription");
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (!hiddenMessageStorageKey) {
      setHiddenMessageIds([]);
      return;
    }

    try {
      const raw = localStorage.getItem(hiddenMessageStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];

      if (Array.isArray(parsed)) {
        setHiddenMessageIds(parsed);
      } else {
        setHiddenMessageIds([]);
      }
    } catch (error) {
      console.error("Failed to load hidden DM messages:", error);
      setHiddenMessageIds([]);
    }
  }, [hiddenMessageStorageKey]);

  useEffect(() => {
    if (!activeMessageMenuId) return;

    const handleDocumentClick = () => {
      setActiveMessageMenuId(null);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeMessageMenuId]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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

      // Load follow status and counts
      const [followStatus, followers, followingList] = await Promise.all([
        isFollowing(user.id, otherUserId),
        fetchFollowers(otherUserId),
        fetchFollowing(otherUserId),
      ]);
      setFollowing(followStatus);
      setFollowerCount(followers.length);
      setFollowingCount(followingList.length);
    } catch (error) {
      console.error("Error initializing conversation:", error);

      // Set user-friendly error message
      if (error.code === "42P17") {
        setError("Database not set up. Please run the migration SQL first.");
      } else if (error.code === "PGRST200") {
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
      setLoadingMessages(true);
      const msgs = await fetchDirectMessages(conversationId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadSharedMedia(targetConversationId) {
    if (!targetConversationId) return;

    const media = await fetchDirectMessageMedia(targetConversationId, 12);
    setSharedMedia(media);
  }

  function clearSelectedImage() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(null);
    setImagePreviewUrl("");
  }

  function persistHiddenMessageIds(nextHiddenIds) {
    if (!hiddenMessageStorageKey) return;

    localStorage.setItem(
      hiddenMessageStorageKey,
      JSON.stringify(nextHiddenIds),
    );
  }

  function handleUnsendForYou(messageId) {
    setHiddenMessageIds((prev) => {
      if (prev.includes(messageId)) return prev;

      const nextHiddenIds = [...prev, messageId];
      persistHiddenMessageIds(nextHiddenIds);
      return nextHiddenIds;
    });

    setActiveMessageMenuId(null);
  }

  async function handleUnsendForEveryone(messageId) {
    if (!user?.id || deletingMessageId) return;

    const confirmed = window.confirm(
      "Unsend this message for everyone in this conversation?",
    );

    if (!confirmed) return;

    try {
      setDeletingMessageId(messageId);
      await unsendDirectMessageForEveryone({
        messageId,
        senderId: user.id,
      });

      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      setSharedMedia((prev) => prev.filter((item) => item.id !== messageId));

      setHiddenMessageIds((prev) => {
        if (!prev.includes(messageId)) return prev;

        const nextHiddenIds = prev.filter((id) => id !== messageId);
        persistHiddenMessageIds(nextHiddenIds);
        return nextHiddenIds;
      });
    } catch (error) {
      console.error("Error unsending message for everyone:", error);
      alert(error.message || "Failed to unsend message for everyone.");
    } finally {
      setDeletingMessageId(null);
      setActiveMessageMenuId(null);
    }
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("Image size must be 8MB or less.");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    event.target.value = "";
  }

  function handleInsertEmoji(emoji) {
    setMessageText((prev) => `${prev}${emoji}`);
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    const trimmedText = messageText.trim();
    if ((!trimmedText && !selectedImage) || sending || !conversationId) return;

    try {
      setSending(true);
      setUploadingImage(!!selectedImage);
      setMessageText("");

      let imageUrl = null;

      if (selectedImage) {
        imageUrl = await uploadDirectMessageImage({
          file: selectedImage,
          conversationId,
          userId: user.id,
        });
      }

      console.log("[DirectMessage] Sending message:", {
        conversationId,
        senderId: user.id,
        userId: user?.id,
        content: trimmedText,
        imageUrl,
      });

      const sentMessage = await sendDirectMessage({
        conversationId,
        senderId: user.id,
        content: trimmedText,
        imageUrl,
      });

      console.log("[DirectMessage] Message sent successfully:", sentMessage);

      // Add message to UI immediately (optimistic update)
      setMessages((prev) => [...prev, sentMessage]);

      if (sentMessage.image_url) {
        setSharedMedia((prev) => {
          if (prev.some((item) => item.id === sentMessage.id)) return prev;
          return [sentMessage, ...prev].slice(0, 12);
        });
      }

      clearSelectedImage();
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageText(trimmedText); // Restore message on error
      alert(error.message || "Failed to send message");
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  }

  async function handleFollowToggle() {
    if (!user || !otherUser || actionLoading) return;

    try {
      setActionLoading(true);
      if (following) {
        await unfollowUser(otherUser.id);
        setFollowing(false);
        setFollowerCount((prev) => prev - 1);
      } else {
        await followUser(otherUser.id);
        setFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setActionLoading(false);
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
        <div className="hidden md:block">
          <Sidebar showExtras={false} />
        </div>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <div className="hidden md:block">
          <Sidebar showExtras={false} />
        </div>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-4 sm:p-6">
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
              className=" cursor-pointer px-6 py-2 bg-red-800 text-white rounded-xl hover:bg-red-700 transition-colors"
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
        <div className="hidden md:block">
          <Sidebar showExtras={false} />
        </div>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      {/* Main DM chat area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* DM Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Other user info */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className="relative cursor-pointer"
                  onClick={() => navigate(`/user/${otherUser.id}`)}
                >
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold">
                      {(otherUser.username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  {otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {otherUser.username || "Anonymous"}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {otherUser.isOnline ? "Active now" : "Offline"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Messages area - scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-gray-50"
        >
          <div className="max-w-4xl mx-auto px-2 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                const isMenuOpen = activeMessageMenuId === msg.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`group relative flex gap-2 sm:gap-3 max-w-[88%] sm:max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
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
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveMessageMenuId((prev) =>
                              prev === msg.id ? null : msg.id,
                            );
                          }}
                          className={`absolute top-0 z-10 h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors flex items-center justify-center ${
                            isMe ? "-left-8 sm:-left-9" : "-right-8 sm:-right-9"
                          } ${isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          aria-label="Message options"
                          title="Message options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={(event) => event.stopPropagation()}
                            className={`absolute top-8 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
                              isMe ? "left-0" : "right-0"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUnsendForYou(msg.id)}
                              className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Unsend for you
                            </button>

                            {isMe && (
                              <button
                                type="button"
                                onClick={() => handleUnsendForEveryone(msg.id)}
                                disabled={deletingMessageId === msg.id}
                                className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {deletingMessageId === msg.id
                                  ? "Unsending..."
                                  : "Unsend for everyone"}
                              </button>
                            )}
                          </div>
                        )}

                        <div
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${
                            isMe
                              ? "bg-red-800 text-white rounded-br-sm"
                              : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          {msg.image_url && (
                            <a
                              href={msg.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={msg.image_url}
                                alt="Shared media"
                                className="rounded-xl w-full max-w-65 max-h-75 object-cover mb-2"
                              />
                            </a>
                          )}

                          {msg.content && (
                            <p className="text-xs sm:text-sm leading-relaxed wrap-break-word">
                              {msg.content}
                            </p>
                          )}
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
        <div className="bg-white border-t border-gray-200 px-2 sm:px-6 py-2 sm:py-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            {imagePreviewUrl && (
              <div className="mb-2 sm:mb-3 inline-flex items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 bg-gray-50 px-2 sm:px-3 py-2 max-w-full">
                <img
                  src={imagePreviewUrl}
                  alt="Selected attachment"
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0"
                />
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    Image ready to send
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-55">
                    {selectedImage?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedImage}
                  className="w-7 h-7 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form
              onSubmit={handleSendMessage}
              className="flex items-end gap-2 sm:gap-3"
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="p-2.5 sm:p-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-red-700 transition-colors shrink-0"
                title="Attach image"
                aria-label="Attach image"
                disabled={sending || uploadingImage}
              >
                <ImagePlus className="w-5 h-5" />
              </button>

              <EmojiPickerButton
                onSelect={handleInsertEmoji}
                disabled={sending || uploadingImage}
              />

              <div className="flex-1 bg-gray-100 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-red-500 transition-all">
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
                  className="w-full bg-transparent border-none outline-none resize-none text-sm sm:text-base text-gray-900 placeholder-gray-500"
                  style={{ maxHeight: "120px" }}
                  disabled={sending || uploadingImage}
                />
              </div>
              <button
                type="submit"
                disabled={
                  (!messageText.trim() && !selectedImage) ||
                  sending ||
                  uploadingImage
                }
                className="p-2.5 sm:p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending || uploadingImage ? (
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
            <p className="text-sm text-gray-500 mb-3">
              {otherUser.isOnline ? "Active now" : "Offline"}
            </p>

            {/* Follower/Following counts */}
            <div className="flex items-center justify-center gap-6 mb-4 text-sm">
              <div>
                <span className="font-bold text-gray-900">{followerCount}</span>
                <span className="text-gray-600"> Followers</span>
              </div>
              <div>
                <span className="font-bold text-gray-900">
                  {followingCount}
                </span>
                <span className="text-gray-600"> Following</span>
              </div>
            </div>

            {/* Follow button */}
            {following ? (
              <button
                onClick={handleFollowToggle}
                disabled={actionLoading}
                className="w-full mb-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserMinus className="w-4 h-4" />
                )}
                Unfollow
              </button>
            ) : (
              <button
                onClick={handleFollowToggle}
                disabled={actionLoading}
                className="w-full mb-2 px-4 py-2 bg-red-800 text-white rounded-xl hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Follow
              </button>
            )}

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
            {visibleSharedMedia.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-xs text-gray-500 text-center">
                No images shared in this conversation yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visibleSharedMedia.map((item) => (
                  <a
                    key={item.id}
                    href={item.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                    title="Open image"
                  >
                    <img
                      src={item.image_url}
                      alt="Conversation media"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Options
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
          </div> */}
        </div>
      </aside>
    </div>
  );
}
