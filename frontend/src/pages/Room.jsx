import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { fetchRoom, joinPublicRoom } from "../utils/social";
import { useUser } from "../contexts/UserContext";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const { profile } = useUser();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(
    location?.state?.showToast ? location.state.message || "" : "",
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchRoom(roomId);
        if (!mounted) return;
        setRoom({
          ...data,
          participantCount:
            data.participantCount ?? data.participant_count ?? 0,
          creatorId: data.creatorId ?? data.creator_id ?? null,
        });
      } catch (err) {
        console.error("Failed to load room:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleJoin() {
    if (!room) return;
    try {
      const res = await joinPublicRoom(room.id);
      const newCount = res?.participantCount ?? room.participantCount + 1;
      setRoom((r) => ({ ...r, participantCount: newCount }));
      setToast("Joined room");
    } catch (err) {
      console.error("Join failed:", err);
      alert("Failed to join room: " + (err.message || err));
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!room) return <div className="p-6">Room not found</div>;

  const isCreator =
    profile &&
    (profile.id === room.creatorId || profile.id === room.creator_id);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {toast && (
        <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-800 font-semibold">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900">{room.title}</h1>
      <p className="text-sm text-gray-600 mt-2">{room.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {room.participantCount}/{room.capacity || "—"} participants
        </div>
        {!isCreator && (
          <button
            onClick={handleJoin}
            className="bg-red-800 text-white px-3 py-1 rounded-lg text-sm"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
}
