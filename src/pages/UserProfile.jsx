import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../utils/supabase";
import {
  isFollowing,
  followUser,
  unfollowUser,
  fetchFollowers,
  fetchFollowing,
  getOrCreateConversation,
} from "../utils/social";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  async function loadProfileData() {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfileData(profile);

      // Check if current user is following this user
      if (user && user.id !== userId) {
        const followStatus = await isFollowing(user.id, userId);
        setFollowing(followStatus);
      }

      // Fetch follower and following counts
      const [followers, followingList] = await Promise.all([
        fetchFollowers(userId),
        fetchFollowing(userId),
      ]);
      setFollowerCount(followers.length);
      setFollowingCount(followingList.length);

      // Fetch recent messages from this user
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!messagesError && messages) {
        setRecentMessages(messages);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowToggle() {
    if (!user || actionLoading) return;

    try {
      setActionLoading(true);
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
        setFollowerCount((prev) => prev - 1);
      } else {
        await followUser(userId);
        setFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMessage() {
    if (!user || actionLoading) return;

    try {
      setActionLoading(true);
      const conversation = await getOrCreateConversation(user.id, userId);
      if (conversation) {
        navigate(`/dm/${conversation.id}`);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <Sidebar showExtras={false} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <Sidebar showExtras={false} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              User not found
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer text-red-600 hover:text-red-700"
            >
              Go back
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isOwnProfile = user && user.id === userId;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Cover section with gradient */}
            <div className="h-32 bg-linear-to-r from-red-500 to-red-700"></div>

            {/* Profile info section */}
            <div className="px-8 pb-8">
              {/* Avatar overlapping cover */}
              <div className="flex items-end justify-between -mt-16 mb-4">
                <div>
                  {profileData.avatar_url ? (
                    <img
                      src={profileData.avatar_url}
                      alt={profileData.username}
                      className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-red-800 flex items-center justify-center text-white text-3xl font-bold">
                      {profileData.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-3 mt-20">
                    <button
                      onClick={handleMessage}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <MessageCircle className="w-5 h-5" />
                      )}
                      Message
                    </button>

                    {following ? (
                      <button
                        onClick={handleFollowToggle}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserMinus className="w-5 h-5" />
                        Unfollow
                      </button>
                    ) : (
                      <button
                        onClick={handleFollowToggle}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-800 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <UserPlus className="w-5 h-5" />
                        Follow
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Username and bio */}
              <div className="mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profileData.username || "Anonymous"}
                </h1>
                {profileData.bio && (
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">
                    {profileData.bio}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 py-4 border-t border-gray-200">
                {profileData.created_at && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm">
                      Joined{" "}
                      {new Date(profileData.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">
                    <strong className="text-gray-900">{followerCount}</strong>{" "}
                    Followers
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">
                    <strong className="text-gray-900">{followingCount}</strong>{" "}
                    Following
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h2>

            {/* Recent messages */}
            <div className="space-y-4">
              {recentMessages.length > 0 ? (
                recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 mb-1 line-clamp-2">
                        {msg.content}
                      </p>
                      <p className="text-gray-500 text-sm">
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
                <p className="text-gray-500 text-center py-8">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
