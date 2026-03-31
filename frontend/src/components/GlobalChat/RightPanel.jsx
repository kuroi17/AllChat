import { useState, useEffect } from "react";
import { Calendar, Megaphone, Coffee } from "lucide-react";
import {
  fetchOnlineUsers,
  isUserOnline,
  fetchCampusEvents,
  fetchAnnouncements,
} from "../../utils/social";
import PublicRooms from "../PublicRooms";

export default function Sidebar() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Fetch online users
  useEffect(() => {
    const loadOnlineUsers = async () => {
      const users = await fetchOnlineUsers(15); // Get up to 15 online users
      setOnlineUsers(users);
    };

    loadOnlineUsers();

    // Refresh every 30 seconds
    const interval = setInterval(loadOnlineUsers, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch campus events
  useEffect(() => {
    const loadEvents = async () => {
      const eventsList = await fetchCampusEvents(1); // Get next event
      setEvents(eventsList);
    };

    loadEvents();
  }, []);

  // Fetch announcements
  useEffect(() => {
    const loadAnnouncements = async () => {
      const announcementsList = await fetchAnnouncements(1); // Get latest announcement
      setAnnouncements(announcementsList);
    };

    loadAnnouncements();
  }, []);

  // Avatar colors for users
  const colors = [
    "bg-blue-400",
    "bg-pink-400",
    "bg-purple-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-red-400",
  ];

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
      {/* Online Now */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest">
            ONLINE NOW
          </span>
          <span className="text-xs text-red-800 font-semibold">
            {onlineUsers.length} online
          </span>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {onlineUsers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              No one online right now
            </p>
          ) : (
            onlineUsers.map((u, index) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {u.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  {isUserOnline(u.last_seen) && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                    {u.username || "User"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {u.bio || "Active now"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <PublicRooms />
    </aside>
  );
}
