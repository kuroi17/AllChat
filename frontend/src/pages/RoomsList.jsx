import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import {
  fetchJoinedRooms,
  fetchPublicRooms,
  createPublicRoom,
  joinPublicRoom,
} from "../utils/social";
import RoomsHeader from "../components/rooms/RoomsHeader";
import RoomCard from "../components/rooms/RoomCard";
import RoomPreviewModal from "../components/rooms/RoomPreviewModal";
import RoomCreateModal from "../components/rooms/RoomCreateModal";

export default function RoomsList() {
  const [rooms, setRooms] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewRoom, setPreviewRoom] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();
  const { profile } = useUser();

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

  const joinedIds = useMemo(
    () => new Set(joinedRooms.map((room) => room.id)),
    [joinedRooms],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [publicList, joinedList] = await Promise.all([
          fetchPublicRooms(100),
          fetchJoinedRooms(),
        ]);
        if (!mounted) return;
        setRooms(
          (Array.isArray(publicList) ? publicList : []).map(normalizeRoom),
        );
        setJoinedRooms(
          (Array.isArray(joinedList) ? joinedList : []).map(normalizeRoom),
        );
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

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
    .filter((room) => !joinedIds.has(room.id))
    .filter(filterRoom);

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

    try {
      setJoining(true);
      setJoinError("");
      const response = await joinPublicRoom(previewRoom.id);

      const normalized = normalizeRoom({
        ...previewRoom,
        is_member: true,
      });

      setJoinedRooms((prev) => {
        if (prev.some((room) => room.id === normalized.id)) return prev;
        return [normalized, ...prev];
      });

      setRooms((prev) =>
        prev.map((room) =>
          room.id === normalized.id ? { ...room, is_member: true } : room,
        ),
      );

      setPreviewRoom(null);
      navigate(`/rooms/${previewRoom.id}`, {
        state: {
          showToast: true,
          message: response?.alreadyMember ? "Already joined" : "Joined room",
        },
      });
    } catch (err) {
      setJoinError(err.message || "Failed to join room");
    } finally {
      setJoining(false);
    }
  };

  const handleCreateRoom = async (payload) => {
    try {
      setCreating(true);
      setCreateError("");
      const created = await createPublicRoom(payload);

      if (!created?.id) {
        throw new Error("Room creation failed");
      }

      const normalized = normalizeRoom({
        ...created,
        is_member: true,
      });

      setJoinedRooms((prev) => [normalized, ...prev]);
      setRooms((prev) => [normalized, ...prev]);

      setShowCreate(false);
      navigate(`/rooms/${normalized.id}`, {
        state: { showToast: true, message: "Room created" },
      });
    } catch (err) {
      setCreateError(err.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
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

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <RoomsHeader
          roomsCount={totalRooms}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
                      {filteredJoined.map((room, index) => (
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
                      {filteredPublic.map((room, index) => (
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
          joining={joining}
          error={joinError}
        />
      )}

      <RoomCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateRoom}
        creating={creating}
        error={createError}
      />
    </div>
  );
}
