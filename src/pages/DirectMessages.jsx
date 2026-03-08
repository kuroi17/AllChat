import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, MessageCircle } from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import { fetchConversations, isUserOnline } from "../utils/social";

export default function DirectMessages() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, [user?.id]);

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

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      <Sidebar showExtras={false} />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Direct Messages
            </h1>

            {/* Search bar */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </header>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle
                  size={48}
                  className="mx-auto text-gray-300 mb-4"
                />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery
                    ? "No conversations found"
                    : "No conversations yet"}
                </h2>
                <p className="text-gray-500">
                  {searchQuery
                    ? "Try searching for a different username"
                    : "Start a conversation by visiting someone's profile"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conv, index) => (
                  <button
                    key={conv.conversationId}
                    onClick={() => navigate(`/dm/${conv.conversationId}`)}
                    className="w-full bg-white rounded-xl p-4 hover:shadow-md transition-all border border-gray-200 hover:border-red-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {conv.otherUser?.avatar_url ? (
                          <img
                            src={conv.otherUser.avatar_url}
                            alt={conv.otherUser.username}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-lg font-bold`}
                          >
                            {conv.otherUser?.username?.[0]?.toUpperCase() ||
                              "U"}
                          </div>
                        )}
                        {isUserOnline(conv.otherUser?.last_seen) && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-400 border-2 border-white" />
                        )}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {conv.otherUser?.username || "User"}
                          </h3>
                          {conv.lastMessage?.created_at && (
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(
                                conv.lastMessage.created_at,
                              ).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>

                        {conv.lastMessage?.content && (
                          <p className="text-sm text-gray-600 truncate">
                            {conv.lastMessage.sender_id === user.id && "You: "}
                            {conv.lastMessage.content}
                          </p>
                        )}

                        {conv.unreadCount > 0 && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                            {conv.unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
