import React, { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Users,
  MessageCircle,
  LayoutGrid,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import MobileNavMenuButton from "../components/navigation/MobileNavMenuButton";
import {
  fetchJoinedRooms,
  fetchPublicRooms,
  fetchRoom,
  fetchRoomMembers,
  joinPublicRoom,
} from "../utils/social";
import RoomPreviewModal from "../components/rooms/RoomPreviewModal";
import { useUser } from "../contexts/UserContext";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useUser();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [publicRooms, setPublicRooms] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [toast, setToast] = useState(
    location?.state?.showToast
      ? { type: "success", message: location.state.message || "" }
      : null,
  );
  const [previewRoom, setPreviewRoom] = useState(null);
  const [joinPasscode, setJoinPasscode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const normalizeRoom = (data) => {
    const creatorId = data?.creatorId ?? data?.creator_id ?? null;
    return {
      ...data,
      participantCount: data?.participantCount ?? data?.participant_count ?? 0,
      creatorId,
      isPublic: data?.isPublic ?? data?.is_public ?? true,
      isMember:
        data?.isMember ??
        data?.is_member ??
        (profile?.id ? creatorId === profile.id : false),
    };
  };

  const joinedIds = useMemo(
    () => new Set(joinedRooms.map((item) => item.id)),
    [joinedRooms],
  );

  useEffect(() => {
    let mounted = true;

    const loadRoom = async () => {
      try {
        const data = await fetchRoom(roomId);
        if (!mounted) return;
        setRoom(normalizeRoom(data));
        setLoadError("");
      } catch (err) {
        console.error("Failed to load room:", err);
        if (mounted) setLoadError(err.message || "Failed to load room");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadRoom();
    return () => {
      mounted = false;
    };
  }, [roomId, profile?.id]);

  useEffect(() => {
    let mounted = true;

    const loadLists = async () => {
      try {
        const [joinedList, publicList] = await Promise.all([
          fetchJoinedRooms(),
          fetchPublicRooms(50),
        ]);
        if (!mounted) return;
        setJoinedRooms(
          (Array.isArray(joinedList) ? joinedList : []).map(normalizeRoom),
        );
        setPublicRooms(
          (Array.isArray(publicList) ? publicList : []).map(normalizeRoom),
        );
      } catch (err) {
        console.error("Failed to load room lists:", err);
      } finally {
        if (mounted) setListsLoading(false);
      }
    };

    loadLists();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!room?.id) return;
    const isAllowed =
      room.isMember || room.creatorId === profile?.id || room.isPublic;
    if (!isAllowed) return;

    let mounted = true;
    setMembersLoading(true);

    fetchRoomMembers(room.id, 6)
      .then((list) => {
        if (!mounted) return;
        setMembers(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error("Failed to load room members:", err))
      .finally(() => {
        if (mounted) setMembersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [room?.id, room?.isMember, room?.isPublic, profile?.id]);

  useEffect(() => {
    if (!toast?.message) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const openPreview = (targetRoom) => {
    setJoinPasscode("");
    setJoinError("");
    setPreviewRoom(normalizeRoom(targetRoom));
  };

  const handleJoinRoom = async (targetRoom, { closeModal = false } = {}) => {
    if (!targetRoom) return;
    const needsPasscode = !targetRoom.isPublic;
    const trimmedPasscode = joinPasscode.trim();

    if (needsPasscode && !trimmedPasscode) {
      setJoinError("Passcode is required for private rooms.");
      return;
    }

    try {
      setJoining(true);
      setJoinError("");

      const response = await joinPublicRoom(
        targetRoom.id,
        needsPasscode ? trimmedPasscode : undefined,
      );

      const updated = normalizeRoom({ ...targetRoom, is_member: true });

      setJoinedRooms((prev) => {
        if (prev.some((item) => item.id === updated.id)) return prev;
        return [updated, ...prev];
      });

      setPublicRooms((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, is_member: true } : item,
        ),
      );

      if (targetRoom.id === roomId) {
        setRoom((current) =>
          current
            ? {
                ...current,
                participantCount:
                  response?.participantCount ?? current.participantCount,
                isMember: true,
              }
            : current,
        );
      }

      if (closeModal) {
        setPreviewRoom(null);
      }

      navigate(`/rooms/${targetRoom.id}`, {
        state: {
          showToast: true,
          message: response?.alreadyMember ? "Already joined" : "Joined room",
        },
      });
    } catch (err) {
      console.error("Join failed:", err);
      if (closeModal) {
        setJoinError(err.message || "Failed to join room");
      } else {
        setToast({
          type: "error",
          message: err.message || "Failed to join room",
        });
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (loadError) return <div className="p-6">{loadError}</div>;
  if (!room) return <div className="p-6">Room not found</div>;

  const isCreator = room.creatorId && profile?.id === room.creatorId;
  const isMember = room.isMember || isCreator || joinedIds.has(room.id);

  const visiblePublicRooms = publicRooms.filter(
    (item) => !joinedIds.has(item.id),
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex min-w-0 overflow-hidden">
        <aside className="hidden lg:flex flex-col w-72 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Rooms</h3>
            <p className="text-xs text-gray-400">
              Jump back into your active rooms
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Joined rooms
                </h4>
                <span className="text-xs text-gray-400">
                  {joinedRooms.length}
                </span>
              </div>

              {listsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`joined-skeleton-${index}`}
                      className="h-12 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : joinedRooms.length === 0 ? (
                <div className="text-xs text-gray-400">
                  No joined rooms yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {joinedRooms.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/rooms/${item.id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
                        item.id === room.id
                          ? "bg-red-50 text-red-800"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-800/10 text-red-800 flex items-center justify-center text-xs font-bold">
                        {item.title?.[0]?.toUpperCase() || "R"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.description || "No description"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Public rooms
                </h4>
                <span className="text-xs text-gray-400">
                  {visiblePublicRooms.length}
                </span>
              </div>

              {listsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`public-skeleton-${index}`}
                      className="h-12 rounded-lg bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : visiblePublicRooms.length === 0 ? (
                <div className="text-xs text-gray-400">No public rooms.</div>
              ) : (
                <div className="space-y-2">
                  {visiblePublicRooms.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openPreview(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                        {item.title?.[0]?.toUpperCase() || "R"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {item.title}
                          </p>
                          {!item.isPublic && (
                            <Lock size={12} className="text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {item.description || "No description"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Queues
                </h4>
                <LayoutGrid size={12} className="text-gray-300" />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Study groups", count: "12" },
                  { label: "Events", count: "4" },
                  { label: "Clubs", count: "7" },
                ].map((queue) => (
                  <div
                    key={queue.label}
                    className="flex items-center justify-between text-xs text-gray-500 px-3 py-2 rounded-lg bg-gray-50"
                  >
                    <span>{queue.label}</span>
                    <span className="text-gray-400">{queue.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <MobileNavMenuButton />
                <button
                  onClick={() => navigate("/rooms")}
                  className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Back to rooms"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {room.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {room.description || "No description"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                  <Users size={14} />
                  {room.participantCount}/{room.capacity ?? "-"}
                </div>

                {!isMember && (
                  <button
                    onClick={() => openPreview(room)}
                    className="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
              {toast?.message && (
                <div
                  className={`mb-4 px-4 py-2 rounded font-semibold text-sm ${
                    toast.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-800"
                  }`}
                >
                  {toast.message}
                </div>
              )}

              {!isMember ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-700">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Preview mode
                      </h2>
                      <p className="text-sm text-gray-500">
                        Join this room to view messages and participate.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => openPreview(room)}
                      className="bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                    >
                      Join room
                    </button>
                    <span className="text-xs text-gray-400">
                      {room.isPublic ? "Public room" : "Passcode required"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-800 flex items-center justify-center text-white">
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Room chat
                      </h2>
                      <p className="text-sm text-gray-500">
                        Messages will appear here once room chat is enabled.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                    No messages yet. Start the conversation when chat goes live.
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden xl:block w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Room info</h3>
              <p className="text-xs text-gray-500 mt-1">
                {room.description || "No description"}
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-500">
              <div>
                <span className="font-semibold text-gray-700">Created by:</span>{" "}
                {room.profiles?.username ?? "Unknown"}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status:</span>{" "}
                {room.isPublic ? "Public" : "Private"}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Capacity:</span>{" "}
                {room.capacity ?? "-"}
              </div>
              <div>
                <span className="font-semibold text-gray-700">
                  Participants:
                </span>{" "}
                {room.participantCount}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Members preview
              </h4>
              {membersLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`member-skeleton-${index}`}
                      className="w-12 h-12 rounded-full bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-xs text-gray-400">
                  No members to preview yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden"
                      title={member.profiles?.username || "Member"}
                    >
                      {member.profiles?.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-600">
                          {(member.profiles?.username || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {previewRoom && (
        <RoomPreviewModal
          room={previewRoom}
          passcode={joinPasscode}
          onPasscodeChange={setJoinPasscode}
          onClose={() => setPreviewRoom(null)}
          onJoin={() => handleJoinRoom(previewRoom, { closeModal: true })}
          joining={joining}
          error={joinError}
        />
      )}
    </div>
  );
}
