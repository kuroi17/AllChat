import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import UserProfileOverviewCard from "../components/userProfile/UserProfileOverviewCard";
import UserProfileRecentActivity from "../components/userProfile/UserProfileRecentActivity";
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
      const conversationId = await getOrCreateConversation(user.id, userId);
      if (conversationId) {
        navigate(`/dm/${conversationId}`);
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
        <div className="hidden md:block">
          <Sidebar showExtras={false} />
        </div>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </main>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <div className="hidden md:block">
          <Sidebar showExtras={false} />
        </div>
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
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <UserProfileOverviewCard
            profileData={profileData}
            isOwnProfile={isOwnProfile}
            actionLoading={actionLoading}
            following={following}
            onMessage={handleMessage}
            onFollowToggle={handleFollowToggle}
            followerCount={followerCount}
            followingCount={followingCount}
          />

          <UserProfileRecentActivity
            recentMessages={recentMessages}
            onOpenGlobalChat={() => navigate("/")}
          />
        </div>
      </main>
    </div>
  );
}
