import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import {
  fetchArchivedRooms,
  fetchJoinedRooms,
  fetchPublicRooms,
  createPublicRoom,
  joinPublicRoom,
  updateRoomAvatar,
  uploadRoomAvatar,
} from "../utils/social";
import RoomsHeader from "../components/rooms/RoomsHeader";
import RoomCard from "../components/rooms/RoomCard";
import RoomPreviewModal from "../components/rooms/RoomPreviewModal";
import RoomCreateModal from "../components/rooms/RoomCreateModal";
import { toSafeErrorMessage } from "../utils/safeErrorMessage";

export default function RoomsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [joinedVisibleCount, setJoinedVisibleCount] = useState(12);
  const [publicVisibleCount, setPublicVisibleCount] = useState(12);
  const [previewRoom, setPreviewRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();
  const { profile } = useUser();
  const queryClient = useQueryClient();

  const colors = [
    "bg-blue-400",
    "bg-pink-400",
    "bg-purple-400",
    "bg-green-400",
    "bg-yellow-400",
    "bg-red-400",
  ];

  const normalizeRoom = (room) => {
    const creatorId = room?.creatorId ?? room?.creator_id ?? null;
    return {
      ...room,
      participantCount: room.participantCount ?? room.participant_count ?? 0,
      creatorId,
      isPublic: room.isPublic ?? room.is_public ?? true,
      isMember:
        room.isMember ??
        room.is_member ??
        (profile?.id ? creatorId === profile.id : false),
    };
  };

  const { data: publicRooms = [], isLoading: loadingPublicRooms } = useQuery({
    queryKey: ["rooms", "public", 1000],
    queryFn: () => fetchPublicRooms(1000),
    enabled: !!profile?.id,
  });

  const { data: joinedRoomsRaw = [], isLoading: loadingJoinedRooms } = useQuery(
    {
      queryKey: ["rooms", "joined"],
      queryFn: fetchJoinedRooms,
      enabled: !!profile?.id,
    },
  );

  const { data: archivedRoomsRaw = [], isLoading: loadingArchivedRooms } =
    useQuery({
      queryKey: ["rooms", "archive", 100],
      queryFn: () => fetchArchivedRooms(100),
      enabled: !!profile?.id,
    });

  const rooms = useMemo(
    () => (Array.isArray(publicRooms) ? publicRooms : []).map(normalizeRoom),
    [publicRooms, profile?.id],
  );

  const joinedRooms = useMemo(
    () =>
      (Array.isArray(joinedRoomsRaw) ? joinedRoomsRaw : []).map(normalizeRoom),
    [joinedRoomsRaw, profile?.id],
  );

  const loading =
    loadingPublicRooms || loadingJoinedRooms || loadingArchivedRooms;

  const joinedIds = useMemo(
    () => new Set(joinedRooms.map((room) => room.id)),
    [joinedRooms],
  );

  const archivedIds = useMemo(
    () =>
      new Set(
        (Array.isArray(archivedRoomsRaw) ? archivedRoomsRaw : [])
          .map((room) => room?.room_id)
          .filter(Boolean),
      ),
    [archivedRoomsRaw],
  );

  const joinMutation = useMutation({
    mutationFn: (targetRoomId) => joinPublicRoom(targetRoomId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      const targetRoomId = previewRoom?.id;
      setPreviewRoom(null);
      if (targetRoomId) {
        navigate(`/rooms/${targetRoomId}`, {
          state: {
            showToast: true,
            message: response?.alreadyMember ? "Already joined" : "Joined room",
          },
        });
      }
    },
    onError: (err) => {
      setJoinError(toSafeErrorMessage(err, "Failed to join room."));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { logoFile, ...roomPayload } = payload || {};
      const created = await createPublicRoom(roomPayload);

      if (created?.id && logoFile) {
        try {
          const avatarUrl = await uploadRoomAvatar({
            roomId: created.id,
            file: logoFile,
          });
          await updateRoomAvatar(created.id, avatarUrl);
          created.avatar_url = avatarUrl;
        } catch (logoError) {
          created.logoUploadError =
            logoError?.message || "Room logo upload failed";
        }
      }

      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      if (!created?.id) {
        setCreateError("Room creation failed");
        return;
      }
      setShowCreate(false);
      navigate(`/rooms/${created.id}`, {
        state: {
          showToast: true,
          message: created.logoUploadError
            ? "Room created (logo upload failed)"
            : "Room created",
        },
      });
    },
    onError: (err) => {
      setCreateError(toSafeErrorMessage(err, "Failed to create room."));
    },
  });

  const totalRooms = useMemo(() => {
    const ids = new Set();
    rooms.forEach((room) => ids.add(room.id));
    joinedRooms.forEach((room) => ids.add(room.id));
    return ids.size;
  }, [rooms, joinedRooms]);

  const filterRoom = (room) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      room.title?.toLowerCase().includes(query) ||
      room.description?.toLowerCase().includes(query) ||
      room.profiles?.username?.toLowerCase().includes(query)
    );
  };

  const filteredJoined = joinedRooms.filter(filterRoom);
  const filteredPublic = rooms
    .filter((room) => !archivedIds.has(room.id))
    .filter((room) => !joinedIds.has(room.id))
    .filter(filterRoom);

  const visibleJoinedRooms = filteredJoined.slice(0, joinedVisibleCount);
  const visiblePublicRooms = filteredPublic.slice(0, publicVisibleCount);

  const hasMoreJoined = filteredJoined.length > visibleJoinedRooms.length;
  const hasMorePublic = filteredPublic.length > visiblePublicRooms.length;

  const getRelativeTime = (dateString) => {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleOpenRoom = (room) => {
    const isJoined =
      room.isMember || joinedIds.has(room.id) || room.creatorId === profile?.id;

    if (isJoined) {
      navigate(`/rooms/${room.id}`);
      return;
    }

    setJoinError("");
    setPreviewRoom(room);
  };

  const handleJoin = async () => {
    if (!previewRoom) return;
    setJoinError("");
    joinMutation.mutate(previewRoom.id);
  };

  const handleCreateRoom = async (payload) => {
    setCreateError("");
    createMutation.mutate(payload);
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-gray-100 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-4 w-16 bg-gray-200 rounded-full" />
                <div className="h-4 w-20 bg-gray-200 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const openCreate = () => {
    setCreateError("");
    setShowCreate(true);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setJoinedVisibleCount(12);
    setPublicVisibleCount(12);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RoomsHeader
          roomsCount={totalRooms}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onCreate={openCreate}
        />

        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6 space-y-8">
            {loading ? (
              renderSkeleton()
            ) : totalRooms === 0 ? (
              <div className="text-center py-14 sm:py-20">
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-red-100 flex items-center justify-center">
                  <Users size={40} className="text-red-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  No rooms yet
                </h2>
                <p className="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">
                  Create a room to start a conversation or explore public rooms.
                </p>
              </div>
            ) : (
              <>
                {filteredJoined.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        Joined rooms
                      </h3>
                      <span className="text-xs text-gray-400">
                        {filteredJoined.length} room
                        {filteredJoined.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {visibleJoinedRooms.map((room, index) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          index={index}
                          colors={colors}
                          onClick={() => handleOpenRoom(room)}
                          isJoined={true}
                          getRelativeTime={getRelativeTime}
                        />
                      ))}

                      {hasMoreJoined && (
                        <button
                          type="button"
                          onClick={() =>
                            setJoinedVisibleCount((prev) => prev + 12)
                          }
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Show more joined rooms
                        </button>
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                      Explore public rooms
                    </h3>
                    <span className="text-xs text-gray-400">
                      {filteredPublic.length} room
                      {filteredPublic.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {filteredPublic.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                      No public rooms match your search.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visiblePublicRooms.map((room, index) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          index={index}
                          colors={colors}
                          onClick={() => handleOpenRoom(room)}
                          isJoined={false}
                          getRelativeTime={getRelativeTime}
                        />
                      ))}

                      {hasMorePublic && (
                        <button
                          type="button"
                          onClick={() =>
                            setPublicVisibleCount((prev) => prev + 12)
                          }
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Show more public rooms
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      {previewRoom && (
        <RoomPreviewModal
          room={previewRoom}
          onClose={() => setPreviewRoom(null)}
          onJoin={handleJoin}
          joining={joinMutation.isPending}
          error={joinError}
        />
      )}

      <RoomCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateRoom}
        creating={createMutation.isPending}
        error={createError}
      />
    </div>
  );
}
