import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, MessageCircle, Home, User, LogOut } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useUser } from "../contexts/UserContext";
import {
  fetchFollowing,
  fetchConversations,
  isUserOnline,
} from "../utils/social";

export default function Sidebar({ showExtras }) {
  const navigate = useNavigate();
  const { user, profile } = useUser(); // get user and profile from context
  const [following, setFollowing] = useState([]);
  const [conversations, setConversations] = useState([]);

  // Fetch following list
  useEffect(() => {
    if (!user?.id) return;

    const loadFollowing = async () => {
      const followingList = await fetchFollowing(user.id);
      setFollowing(followingList.slice(0, 5)); // Show top 5
    };

    loadFollowing();
  }, [user?.id]);

  // Fetch conversations (DMs)
  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      const convos = await fetchConversations(user.id);
      setConversations(convos.slice(0, 5)); // Show top 5
    };

    loadConversations();
  }, [user?.id]);

  // Avatar colors
  const colors = [
    "bg-blue-400",
    "bg-pink-400",
    "bg-purple-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-red-400",
  ];

  const handleLogout = async () => {
    // Ask for confirmation before logging out
    const confirmed = window.confirm(
      "Are you sure you want to logout? You will need to sign in again to access your account.",
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error logging out:", error);
        alert("Error logging out: " + error.message);
      } else {
        // Force navigation and reload to clear all state
        window.location.href = "/auth";
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Error logging out. Please try again.");
    }
  };
  return (
    <aside className="w-56 bg-white flex flex-col border-r border-gray-200 shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-red-800 rounded-xl flex items-center justify-center text-white text-lg">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium leading-tight">
              Campus
            </p>
            <p className="text-sm font-bold text-red-800 leading-tight">
              Global Chat
            </p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <MessageCircle size={18} /> Global Chat
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <Home size={18} /> Dashboard
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <User size={18} /> Profile
        </NavLink>
      </nav>

      {/* additional infos in sidebar intended for globalChatTab only */}
      {showExtras && (
        <>
          {/* Direct Messages */}
          <div className="px-3 mt-3">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 mb-2">
              DIRECT MESSAGES
            </p>
            <div className="space-y-0.5">
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-2 text-center">
                  No conversations yet
                </p>
              ) : (
                conversations.map((conv, index) => (
                  <button
                    key={conv.conversationId}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-red-50 text-sm text-gray-700 hover:text-red-800 transition-colors"
                    onClick={() => navigate(`/dm/${conv.conversationId}`)}
                  >
                    <div className="relative shrink-0">
                      {conv.otherUser?.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          alt={conv.otherUser.username}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold`}
                        >
                          {conv.otherUser?.username?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      {isUserOnline(conv.otherUser?.last_seen) && (
                        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="truncate font-medium">
                        {conv.otherUser?.username || "User"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Following */}
          <div className="px-3 mt-4">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 mb-2">
              FOLLOWING
            </p>
            <div className="space-y-0.5">
              {following.length === 0 ? (
                <p className="text-xs text-gray-400 px-2 py-2 text-center">
                  Not following anyone yet
                </p>
              ) : (
                following.map((u, index) => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-red-50 text-sm text-gray-700 hover:text-red-800 transition-colors"
                    onClick={() => navigate(`/user/${u.id}`)}
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.username}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-7 h-7 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                      >
                        {u.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span className="truncate">{u.username || "User"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* Bottom User Profile Section */}
      <div className="p-3 border-t border-gray-200 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-red-800 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            profile?.username?.[0]?.toUpperCase() ||
            user?.email?.[0]?.toUpperCase() ||
            "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {profile?.username || user?.email?.split("@")[0] || "User"}
          </p>
          <p className="text-xs text-gray-500">
            {profile?.bio || "Computer Science"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="cursor-pointer text-gray-400 hover:text-red-800 p-1 transition-colors text-base"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
