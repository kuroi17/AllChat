import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import { fetchRoomInvitePreview, fetchRoomPreview } from "../../utils/social";

export default function RoomLinkPreviewCard({
  roomId,
  inviteToken,
  className = "",
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = inviteToken
          ? await fetchRoomInvitePreview(inviteToken)
          : await fetchRoomPreview(roomId);
        if (!mounted) return;
        setRoom(data || null);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load room preview");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (inviteToken || roomId) {
      load();
    }

    return () => {
      mounted = false;
    };
  }, [roomId, inviteToken]);

  const handleOpen = () => {
    if (inviteToken) {
      navigate(`/invite/${inviteToken}`);
      return;
    }

    if (room?.id || roomId) {
      navigate(`/rooms/${room?.id || roomId}`);
    }
  };

  if (loading) {
    return (
      <div
        className={`mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3 ${className}`}
      >
        <div className="h-3 w-24 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-2 w-40 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-2 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div
        className={`mt-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500 ${className}`}
      >
        Room preview unavailable
      </div>
    );
  }

  const isMember = room.is_member || room.isMember;
  const participantCount = room.participant_count ?? room.participantCount ?? 0;

  return (
    <div
      className={`mt-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center overflow-hidden">
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt={room.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold">
              {room.title?.[0]?.toUpperCase() || "R"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {room.title || "Room"}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {room.description || "Invite-only room"}
          </p>
        </div>
        {isMember ? (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100">
            Joined
          </span>
        ) : (
          <button
            onClick={handleOpen}
            className="text-xs font-semibold text-red-800 bg-red-50 border border-red-100 px-2 py-1 rounded-lg"
          >
            Open
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
        <Users size={12} />
        {participantCount} members
        {!room.is_public && (
          <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
            <Lock size={10} /> Private
          </span>
        )}
      </div>
    </div>
  );
}
