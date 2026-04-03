import { Archive, ArrowLeft, Clock3, RefreshCcw, Users } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import MobileNavMenuButton from "../components/navigation/MobileNavMenuButton";
import { fetchArchivedRooms, joinPublicRoom } from "../utils/social";

function getRelativeLeaveTime(timestamp) {
  if (!timestamp) return "Unknown";

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return new Date(timestamp).toLocaleString();
  }

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RoomArchive() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: archivedRooms = [], isLoading } = useQuery({
    queryKey: ["rooms", "archive", 100],
    queryFn: () => fetchArchivedRooms(100),
  });

  const rejoinMutation = useMutation({
    mutationFn: (roomId) => joinPublicRoom(roomId),
    onSuccess: (_result, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", "archive", 100] });
      navigate(`/rooms/${roomId}`, {
        state: {
          showToast: true,
          message: "Welcome back to the room",
        },
      });
    },
  });

  const rooms = useMemo(
    () => (Array.isArray(archivedRooms) ? archivedRooms : []),
    [archivedRooms],
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <header className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <MobileNavMenuButton />
                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                  aria-label="Back to settings"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    Room Archive
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Rooms you left are saved here.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["rooms", "archive", 100],
                  })
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4" />
                Refresh
              </button>
            </header>

            <div className="p-4 sm:p-6">
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`archive-skeleton-${index}`}
                      className="rounded-2xl border border-gray-200 px-4 py-3"
                    >
                      <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-60 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : rooms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-white border border-gray-200 text-gray-500 flex items-center justify-center">
                    <Archive className="w-5 h-5" />
                  </div>
                  <h2 className="mt-3 text-base sm:text-lg font-semibold text-gray-900">
                    Archive is empty
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Leave a room and it will appear here for quick rejoin later.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => {
                    const isJoining =
                      rejoinMutation.isPending &&
                      rejoinMutation.variables === room.room_id;

                    return (
                      <article
                        key={`${room.room_id}-${room.left_at}`}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          {room.room_avatar_url ? (
                            <img
                              src={room.room_avatar_url}
                              alt={room.room_title || "Room"}
                              className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-red-50 text-red-700 border border-red-100 flex items-center justify-center shrink-0 font-semibold">
                              {(room.room_title || "R").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {room.room_title || "Untitled room"}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                              {room.room_description || "No description"}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="w-3 h-3" />
                                Left {getRelativeLeaveTime(room.left_at)}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5">
                                <Users className="w-3 h-3" />
                                {room.room_is_public ? "Public" : "Private"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {room.room_is_public ? (
                          <button
                            type="button"
                            onClick={() => rejoinMutation.mutate(room.room_id)}
                            disabled={isJoining}
                            className="inline-flex items-center justify-center rounded-xl bg-red-600 text-white px-3 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                          >
                            {isJoining ? "Rejoining..." : "Rejoin"}
                          </button>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500">
                            Invite needed
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
