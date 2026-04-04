import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileNavMenuButton from "../navigation/MobileNavMenuButton";
import { useUser } from "../../contexts/UserContext";
import {
  fetchNotifications,
  formatNotificationTime,
  markNotificationRead,
} from "../../utils/notifications";
import {
  subscribeUserRealtime,
  unsubscribeUserRealtime,
} from "../../utils/social";
import { usePresence } from "../../contexts/PresenceContext";

export default function ChatHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { onlineCount } = usePresence();
  const notificationsQueryKey = ["notifications", "header", user?.id];

  const {
    data: notifications = [],
    isFetching: notificationsFetching,
    refetch: refetchNotifications,
  } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => fetchNotifications(user.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchInterval: false,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (showNotifications && user?.id) {
      refetchNotifications();
    }
  }, [showNotifications, user?.id, refetchNotifications]);

  // Realtime updates for follows, DMs, and read-state changes
  useEffect(() => {
    if (!user?.id) return;

    let subscription;

    const setupRealtime = async () => {
      try {
        subscription = await subscribeUserRealtime(user.id, {
          onDirectMessageNotification: () => {
            queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
          },
          onFollowNotification: () => {
            queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
          },
        });
      } catch (error) {
        console.error("[ChatHeader] Realtime subscription failed:", error);
      }
    };

    setupRealtime();

    return () => {
      if (subscription) {
        unsubscribeUserRealtime(subscription);
      }
    };
  }, [user?.id, queryClient]);

  async function handleNotificationClick(notif) {
    await markNotificationRead(notif.id, notif.type);
    queryClient.setQueryData(notificationsQueryKey, (prev = []) =>
      prev.map((item) =>
        item.id === notif.id ? { ...item, read: true } : item,
      ),
    );

    if (notif.link) {
      navigate(notif.link);
      setShowNotifications(false);
    }

    queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const showNotificationLoading =
    notificationsFetching && notifications.length === 0;

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-2 sm:px-5 gap-2 sm:gap-3 shrink-0">
      <MobileNavMenuButton showExtras={true} />
      <span className="text-red-800 text-lg font-extrabold leading-none">
        #
      </span>
      <h2 className="font-bold text-gray-800 text-sm sm:text-base truncate">
        Global Chat
      </h2>
      <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-green-600 font-semibold">
          {onlineCount} ONLINE
        </span>
      </div>
      <div className="flex-1" />

      {/* Notification Bell with Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors relative"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-[18rem] sm:w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {showNotificationLoading ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                      !notif.read ? "bg-red-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      {notif.avatarUrl ? (
                        <img
                          src={notif.avatarUrl}
                          alt={notif.username}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {notif.username.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">
                            {notif.username}
                          </span>{" "}
                          <span className="text-gray-600">{notif.message}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatNotificationTime(notif.time)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button className="w-full text-center text-sm text-red-800 font-semibold hover:text-red-900 transition-colors">
                View All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
