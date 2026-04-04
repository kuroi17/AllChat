import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchOnlineUsers,
  isUserOnline,
  fetchFollowing,
} from "../../utils/social";
import { ONLINE_USERS_REFETCH_INTERVAL_MS } from "../../utils/runtimeConfig";
import PublicRooms from "../PublicRooms";
import { useUser } from "../../contexts/UserContext";

export default function Sidebar() {
  const { user } = useUser();

  const { data: onlineUsers = [] } = useQuery({
    queryKey: ["presence", "onlineUsers"],
    queryFn: () => fetchOnlineUsers(100),
    staleTime: ONLINE_USERS_REFETCH_INTERVAL_MS,
    refetchInterval: ONLINE_USERS_REFETCH_INTERVAL_MS,
  });

  const { data: followingUsers = [] } = useQuery({
    queryKey: ["follows", "following", user?.id],
    queryFn: () => fetchFollowing(user.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const followingIds = useMemo(
    () => new Set((followingUsers || []).map((profile) => profile.id)),
    [followingUsers],
  );

  const onlineFollowings = useMemo(
    () => (onlineUsers || []).filter((profile) => followingIds.has(profile.id)),
    [onlineUsers, followingIds],
  );

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
          {onlineFollowings.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              No followings online right now
            </p>
          ) : (
            onlineFollowings.map((u, index) => (
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
