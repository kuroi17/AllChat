import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../layouts/Sidebar";
import { fetchPublicRooms } from "../utils/social";
import { PlusSquare } from "lucide-react";

export default function RoomsList() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await fetchPublicRooms(100);
        if (!mounted) return;
        setRooms(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => (mounted = false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <h1 className="text-lg font-bold">Rooms</h1>
          <button
            onClick={() => navigate("/")}
            className="ml-auto text-red-800 flex items-center gap-2 bg-red-50 px-3 py-1 rounded-lg"
          >
            <PlusSquare size={16} /> Create
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
            {loading ? (
              <div className="p-6 text-center text-gray-500">
                Loading rooms...
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No rooms yet</div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/rooms/${room.id}`)}
                    className="w-full text-left bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-800 truncate">
                          {room.title}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                          {room.is_public ? "Public" : "Private"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {room.description}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500">
                      {room.participant_count ?? room.participantCount ?? 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
