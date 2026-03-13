import { useState, useEffect } from "react";
import Sidebar from "../layouts/Sidebar";
import Header from "../layouts/Header";
import { useUser } from "../contexts/UserContext";
import EditProfileModal from "../components/modals/EditProfileModal";
import { fetchFollowers, fetchFollowing } from "../utils/social";
import { Users } from "lucide-react";

export default function Profile() {
  const { user, profile } = useUser();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadFollowCounts();
    }
  }, [user?.id]);

  async function loadFollowCounts() {
    try {
      const [followers, following] = await Promise.all([
        fetchFollowers(user.id),
        fetchFollowing(user.id),
      ]);
      setFollowerCount(followers.length);
      setFollowingCount(following.length);
    } catch (error) {
      console.error("Error loading follow counts:", error);
    }
  }
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="My Profile" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Cover */}
              <div className="h-28 bg-red-800 relative overflow-hidden">
                {profile?.banner_url && (
                  <img
                    src={profile.banner_url}
                    alt="Profile cover"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
              {/* Avatar + Info */}
              <div className="px-6 pb-5">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-red-800 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md overflow-hidden">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile?.username?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      "U"
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className=" cursor-pointer mb-1 px-4 py-1.5 border border-red-800 text-red-800 text-xs font-semibold rounded-xl hover:bg-red-50 hover:text-red-800 transition-colors"
                  >
                    Edit Profile
                  </button>
                </div>
                <h2 className="text-lg font-bold text-gray-800">
                  {profile?.full_name ||
                    profile?.username ||
                    user?.email?.split("@")[0] ||
                    "User"}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  {profile?.department || "No department yet"} · BSU
                </p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {profile?.bio || "No bio yet. Click Edit Profile to add one!"}
                </p>

                {/* Followers/Following Stats */}
                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      <strong className="text-gray-900">{followerCount}</strong>{" "}
                      Followers
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      <strong className="text-gray-900">
                        {followingCount}
                      </strong>{" "}
                      Following
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">
                Account Information
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Username", value: profile?.username || "Not set" },
                  { label: "Email", value: user?.email || "Not available" },
                  {
                    label: "Department",
                    value: profile?.department || "Not set",
                  },
                  {
                    label: "Year Level",
                    value: profile?.year_level || "Not set",
                  },
                  {
                    label: "Student ID",
                    value: profile?.student_id || "Not set",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {f.label}
                    </span>
                    <span className="text-sm text-gray-700">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
}
