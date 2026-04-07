import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAppDialog } from "../contexts/DialogContext";
import { toSafeErrorMessage } from "../utils/safeErrorMessage";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [chatSettings, setChatSettings] = useState(defaultSettings);
  const { alert } = useAppDialog();
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading: loading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["directMessages", "conversations", user?.id],
    queryFn: () => fetchConversations(user.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId) => deleteConversation(conversationId, user.id),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData(
        ["directMessages", "conversations", user?.id],
        (prev = []) =>
          prev.filter((conv) => conv.conversationId !== conversationId),
      );
      setConversationToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting conversation:", error);
      void alert({
        title: "Unable to delete conversation",
        message: toSafeErrorMessage(
          error,
          "Failed to delete conversation. Please try again.",
        ),
        danger: true,
      });
      refetchConversations();
    },
  });

  useEffect(() => {
    const unsubscribe = subscribeChatSettings(setChatSettings);
    return unsubscribe;
  }, []);

  function handleDeleteClick(event, conversation) {
    event.stopPropagation();
    setConversationToDelete(conversation);
  }

  function closeDeleteModal() {
    if (deleteConversationMutation.isPending) return;
    setConversationToDelete(null);
  }

  async function handleConfirmDelete() {
    if (!conversationToDelete || !user?.id) return;
    deleteConversationMutation.mutate(conversationToDelete.conversationId);
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
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6">
            {loading ? (
              <div className="space-y-3 sm:space-y-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`conversation-skeleton-${index}`}
                    className="rounded-2xl bg-white border border-gray-100 px-4 py-3 sm:px-5 sm:py-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-48 bg-gray-200 rounded" />
                      </div>
                      <div className="h-3 w-10 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-14 sm:py-20">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-red-100 flex items-center justify-center">
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
                    deletingConversationId={
                      deleteConversationMutation.isPending
                        ? conversationToDelete?.conversationId
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <DeleteConversationModal
          conversationToDelete={conversationToDelete}
          deletingConversationId={
            deleteConversationMutation.isPending
              ? conversationToDelete?.conversationId
              : null
          }
          onCancel={closeDeleteModal}
          onConfirm={handleConfirmDelete}
        />
      </main>
    </div>
  );
}
