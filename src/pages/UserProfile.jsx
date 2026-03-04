import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  MessageCircle,
  Calendar,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();

  // Dummy data for UI preview
  const isFollowing = false;
  const profileData = {
    username: "John Doe",
    avatar_url: null,
    bio: "Computer Science student | Coffee enthusiast | Love coding and solving problems",
    created_at: "2024-01-15",
    followerCount: 245,
    followingCount: 180,
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
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
                <div className="flex gap-3 mt-20">
                  <button className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium">
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </button>

                  {isFollowing ? (
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium">
                      <UserMinus className="w-5 h-5" />
                      Unfollow
                    </button>
                  ) : (
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium">
                      <UserPlus className="w-5 h-5" />
                      Follow
                    </button>
                  )}
                </div>
              </div>

              {/* Username and bio */}
              <div className="mt-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {profileData.username}
                </h1>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {profileData.bio}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-8 py-4 border-t border-gray-200">
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

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">
                    <strong className="text-gray-900">
                      {profileData.followerCount}
                    </strong>{" "}
                    Followers
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-5 h-5" />
                  <span className="text-sm">
                    <strong className="text-gray-900">
                      {profileData.followingCount}
                    </strong>{" "}
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

            {/* Placeholder for recent messages/activity */}
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 mb-1">
                      Posted in{" "}
                      <span className="font-semibold text-red-600">
                        Global Chat
                      </span>
                    </p>
                    <p className="text-gray-500 text-sm">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
