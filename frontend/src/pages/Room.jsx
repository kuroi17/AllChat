import React, { useEffect, useState } from "react";
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { fetchRoom, joinPublicRoom } from "../utils/social";
import { useUser } from "../contexts/UserContext";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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
          participantCount: data.participantCount ?? data.participant_count ?? 0,
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

  const isCreator = profile && (profile.id === room.creatorId || profile.id === room.creator_id);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-600 hover:text-gray-800"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">{room.title}</h1>
            <p className="text-xs text-gray-500 truncate">{room.description}</p>
          </div>

          <div className="text-sm text-gray-500">
            {room.participantCount}/{room.capacity ?? "—"}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
            {toast && (
              <div className="mb-4 px-4 py-2 rounded bg-green-50 text-green-800 font-semibold">
                {toast}
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-md font-semibold text-gray-800">About this room</h2>
              <p className="text-sm text-gray-600 mt-2">{room.description || "No description"}</p>

              <div className="mt-4 flex items-center gap-3">
                <div className="text-sm text-gray-500">
                  Participants: {room.participantCount}
                </div>

                {!isCreator && (
                  <button
                    onClick={handleJoin}
                    className="ml-auto bg-red-800 text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="hidden xl:block w-64 border-l border-gray-200 bg-white overflow-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800">Room Info</h3>
          <p className="text-xs text-gray-500 mt-1">{room.description}</p>

          <div className="mt-3 text-xs text-gray-500">
            Created by: {room.profiles?.username ?? room.creator_username ?? "—"}
          </div>

          <div className="mt-2 text-sm font-semibold text-gray-800">{room.participantCount} participants</div>
        </div>
      </aside>
    </div>
  );
}
  );
}
