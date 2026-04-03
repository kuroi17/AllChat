import React, { useEffect, useMemo, useState } from "react";
import { MapPin, Users, X, Check, RefreshCw } from "lucide-react";
import Skeleton from "./ui/Skeleton";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPublicRooms, joinPublicRoom } from "../utils/social";
import { getChatSocket } from "../utils/messages";

export default function PublicRooms() {
  const { profile } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showJoin, setShowJoin] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);
  const [joinError, setJoinError] = useState("");

  const normalizeRoom = (r) => ({
    ...r,
    participantCount: r.participantCount ?? r.participant_count ?? 0,
    creatorId: r.creatorId ?? r.creator_id ?? null,
    isPublic: r.isPublic ?? r.is_public ?? true,
    isMember: r.isMember ?? r.is_member ?? false,
  });

  const {
    data: rooms = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["rooms", "public", "sidebar"],
    queryFn: () => fetchPublicRooms(5),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const normalizedRooms = useMemo(
    () => (Array.isArray(rooms) ? rooms : []).map(normalizeRoom),
    [rooms],
  );

  const publicRooms = useMemo(
    () => normalizedRooms.filter((room) => room.isPublic),
    [normalizedRooms],
  );

  const previewRooms = useMemo(() => publicRooms.slice(0, 5), [publicRooms]);

  useEffect(() => {
    let socketRef = null;
    let isDisposed = false;

    const handler = (payload) => {
      if (!payload?.roomId) {
        refetch();
        return;
      }

      let shouldRefetch = payload.type === "created";

      queryClient.setQueryData(["rooms", "public", "sidebar"], (prev = []) => {
        const roomExists = prev.some((room) => room.id === payload.roomId);

        if (!roomExists) {
          shouldRefetch = true;
          return prev;
        }

        return prev.map((room) =>
          room.id === payload.roomId
            ? {
                ...room,
                participant_count:
                  payload.participantCount ?? room.participant_count,
                participantCount:
                  payload.participantCount ?? room.participantCount,
              }
            : room,
        );
      });

      if (shouldRefetch) {
        refetch();
      }
    };

    (async () => {
      try {
        socketRef = await getChatSocket();
        if (isDisposed || !socketRef) return;
        socketRef.on("rooms:updated", handler);
      } catch (e) {
        // ignore socket errors
      }
    })();

    return () => {
      isDisposed = true;
      if (socketRef) {
        socketRef.off("rooms:updated", handler);
      }
    };
  }, [queryClient, refetch]);

  function openJoin(room) {
    setJoinTarget(room);
    setJoinError("");
    setShowJoin(true);
  }

  function confirmJoin() {
    if (!joinTarget) return;

    (async () => {
      try {
        const res = await joinPublicRoom(joinTarget.id);
        const participantCount =
          res?.participantCount ?? joinTarget.participantCount + 1;

        queryClient.setQueryData(["rooms", "public", "sidebar"], (prev = []) =>
          prev.map((r) =>
            r.id === joinTarget.id
              ? {
                  ...r,
                  participant_count: participantCount,
                  participantCount,
                  is_member: true,
                  isMember: true,
                }
              : r,
          ),
        );

        setShowJoin(false);
        setJoinTarget(null);
        navigate(`/rooms/${joinTarget.id}`, {
          state: {
            showToast: true,
            message: res?.alreadyMember ? "Already joined" : "Joined room",
          },
        });
      } catch (err) {
        console.error("Join failed:", err);
        setJoinError(err.message || "Failed to join room");
      }
    })();
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest">
          PUBLIC ROOMS
        </p>
        <button
          onClick={() => refetch()}
          className="text-gray-400 hover:text-gray-600"
          title="Refresh public rooms"
          aria-label="Refresh public rooms"
          disabled={isFetching}
        >
          {isFetching ? (
            <Skeleton className="w-3 h-3 rounded-full inline-block" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </div>

      <div className="space-y-2">
        {previewRooms.map((room) => (
          <div key={room.id} className="border border-gray-200 rounded-xl p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 truncate">
                    {room.title}
                  </h4>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${room.isPublic ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-600 border border-gray-100"}`}
                  >
                    {room.isPublic ? "Public" : "Private"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {room.description}
                </p>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                  <MapPin size={12} /> {room.location}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-gray-500">
                  {room.participantCount ?? room.participant_count}/
                  {room.capacity}
                </div>
                {/* Hide Join if current user is the creator */}
                {(() => {
                  const isCreator =
                    profile &&
                    (profile.id === room.creatorId ||
                      profile.id === room.creator_id);
                  const isMember = room.isMember || isCreator;

                  if (isMember) {
                    return (
                      <button
                        onClick={() => navigate(`/rooms/${room.id}`)}
                        className="text-xs bg-white text-red-800 px-3 py-1 rounded-lg font-semibold border border-red-100 hover:bg-red-50"
                      >
                        Open
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => openJoin(room)}
                      className="text-xs bg-red-800 text-white px-3 py-1 rounded-lg font-semibold hover:opacity-95"
                    >
                      Join
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}

        {!previewRooms.length && (
          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-500">
            No public rooms available right now.
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoin && joinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Join Room</h3>
              <button
                onClick={() => setShowJoin(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-semibold text-gray-800">
              {joinTarget.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {joinTarget.description}
            </p>

            {joinError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {joinError}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {joinTarget.participantCount}/{joinTarget.capacity} participants
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="text-sm text-gray-500 px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmJoin}
                  className="text-sm bg-red-800 text-white px-3 py-1 rounded-lg flex items-center gap-2"
                >
                  <Check size={14} /> Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
