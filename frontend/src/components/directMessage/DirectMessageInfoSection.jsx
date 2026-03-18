import { Loader2, UserPlus, UserMinus } from "lucide-react";

export default function DirectMessageInfoSection({
  otherUser,
  followerCount,
  followingCount,
  following,
  actionLoading,
  onFollowToggle,
  onViewProfile,
  visibleSharedMedia,
  compact = false,
}) {
  const avatarWrapperClasses = compact
    ? "mx-auto w-20 h-20 mb-3"
    : "mx-auto w-24 h-24 mb-4";
  const usernameClasses = compact
    ? "text-lg font-bold text-gray-900 mb-1"
    : "text-xl font-bold text-gray-900 mb-1";
  const statusClasses = compact
    ? "text-sm text-gray-500 mb-3"
    : "text-sm text-gray-500 mb-3";
  const statsGapClasses = compact ? "gap-5 mb-4" : "gap-6 mb-4";

  return (
    <>
      <div className="text-center">
        <div className={avatarWrapperClasses}>
          {otherUser.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.username}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-full h-full rounded-full bg-red-800 flex items-center justify-center text-white ${compact ? "text-2xl" : "text-3xl"} font-bold`}
            >
              {otherUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h3 className={usernameClasses}>{otherUser.username}</h3>
        <p className={statusClasses}>
          {otherUser.isOnline ? "Active now" : "Offline"}
        </p>

        <div
          className={`flex items-center justify-center ${statsGapClasses} text-sm`}
        >
          <div>
            <span className="font-bold text-gray-900">{followerCount}</span>
            <span className="text-gray-600"> Followers</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">{followingCount}</span>
            <span className="text-gray-600"> Following</span>
          </div>
        </div>

        {following ? (
          <button
            onClick={onFollowToggle}
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
            onClick={onFollowToggle}
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
          onClick={onViewProfile}
          className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
        >
          View Profile
        </button>
      </div>

      <div className={compact ? "mt-6" : "mt-8"}>
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
    </>
  );
}
