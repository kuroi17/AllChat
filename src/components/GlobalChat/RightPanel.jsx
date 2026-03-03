import { useState, useEffect } from "react";
import { Calendar, Megaphone, Coffee } from "lucide-react";
import {
  fetchOnlineUsers,
  isUserOnline,
  fetchCampusEvents,
  fetchAnnouncements,
} from "../../utils/social";

export default function Sidebar() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Fetch online users
  useEffect(() => {
    const loadOnlineUsers = async () => {
      const users = await fetchOnlineUsers(3); // Get top 3 online users
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
          <button className="text-xs text-red-800 font-semibold hover:underline">
            View All
          </button>
        </div>
        <div className="space-y-3">
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

      {/* Campus Info */}
      <div className="p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest">
          CAMPUS INFO
        </p>

        {/* Upcoming Event */}
        {events.length > 0 ? (
          <div className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={16} className="text-red-800" />
              <span className="text-[10px] font-bold text-red-800 tracking-wider">
                UPCOMING EVENT
              </span>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">
              {events[0].title}
            </p>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {events[0].description || "No description available"}
            </p>
            {events[0].event_date && (
              <p className="text-xs text-gray-400 mb-2">
                {new Date(events[0].event_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            <button className="w-full py-1.5 border border-red-300 text-red-800 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
              Register Now
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={16} className="text-red-800" />
              <span className="text-[10px] font-bold text-red-800 tracking-wider">
                UPCOMING EVENT
              </span>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">
              Hackathon 2024
            </p>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Join us for 48 hours of building, learning, and free snacks!
            </p>
            <button className="w-full py-1.5 border border-red-300 text-red-800 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
              Register Now
            </button>
          </div>
        )}

        {/* Announcement */}
        {announcements.length > 0 ? (
          <div className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Megaphone size={16} className="text-gray-600" />
              <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                ANNOUNCEMENT
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-1">
              {announcements[0].title}
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {announcements[0].content}
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Megaphone size={16} className="text-gray-600" />
              <span className="text-[10px] font-bold text-gray-400 tracking-wider">
                ANNOUNCEMENT
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              New Coffee Shop opening in the Engineering wing next Monday!{" "}
              <Coffee size={14} className="inline-block ml-1 text-gray-600" />
            </p>
          </div>
        )}

        {/* Trending / Active */}
        <div className="flex gap-2">
          <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 font-semibold mb-1">
              TRENDING
            </p>
            <p className="text-sm font-bold text-red-800">#FinalsWeek</p>
          </div>
          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 font-semibold mb-1">
              ACTIVE
            </p>
            <p className="text-sm font-bold text-gray-800">32 Clubs</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
