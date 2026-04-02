import {
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  Users,
} from "lucide-react";
import Skeleton from "../ui/Skeleton";
import ProfileBanner from "../profile/ProfileBanner";
import ProfileSocialLinks from "../profile/ProfileSocialLinks";

export default function UserProfileOverviewCard({
  profileData,
  isOwnProfile,
  actionLoading,
  following,
  onMessage,
  onFollowToggle,
  followerCount,
  followingCount,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <ProfileBanner
        imageUrl={profileData.banner_url}
        alt={`${profileData.username || "User"} cover`}
        className="h-28 sm:h-40"
      />

      <div className="px-4 sm:px-8 pb-5 sm:pb-8 pt-4 sm:pt-6">
        <div className="mb-4 sm:mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {profileData.avatar_url ? (
              <img
                src={profileData.avatar_url}
                alt={profileData.username}
                className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-white shadow-xl object-cover md:h-32 md:w-32"
              />
            ) : (
              <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-white shadow-xl bg-red-800 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold md:h-32 md:w-32">
                {profileData.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {!isOwnProfile && (
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <button
                onClick={onMessage}
                disabled={actionLoading}
                className="cursor-pointer flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <Skeleton
                    as="span"
                    className="w-5 h-5 rounded-full inline-block"
                  />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
                Message
              </button>

              {following ? (
                <button
                  onClick={onFollowToggle}
                  disabled={actionLoading}
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserMinus className="w-5 h-5" />
                  Unfollow
                </button>
              ) : (
                <button
                  onClick={onFollowToggle}
                  disabled={actionLoading}
                  className="cursor-pointer flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-red-800 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5" />
                  Follow
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            {profileData.username || "Anonymous"}
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mb-2 sm:mb-4">
            {profileData.department || "Department"} · BSU
          </p>
          {profileData.bio && (
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-2 sm:mb-4">
              {profileData.bio}
            </p>
          )}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4 mb-3 sm:mb-4">
            <ProfileSocialLinks
              profile={profileData}
              title={`Connect with ${profileData.username || "this user"}`}
              emptyMessage="This user has not shared social links yet."
            />
          </div>
        </div>

        {(profileData.year_level || profileData.student_id) && (
          <div className="mt-3 sm:mt-4 pb-3 sm:pb-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
              {profileData.year_level && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-semibold text-gray-900">
                    Year Level:
                  </span>
                  <span>{profileData.year_level}</span>
                </div>
              )}
              {profileData.student_id && (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-semibold text-gray-900">
                    Student ID:
                  </span>
                  <span>{profileData.student_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 py-3 sm:py-4 border-t border-gray-200">
          {profileData.created_at && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span className="text-xs sm:text-sm">
                Joined{" "}
                {new Date(profileData.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-5 h-5" />
            <span className="text-xs sm:text-sm">
              <strong className="text-gray-900">{followerCount}</strong>{" "}
              Followers
            </span>
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-5 h-5" />
            <span className="text-xs sm:text-sm">
              <strong className="text-gray-900">{followingCount}</strong>{" "}
              Following
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
