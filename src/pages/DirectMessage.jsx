import { useParams } from "react-router-dom";
import { ArrowLeft, Send, MoreVertical, Phone, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";

export default function DirectMessage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  // Dummy data for UI preview
  const otherUser = {
    username: "Jane Smith",
    avatar_url: null,
    isOnline: true,
  };

  const messages = [
    {
      id: 1,
      content: "Hey! How are you doing?",
      created_at: "2024-03-04T10:30:00",
      sender_id: "other",
    },
    {
      id: 2,
      content: "I'm good! Just working on the new project. How about you?",
      created_at: "2024-03-04T10:31:00",
      sender_id: "me",
    },
    {
      id: 3,
      content: "Same here! Want to collaborate on it?",
      created_at: "2024-03-04T10:32:00",
      sender_id: "other",
    },
  ];

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
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {/* Other user info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {otherUser.avatar_url ? (
                    <img
                      src={otherUser.avatar_url}
                      alt={otherUser.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold">
                      {otherUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {otherUser.username}
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
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-6 py-4 space-y-4">
            {messages.map((msg) => {
              const isMe = msg.sender_id === "me";
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
                            {otherUser.username.charAt(0).toUpperCase()}
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
                        <p className="text-sm leading-relaxed">{msg.content}</p>
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
            })}
          </div>
        </div>

        {/* Message Input - fixed at bottom */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <form className="flex items-end gap-3">
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-red-500 transition-all">
                <textarea
                  placeholder={`Message ${otherUser.username}...`}
                  rows="1"
                  className="w-full bg-transparent border-none outline-none resize-none text-gray-900 placeholder-gray-500"
                  style={{ maxHeight: "120px" }}
                />
              </div>
              <button
                type="submit"
                className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
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
              onClick={() => navigate(`/user/${conversationId}`)}
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
