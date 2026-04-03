import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchRoomMembers } from "../../utils/social";

function formatJoinedAt(timestamp) {
  if (!timestamp) return "Joined recently";

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Joined recently";
  }

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Joined just now";
  if (mins < 60) return `Joined ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Joined ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Joined ${days}d ago`;

  return `Joined ${new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}`;
}

export default function RoomMembersPanel({ roomId, isMember }) {
  const [memberLimit, setMemberLimit] = useState(24);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["rooms", "members", roomId, memberLimit],
    queryFn: () => fetchRoomMembers(roomId, memberLimit),
    enabled: !!roomId && !!isMember,
    staleTime: 15_000,
  });

  const normalizedMembers = useMemo(
    () => (Array.isArray(members) ? members : []),
    [members],
  );

  const filteredMembers = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return normalizedMembers;

    return normalizedMembers.filter((member) =>
      (member?.profiles?.username || "").toLowerCase().includes(needle),
    );
  }, [normalizedMembers, searchQuery]);

  const canLoadMore =
    normalizedMembers.length >= memberLimit && memberLimit < 120;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Members</h4>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          {normalizedMembers.length}
        </span>
      </div>

      {!isMember ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 text-center">
          Join this room to view members.
        </div>
      ) : isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`room-member-skeleton-${index}`}
              className="h-10 rounded-xl bg-gray-100"
            />
          ))}
        </div>
      ) : (
        <>
          {normalizedMembers.length > 8 && (
            <label className="relative mb-3 block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search member"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </label>
          )}

          {filteredMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 text-center">
              No members match your search.
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
              {filteredMembers.map((member) => {
                const username = member?.profiles?.username || "User";
                const avatarUrl = member?.profiles?.avatar_url;

                return (
                  <div
                    key={`${member.user_id}-${member.joined_at}`}
                    className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 flex items-center gap-2"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={username}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-red-50 text-red-700 border border-red-100 flex items-center justify-center text-xs font-semibold shrink-0">
                        {username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {username}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {formatJoinedAt(member.joined_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canLoadMore && !searchQuery.trim() && (
            <button
              type="button"
              onClick={() => setMemberLimit((prev) => prev + 24)}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Load more members
            </button>
          )}
        </>
      )}
    </section>
  );
}
