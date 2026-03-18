import { ArrowLeft, Info } from "lucide-react";

export default function DirectMessageHeader({
  otherUser,
  onBack,
  onOpenInfoPanel,
  onVisitProfile,
}) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="relative cursor-pointer" onClick={onVisitProfile}>
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
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
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

        <button
          type="button"
          onClick={onOpenInfoPanel}
          className="xl:hidden w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
          aria-label="Open conversation info"
          title="Conversation info"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
