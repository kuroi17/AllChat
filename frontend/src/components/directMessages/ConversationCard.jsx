import { Loader2, Trash2 } from "lucide-react";

const DELETED_MESSAGE_MARKER = "__BSUALLCHAT_DM_DELETED__";

export default function ConversationCard({
  conversation,
  index,
  compactCards,
  colors,
  currentUserId,
  isOnline,
  getRelativeTime,
  onOpen,
  onDelete,
  deletingConversationId,
}) {
  const isLastMessageDeleted =
    typeof conversation.lastMessage?.content === "string" &&
    conversation.lastMessage.content.startsWith(DELETED_MESSAGE_MARKER);

  return (
    <div className="relative group">
      <button
        onClick={onOpen}
        className={`w-full bg-white rounded-2xl ${compactCards ? "p-3 pr-12 sm:pr-14" : "p-3 sm:p-5 pr-14 sm:pr-16"} hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-2 border-gray-100 hover:border-red-200`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-linear-to-br from-red-400 to-pink-400 animate-pulse opacity-0 group-hover:opacity-30 transition-opacity" />
            {conversation.otherUser?.avatar_url ? (
              <img
                src={conversation.otherUser.avatar_url}
                alt={conversation.otherUser.username}
                className={`relative ${compactCards ? "w-11 h-11 sm:w-12 sm:h-12" : "w-12 h-12 sm:w-16 sm:h-16"} rounded-full object-cover ring-2 ring-gray-200 group-hover:ring-red-400 transition-all`}
              />
            ) : (
              <div
                className={`relative ${compactCards ? "w-11 h-11 sm:w-12 sm:h-12 text-sm sm:text-base" : "w-12 h-12 sm:w-16 sm:h-16 text-base sm:text-xl"} rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white font-bold ring-2 ring-gray-200 group-hover:ring-red-400 transition-all shadow-md`}
              >
                {conversation.otherUser?.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-green-500 border-3 border-white shadow-lg animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <h3
                className={`font-bold text-gray-900 truncate ${compactCards ? "text-sm sm:text-base" : "text-base sm:text-lg"} group-hover:text-red-600 transition-colors`}
              >
                {conversation.otherUser?.username || "User"}
              </h3>
              {conversation.lastMessage?.created_at && (
                <span className="text-xs font-semibold text-gray-400 ml-2 group-hover:text-red-500 transition-colors">
                  {getRelativeTime(conversation.lastMessage.created_at)}
                </span>
              )}
            </div>

            {(conversation.lastMessage?.content ||
              conversation.lastMessage?.image_url) && (
              <p
                className={`text-xs sm:text-sm truncate ${conversation.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}
              >
                {conversation.lastMessage.sender_id === currentUserId ? (
                  <span className="text-gray-400">You: </span>
                ) : null}
                {isLastMessageDeleted
                  ? "Message deleted"
                  : conversation.lastMessage.content || "Sent a photo"}
              </p>
            )}

            {conversation.unreadCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-1 text-[11px] sm:text-xs font-bold bg-linear-to-r from-red-500 to-pink-500 text-white rounded-full shadow-md animate-pulse">
                  {conversation.unreadCount} unread
                </span>
              </div>
            )}
          </div>
        </div>
      </button>

      <button
        onClick={onDelete}
        className="absolute top-3 sm:top-4 right-3 sm:right-4 w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center"
        title="Delete conversation"
        aria-label="Delete conversation"
        disabled={deletingConversationId === conversation.conversationId}
      >
        {deletingConversationId === conversation.conversationId ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
