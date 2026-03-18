import { MessageCircle } from "lucide-react";

export default function UserProfileRecentActivity({
  recentMessages,
  onOpenGlobalChat,
}) {
  return (
    <div className="mt-4 sm:mt-6 bg-white rounded-2xl shadow-lg p-3 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-4">
        Recent Activity
      </h2>

      <div className="space-y-3 sm:space-y-4">
        {recentMessages.length > 0 ? (
          recentMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={onOpenGlobalChat}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 mb-1 line-clamp-2 text-sm sm:text-base">
                  {msg.content}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm">
                  {new Date(msg.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm">
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
}
