import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  MessageCircle,
  User,
  LogOut,
  Mail,
  Settings,
  ChevronUp,
  Users,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import { useUser } from "../contexts/UserContext";
import {
  fetchUnreadDirectMessageCount,
  subscribeUserRealtime,
  unsubscribeUserRealtime,
} from "../utils/social";
import {
  defaultSettings,
  playNotificationSoundEffect,
  subscribeChatSettings,
} from "../utils/settings";

export default function Sidebar({ showExtras, onNavigate }) {
  const navigate = useNavigate();
  const { user, profile } = useUser(); // get user and profile from context
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [chatSettings, setChatSettings] = useState(defaultSettings);
  const userMenuRef = useRef(null);
  const settingsRef = useRef(defaultSettings);

  useEffect(() => {
    settingsRef.current = chatSettings;
  }, [chatSettings]);

  useEffect(() => {
    const unsubscribe = subscribeChatSettings(setChatSettings);
    return unsubscribe;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  // Keep unread DM badge in sync for the sidebar nav
  useEffect(() => {
    if (!user?.id) {
      setUnreadDmCount(0);
      return;
    }

    let isMounted = true;

    const loadUnreadCount = async () => {
      const count = await fetchUnreadDirectMessageCount(user.id);
      if (isMounted) {
        setUnreadDmCount(count);
      }
    };

    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 15000);

    let subscription;

    const setupRealtime = async () => {
      try {
        subscription = await subscribeUserRealtime(user.id, {
          onDirectMessageNotification: (payload) => {
            loadUnreadCount();

            if (payload?.senderId === user.id) return;

            const currentSettings = settingsRef.current;

            if (!currentSettings.doNotDisturb && currentSettings.soundEffects) {
              playNotificationSoundEffect();
            }

            if (
              !currentSettings.doNotDisturb &&
              currentSettings.desktopNotifications &&
              document.visibilityState === "hidden" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("New direct message", {
                body: "Someone sent you a message.",
              });
            }
          },
        });
      } catch (error) {
        console.error("[Sidebar] Realtime subscription failed:", error);
      }
    };

    setupRealtime();

    const handleFocus = () => {
      loadUnreadCount();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      if (subscription) {
        unsubscribeUserRealtime(subscription);
      }
    };
  }, [user?.id]);

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
    <aside className="h-full w-56 bg-white flex flex-col border-r border-gray-200 shrink-0">
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
          {/* (rooms icon moved into main nav) */}
        </div>
      </div>

      <nav className="p-3 space-y-1">
        <NavLink
          to="/"
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <MessageCircle size={18} /> Global Chat
        </NavLink>
        <NavLink
          to="/dms"
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <Mail size={18} />
          <span className="flex-1">Direct Messages</span>
          {unreadDmCount > 0 && (
            <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unreadDmCount > 99 ? "99+" : unreadDmCount}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/rooms"
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white bg-red-800 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-800 text-sm transition-colors"
          }
        >
          <Users size={18} />
          <span className="flex-1">Rooms</span>
        </NavLink>
      </nav>

      {/* Bottom User Profile Section with Dropdown */}
      <div className="relative mt-auto" ref={userMenuRef}>
        {/* Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={() => {
                navigate("/profile");
                setShowUserMenu(false);
                onNavigate?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <User size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                View Profile
              </span>
            </button>
            <button
              onClick={() => {
                navigate("/settings");
                setShowUserMenu(false);
                onNavigate?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-100"
            >
              <Settings size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Settings
              </span>
            </button>
            <button
              onClick={() => {
                setShowUserMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left border-t border-gray-100"
            >
              <LogOut size={18} className="text-red-600" />
              <span className="text-sm font-medium text-red-600">Logout</span>
            </button>
          </div>
        )}

        {/* User Profile Button */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full p-3 border-t border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
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
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {profile?.username || user?.email?.split("@")[0] || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.bio || "Computer Science"}
            </p>
          </div>
          <ChevronUp
            size={18}
            className={`text-gray-400 transition-transform ${
              showUserMenu ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
