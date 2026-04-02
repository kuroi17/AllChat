import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import DirectMessageHeader from "../components/directMessage/DirectMessageHeader";
import DirectMessageMessagesPane from "../components/directMessage/DirectMessageMessagesPane";
import DirectMessageComposer from "../components/directMessage/DirectMessageComposer";
import DirectMessageInfoSection from "../components/directMessage/DirectMessageInfoSection";
import ReportMessageModal from "../components/modals/ReportMessageModal";
import AppToast from "../components/common/AppToast";
import {
  getOrCreateConversation,
  fetchConversationContext,
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
  submitMessageReport,
  subscribeConversationRealtime,
  unsubscribeConversationRealtime,
} from "../utils/social";
import { getChatSocket } from "../utils/messages";
import {
  ENABLE_MEDIA_UPLOADS,
  MAX_MEDIA_UPLOAD_BYTES,
  MAX_MEDIA_UPLOAD_MB,
} from "../utils/runtimeConfig";

const DELETED_MESSAGE_MARKER = "__BSUALLCHAT_DM_DELETED__";
const DM_MESSAGES_CACHE_PREFIX = "dm_messages_cache:";

function dedupeAndSortMessages(messages) {
  const uniqueById = new Map();

  messages.forEach((message) => {
    if (!message?.id) return;
    uniqueById.set(message.id, message);
  });

  return Array.from(uniqueById.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
}

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
  const [reportTarget, setReportTarget] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState([]);
  const [showMobileInfoPanel, setShowMobileInfoPanel] = useState(false);
  const [otherUserIsTyping, setOtherUserIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingEmitTimeoutRef = useRef(null);

  const hiddenMessageStorageKey =
    user?.id && conversationId
      ? `dm_hidden_messages:${user.id}:${conversationId}`
      : null;
  const dmMessagesCacheKey = conversationId
    ? `${DM_MESSAGES_CACHE_PREFIX}${conversationId}`
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

      let mounted = true;
      let subscription;

      const setupRealtime = async () => {
        try {
          subscription = await subscribeConversationRealtime(conversationId, {
            onDelete: (payload) => {
              if (!mounted) return;

              const deletedMessageId = payload?.id;
              const senderUsername = payload?.senderUsername || "User";
              if (!deletedMessageId) return;

              // Mark message as deleted instead of removing it
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === deletedMessageId
                    ? {
                        ...m,
                        content: DELETED_MESSAGE_MARKER,
                        image_url: null,
                        deletedByUsername: senderUsername,
                      }
                    : m,
                ),
              );

              // Remove deleted message from shared media
              setSharedMedia((prev) =>
                prev.filter((item) => item.id !== deletedMessageId),
              );

              setActiveMessageMenuId((prev) =>
                prev === deletedMessageId ? null : prev,
              );
            },
            onInsert: (newMessage) => {
              if (!mounted) return;

              setMessages((prev) =>
                dedupeAndSortMessages([...prev, newMessage]),
              );

              if (newMessage.image_url) {
                setSharedMedia((prev) => {
                  if (prev.some((item) => item.id === newMessage.id))
                    return prev;
                  return [newMessage, ...prev].slice(0, 12);
                });
              }

              markConversationAsRead(conversationId, user.id);
              scrollToBottom();
            },
          });
        } catch (realtimeError) {
          console.error(
            "[DirectMessage] Realtime subscription failed:",
            realtimeError,
          );
        }
      };

      setupRealtime();

      return () => {
        mounted = false;
        if (subscription) {
          unsubscribeConversationRealtime(subscription);
        }
      };
    }
  }, [conversationId, user]);

  // Setup socket listeners for typing indicator
  useEffect(() => {
    if (!conversationId || !user) return;

    let mounted = true;

    const setupTypingListener = async () => {
      const socket = await getChatSocket();
      if (!mounted) return;

      const handleUserTyping = (payload) => {
        if (!mounted) return;
        if (payload.userId === user.id) return; // Ignore own typing events

        setOtherUserIsTyping(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Auto-clear typing indicator after 3 seconds of no new typing event
        typingTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            setOtherUserIsTyping(false);
          }
        }, 3000);
      };

      socket.on("dm:user-typing", handleUserTyping);

      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        socket.off("dm:user-typing", handleUserTyping);
      };
    };

    const cleanup = setupTypingListener();

    return () => {
      mounted = false;
      cleanup?.then((cleanupFn) => cleanupFn?.());
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, user]);

  // Emit typing indicator when user is typing (debounced)
  useEffect(() => {
    if (!conversationId || !messageText.trim()) return;

    const emitTyping = async () => {
      const socket = await getChatSocket();
      socket.emit("dm:typing", { conversationId });
    };

    // Clear previous timeout
    if (typingEmitTimeoutRef.current) {
      clearTimeout(typingEmitTimeoutRef.current);
    }

    // Emit typing event after 300ms of no keystroke
    typingEmitTimeoutRef.current = setTimeout(() => {
      emitTyping();
    }, 300);

    return () => {
      if (typingEmitTimeoutRef.current) {
        clearTimeout(typingEmitTimeoutRef.current);
      }
    };
  }, [messageText, conversationId]);

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

  useEffect(() => {
    if (!dmMessagesCacheKey) return;

    try {
      // Keep cache bounded so navigation is fast without overgrowing storage.
      sessionStorage.setItem(
        dmMessagesCacheKey,
        JSON.stringify(messages.slice(-200)),
      );
    } catch {
      // Ignore cache write failures (quota/private browsing restrictions).
    }
  }, [dmMessagesCacheKey, messages]);

  async function loadRelationshipStats(otherUserId) {
    if (!user?.id || !otherUserId) return;

    try {
      const [followStatus, followers, followingList] = await Promise.all([
        isFollowing(user.id, otherUserId),
        fetchFollowers(otherUserId),
        fetchFollowing(otherUserId),
      ]);

      setFollowing(followStatus);
      setFollowerCount(followers.length);
      setFollowingCount(followingList.length);
    } catch (statsError) {
      console.error("Error loading relationship stats:", statsError);
    }
  }

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

      // Fetch conversation context from backend REST API.
      const conversationContext =
        await fetchConversationContext(routeConversationId);
      const profile = conversationContext?.otherUser;

      if (!profile?.id) {
        throw new Error("Other user not found");
      }

      const otherUserId = profile.id;

      setOtherUser({
        ...profile,
        isOnline: isUserOnline(profile.last_seen),
      });

      // Do not block the main page loader on social stats.
      setFollowing(false);
      setFollowerCount(0);
      setFollowingCount(0);
      loadRelationshipStats(otherUserId);
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
      let loadedFromCache = false;

      if (dmMessagesCacheKey) {
        try {
          const cachedRaw = sessionStorage.getItem(dmMessagesCacheKey);
          const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

          if (Array.isArray(cached) && cached.length > 0) {
            setMessages(dedupeAndSortMessages(cached));
            loadedFromCache = true;
            setTimeout(scrollToBottom, 0);
          }
        } catch {
          // Ignore cache read failures and continue with network fetch.
        }
      }

      if (!loadedFromCache) {
        setLoadingMessages(true);
      }

      const msgs = await fetchDirectMessages(conversationId);
      setMessages(dedupeAndSortMessages(msgs));
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

  function toggleMessageMenu(messageId) {
    setActiveMessageMenuId((prev) => (prev === messageId ? null : messageId));
  }

  function handleReportMessage(message) {
    setReportTarget(message);
    setActiveMessageMenuId(null);
  }

  async function handleSubmitReport({ reason, description }) {
    if (!reportTarget || !conversationId) return;
    try {
      setReporting(true);
      await submitMessageReport({
        messageId: reportTarget.id,
        messageType: "dm",
        reportedUserId: reportTarget.sender_id,
        conversationId,
        reason,
        description,
      });
      setReportTarget(null);
      setToast({
        type: "success",
        message: "Report submitted successfully. Thank you.",
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      setToast({
        type: "error",
        message: error.message || "Failed to submit report.",
      });
    } finally {
      setReporting(false);
    }
  }

  useEffect(() => {
    if (!toast?.message) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

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

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: DELETED_MESSAGE_MARKER,
                image_url: null,
                deletedByUsername: "You",
              }
            : msg,
        ),
      );
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

    if (!ENABLE_MEDIA_UPLOADS) {
      setToast({
        type: "error",
        message: "Image uploads are currently disabled.",
      });
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
      alert(`Image size must be ${MAX_MEDIA_UPLOAD_MB}MB or less.`);
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
    const hasText = !!trimmedText;
    const hasImage = !!selectedImage;

    if ((!hasText && !hasImage) || sending || !conversationId) return;

    const imageToSend = selectedImage;
    const textTempMessageId = hasText
      ? `temp-text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      : null;
    let textMessageSent = false;

    try {
      setSending(hasImage);
      setUploadingImage(hasImage);

      if (hasText) {
        setMessages((prev) =>
          dedupeAndSortMessages([
            ...prev,
            {
              id: textTempMessageId,
              conversation_id: conversationId,
              sender_id: user.id,
              content: trimmedText,
              image_url: null,
              created_at: new Date().toISOString(),
            },
          ]),
        );

        setMessageText("");
        scrollToBottom();

        const textMessage = await sendDirectMessage({
          conversationId,
          senderId: user.id,
          content: trimmedText,
          imageUrl: null,
        });

        textMessageSent = true;
        setMessages((prev) =>
          dedupeAndSortMessages(
            prev.map((msg) =>
              msg.id === textTempMessageId ? textMessage : msg,
            ),
          ),
        );
      }

      if (hasImage && imageToSend) {
        const imageUrl = await uploadDirectMessageImage({
          file: imageToSend,
          conversationId,
          userId: user.id,
        });

        const imageMessage = await sendDirectMessage({
          conversationId,
          senderId: user.id,
          content: "",
          imageUrl,
        });

        setMessages((prev) => dedupeAndSortMessages([...prev, imageMessage]));

        setSharedMedia((prev) => {
          if (prev.some((item) => item.id === imageMessage.id)) return prev;
          return [imageMessage, ...prev].slice(0, 12);
        });

        clearSelectedImage();
      }

      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);

      if (textTempMessageId) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== textTempMessageId),
        );
      }

      if (hasText && !textMessageSent) {
        setMessageText(trimmedText);
      }

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
          <Skeleton className="w-8 h-8 rounded-full text-red-600" />
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
          <Skeleton className="w-8 h-8 rounded-full text-red-600" />
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
        <DirectMessageHeader
          otherUser={otherUser}
          onBack={() => navigate(-1)}
          onOpenInfoPanel={() => setShowMobileInfoPanel(true)}
          onVisitProfile={() => navigate(`/user/${otherUser.id}`)}
        />

        <DirectMessageMessagesPane
          containerRef={messagesContainerRef}
          loadingMessages={loadingMessages}
          visibleMessages={visibleMessages}
          currentUserId={user.id}
          otherUser={otherUser}
          activeMessageMenuId={activeMessageMenuId}
          deletingMessageId={deletingMessageId}
          onToggleMessageMenu={toggleMessageMenu}
          onUnsendForYou={handleUnsendForYou}
          onUnsendForEveryone={handleUnsendForEveryone}
          onReportMessage={handleReportMessage}
          messagesEndRef={messagesEndRef}
        />

        {otherUserIsTyping && (
          <div className="px-4 sm:px-6 pb-2">
            <p className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs sm:text-sm text-gray-500 italic shadow-sm">
              {otherUser.username || "User"} is typing...
            </p>
          </div>
        )}

        <DirectMessageComposer
          imagePreviewUrl={imagePreviewUrl}
          selectedImageName={selectedImage?.name}
          onClearSelectedImage={clearSelectedImage}
          imageInputRef={imageInputRef}
          onImageChange={handleImageChange}
          sending={sending}
          uploadingImage={uploadingImage}
          onInsertEmoji={handleInsertEmoji}
          messageText={messageText}
          setMessageText={setMessageText}
          onSubmit={handleSendMessage}
          placeholder={`Message ${otherUser.username || "user"}...`}
          allowImageUpload={ENABLE_MEDIA_UPLOADS}
          uploadDisabledReason="Image uploads are disabled in this deployment."
        />
      </main>

      {showMobileInfoPanel && (
        <div className="fixed inset-0 z-70 xl:hidden">
          <button
            type="button"
            onClick={() => setShowMobileInfoPanel(false)}
            className="absolute inset-0 bg-black/45"
            aria-label="Close conversation info"
          />

          <aside className="absolute right-0 top-0 h-full w-80 max-w-full bg-white border-l border-gray-200 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Conversation Info
              </h3>
              <button
                type="button"
                onClick={() => setShowMobileInfoPanel(false)}
                className="w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                aria-label="Close conversation info"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <DirectMessageInfoSection
                otherUser={otherUser}
                followerCount={followerCount}
                followingCount={followingCount}
                following={following}
                actionLoading={actionLoading}
                onFollowToggle={handleFollowToggle}
                onViewProfile={() => {
                  setShowMobileInfoPanel(false);
                  navigate(`/user/${otherUser.id}`);
                }}
                visibleSharedMedia={visibleSharedMedia}
                compact={true}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Right sidebar - optional user info panel */}
      <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden xl:block">
        <div className="p-6">
          <DirectMessageInfoSection
            otherUser={otherUser}
            followerCount={followerCount}
            followingCount={followingCount}
            following={following}
            actionLoading={actionLoading}
            onFollowToggle={handleFollowToggle}
            onViewProfile={() => navigate(`/user/${otherUser.id}`)}
            visibleSharedMedia={visibleSharedMedia}
          />
        </div>
      </aside>

      <ReportMessageModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
        reporting={reporting}
        reportedUsername={otherUser?.username}
      />

      <AppToast
        toast={toast}
        onClose={() => setToast(null)}
        className="xl:right-88"
      />
    </div>
  );
}
