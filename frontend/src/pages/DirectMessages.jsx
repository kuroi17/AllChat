import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Search,
  MessageCircle,
  Send,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import MobileNavMenuButton from "../components/navigation/MobileNavMenuButton";
import { useUser } from "../contexts/UserContext";
import { defaultSettings, subscribeChatSettings } from "../utils/settings";
import {
  fetchConversations,
  isUserOnline,
  deleteConversation,
} from "../utils/social";

// Format relative time
function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function DirectMessages() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [chatSettings, setChatSettings] = useState(defaultSettings);

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = subscribeChatSettings(setChatSettings);
    return unsubscribe;
  }, []);

  async function loadConversations() {
    if (!user?.id) return;

    try {
      setLoading(true);
      const convos = await fetchConversations(user.id);
      setConversations(convos);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(event, conversation) {
    event.stopPropagation();
    setConversationToDelete(conversation);
  }

  function closeDeleteModal() {
    if (deletingConversationId) return;
    setConversationToDelete(null);
  }

  async function handleConfirmDelete() {
    if (!conversationToDelete || !user?.id) return;

    try {
      setDeletingConversationId(conversationToDelete.conversationId);
      await deleteConversation(conversationToDelete.conversationId, user.id);

      setConversations((prev) =>
        prev.filter(
          (conv) => conv.conversationId !== conversationToDelete.conversationId,
        ),
      );
      setConversationToDelete(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert(
        "Failed to delete conversation. Check your database delete policy and try again.",
      );
    } finally {
      setDeletingConversationId(null);
    }
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const compactCards = chatSettings.compactConversationCards;

  const colors = [
    "bg-blue-400",
    "bg-pink-400",
    "bg-purple-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-red-400",
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with gradient */}
        <header className="bg-linear-to-r from-red-50 via-white to-red-50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-5 shrink-0">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <MobileNavMenuButton />
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0">
                <Send className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Messages
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  {conversations.length} conversation
                  {conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Enhanced search bar */}
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm hover:shadow-md"
              />
            </div>
          </div>
        </header>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto bg-linear-to-b from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-14 sm:py-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-red-200 animate-pulse"></div>
                  <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 animate-spin text-red-600" />
                </div>
                <p className="mt-4 text-gray-500 font-medium text-sm sm:text-base">
                  Loading conversations...
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-14 sm:py-20">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-linear-to-br from-red-100 to-pink-100 flex items-center justify-center">
                  <MessageCircle size={40} className="text-red-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {searchQuery ? "No matches found" : "No messages yet"}
                </h2>
                <p className="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start chatting by visiting someone's profile and clicking the message button"}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {filteredConversations.map((conv, index) => (
                  <div key={conv.conversationId} className="relative group">
                    <button
                      onClick={() => navigate(`/dm/${conv.conversationId}`)}
                      className={`w-full bg-white rounded-2xl ${compactCards ? "p-3 pr-12 sm:pr-14" : "p-3 sm:p-5 pr-14 sm:pr-16"} hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-2 border-gray-100 hover:border-red-200`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Avatar with gradient border */}
                        <div className="relative shrink-0">
                          <div className="absolute inset-0 rounded-full bg-linear-to-br from-red-400 to-pink-400 animate-pulse opacity-0 group-hover:opacity-30 transition-opacity" />
                          {conv.otherUser?.avatar_url ? (
                            <img
                              src={conv.otherUser.avatar_url}
                              alt={conv.otherUser.username}
                              className={`relative ${compactCards ? "w-11 h-11 sm:w-12 sm:h-12" : "w-12 h-12 sm:w-16 sm:h-16"} rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-red-400 transition-all`}
                            />
                          ) : (
                            <div
                              className={`relative ${compactCards ? "w-11 h-11 sm:w-12 sm:h-12 text-sm sm:text-base" : "w-12 h-12 sm:w-16 sm:h-16 text-base sm:text-xl"} rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white font-bold ring-2 ring-gray-200 group-hover:ring-red-400 transition-all shadow-md`}
                            >
                              {conv.otherUser?.username?.[0]?.toUpperCase() ||
                                "U"}
                            </div>
                          )}
                          {/* Enhanced online status */}
                          {isUserOnline(conv.otherUser?.last_seen) && (
                            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-green-500 border-3 border-white shadow-lg animate-pulse" />
                          )}
                        </div>

                        {/* User info with better layout */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3
                              className={`font-bold text-gray-900 truncate ${compactCards ? "text-sm sm:text-base" : "text-base sm:text-lg"} group-hover:text-red-600 transition-colors`}
                            >
                              {conv.otherUser?.username || "User"}
                            </h3>
                            {conv.lastMessage?.created_at && (
                              <span className="text-xs font-semibold text-gray-400 ml-2 group-hover:text-red-500 transition-colors">
                                {getRelativeTime(conv.lastMessage.created_at)}
                              </span>
                            )}
                          </div>

                          {(conv.lastMessage?.content ||
                            conv.lastMessage?.image_url) && (
                            <p
                              className={`text-xs sm:text-sm truncate ${conv.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}
                            >
                              {conv.lastMessage.sender_id === user.id ? (
                                <span className="text-gray-400">You: </span>
                              ) : null}
                              {conv.lastMessage.content || "Sent a photo"}
                            </p>
                          )}

                          {/* Unread badge */}
                          {conv.unreadCount > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-2.5 py-1 text-[11px] sm:text-xs font-bold bg-linear-to-r from-red-500 to-pink-500 text-white rounded-full shadow-md animate-pulse">
                                {conv.unreadCount} unread
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={(event) => handleDeleteClick(event, conv)}
                      className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                      disabled={deletingConversationId === conv.conversationId}
                    >
                      {deletingConversationId === conv.conversationId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {conversationToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Delete conversation?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    You are about to delete your chat with{" "}
                    <span className="font-semibold text-gray-800">
                      {conversationToDelete.otherUser?.username || "this user"}
                    </span>
                    . This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={!!deletingConversationId}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={!!deletingConversationId}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {deletingConversationId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
