import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users, Lock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import { fetchRoomInvitePreview, joinRoomWithInvite } from "../utils/social";

export default function RoomInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const { data: room, isLoading: loading } = useQuery({
    queryKey: ["rooms", "invitePreview", token],
    queryFn: () => fetchRoomInvitePreview(token),
    enabled: !!token,
  });

  const joinMutation = useMutation({
    mutationFn: () => joinRoomWithInvite(token),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      const roomId = response?.roomId || room?.id;
      navigate(`/rooms/${roomId}`, {
        state: {
          showToast: true,
          message: response?.alreadyMember ? "Already joined" : "Joined room",
        },
      });
    },
    onError: (err) => {
      setError(err.message || "Failed to join room");
    },
  });

  const handleJoin = async () => {
    if (!token) return;
    if (room?.is_member && room?.id) {
      navigate(`/rooms/${room.id}`);
      return;
    }
    setError("");
    joinMutation.mutate();
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full p-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading invite...</p>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center overflow-hidden">
                  {room?.avatar_url ? (
                    <img
                      src={room.avatar_url}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-semibold">
                      {room?.title?.[0]?.toUpperCase() || "R"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold text-gray-900 truncate">
                    {room?.title || "Room"}
                  </h1>
                  <p className="text-xs text-gray-500 truncate">
                    {room?.description || "Invite-only room"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Users size={14} />
                {room?.participant_count ?? 0} members
                {!room?.is_public && (
                  <span className="inline-flex items-center gap-1 ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                    <Lock size={10} /> Private
                  </span>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => navigate("/rooms")}
                  className="text-sm text-gray-500 px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                  className="text-sm bg-red-800 text-white px-4 py-1.5 rounded-lg disabled:opacity-60"
                >
                  {room?.is_member
                    ? "Open room"
                    : joinMutation.isPending
                      ? "Joining..."
                      : "Join room"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
