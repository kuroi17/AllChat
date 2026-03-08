import { useState, useRef, useEffect } from "react";
import { Search, Bell, X } from "lucide-react";

export default function ChatHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  // Sample notifications - in production, fetch from Supabase
  const notifications = [
    {
      id: 1,
      type: "mention",
      user: "Alex Rivera",
      message: "mentioned you in Global Chat",
      time: "2m ago",
      read: false,
    },
    {
      id: 2,
      type: "dm",
      user: "Sarah Jenkins",
      message: "sent you a direct message",
      time: "3h ago",
      read: false,
    },
    {
      id: 3,
      type: "announcement",
      user: "Design Club",
      message: "posted a new announcement",
      time: "1h ago",
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 shrink-0">
      <span className="text-red-800 text-lg font-extrabold leading-none">
        #
      </span>
      <h2 className="font-bold text-gray-800 text-base">Campus Global Chat</h2>
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-600 font-semibold">
          1,248 ONLINE
        </span>
      </div>
      <div className="flex-1" />
      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors">
        <Search size={16} />
      </button>
      
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
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
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
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                      !notif.read ? "bg-red-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar placeholder */}
                      <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {notif.user.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-semibold">{notif.user}</span>{" "}
                          <span className="text-gray-600">{notif.message}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
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
