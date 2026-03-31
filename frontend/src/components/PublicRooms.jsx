import React, { useState, useEffect } from "react";
import { PlusSquare, MapPin, Lock, Users, X, Check } from "lucide-react";
import {
  fetchPublicRooms,
  createPublicRoom,
  joinPublicRoom,
} from "../utils/social";
import { getChatSocket } from "../utils/messages";

export default function PublicRooms() {
  const [rooms, setRooms] = useState([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    isPublic: true,
  });

  function openCreate() {
    setForm({ title: "", description: "", isPublic: true });
    setShowCreate(true);
  }

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const list = await fetchPublicRooms(50);
        if (mounted) setRooms(list);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      }
    };

    load();

    // subscribe to socket updates
    (async () => {
      try {
        const socket = await getChatSocket();
        const handler = (payload) => {
          if (!payload || !payload.roomId) return;
          setRooms((prev) =>
            prev.map((r) =>
              r.id === payload.roomId
                ? {
                    ...r,
                    participantCount:
                      payload.participantCount ?? r.participantCount,
                  }
                : r,
            ),
          );
        };

        socket.on("rooms:updated", handler);
      } catch (e) {
        // ignore socket errors
      }
    })();

    return () => {
      mounted = false;
      (async () => {
        try {
          const s = await getChatSocket();
          s.off("rooms:updated");
        } catch (e) {}
      })();
    };
  }, []);

  function submitCreate(e) {
    e.preventDefault();
    (async () => {
      try {
        const created = await createPublicRoom({
          title: form.title,
          description: form.description,
          isPublic: form.isPublic,
        });

        if (created) {
          setRooms((prev) => [created, ...prev]);
        }
      } catch (err) {
        console.error("Create room failed:", err);
        alert("Failed to create room: " + (err.message || err));
      } finally {
        setShowCreate(false);
      }
    })();
  }

  function openJoin(room) {
    setJoinTarget(room);
    setShowJoin(true);
  }

  function confirmJoin() {
    if (!joinTarget) return;

    (async () => {
      try {
        const res = await joinPublicRoom(joinTarget.id);
        const participantCount =
          res?.participantCount ?? joinTarget.participantCount + 1;

        setRooms((prev) =>
          prev.map((r) =>
            r.id === joinTarget.id ? { ...r, participantCount } : r,
          ),
        );
      } catch (err) {
        console.error("Join failed:", err);
        alert("Failed to join room: " + (err.message || err));
      } finally {
        setShowJoin(false);
        setJoinTarget(null);
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
          onClick={openCreate}
          className=" cursor-pointer flex items-center gap-2 text-xs text-red-800 font-semibold bg-red-50 border border-red-100 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
        >
          <PlusSquare size={14} /> Create Room
        </button>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
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
                  {room.participantCount}/{room.capacity}
                </div>
                <button
                  onClick={() => openJoin(room)}
                  className="text-xs bg-red-800 text-white px-3 py-1 rounded-lg font-semibold hover:opacity-95"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg max-w-md w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Create Public Room
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">Room name</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Study Group - Math 101"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">
                  Description (optional)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Add short notes about the room"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={form.isPublic}
                    onChange={() => setForm((f) => ({ ...f, isPublic: true }))}
                    className="accent-red-800"
                  />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!form.isPublic}
                    onChange={() => setForm((f) => ({ ...f, isPublic: false }))}
                    className="accent-red-800"
                  />
                  <span className="text-sm">Private</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-sm text-gray-500 px-3 py-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-sm bg-red-800 text-white px-3 py-1 rounded-lg cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
