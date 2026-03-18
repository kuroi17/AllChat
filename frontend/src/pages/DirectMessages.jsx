import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import { defaultSettings, subscribeChatSettings } from "../utils/settings";
import {
  fetchConversations,
  isUserOnline,
  deleteConversation,
} from "../utils/social";
import DirectMessagesHeader from "../components/directMessages/DirectMessagesHeader";
import ConversationCard from "../components/directMessages/ConversationCard";
import DeleteConversationModal from "../components/directMessages/DeleteConversationModal";

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
        <DirectMessagesHeader
          conversationsCount={conversations.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

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
                  <ConversationCard
                    key={conv.conversationId}
                    conversation={conv}
                    index={index}
                    compactCards={compactCards}
                    colors={colors}
                    currentUserId={user.id}
                    isOnline={isUserOnline(conv.otherUser?.last_seen)}
                    getRelativeTime={getRelativeTime}
                    onOpen={() => navigate(`/dm/${conv.conversationId}`)}
                    onDelete={(event) => handleDeleteClick(event, conv)}
                    deletingConversationId={deletingConversationId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DeleteConversationModal
          conversationToDelete={conversationToDelete}
          deletingConversationId={deletingConversationId}
          onCancel={closeDeleteModal}
          onConfirm={handleConfirmDelete}
        />
      </main>
    </div>
  );
}
