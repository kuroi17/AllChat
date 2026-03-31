import { Lock, Users, X } from "lucide-react";

export default function RoomPreviewModal({
  room,
  passcode,
  onPasscodeChange,
  onClose,
  onJoin,
  joining,
  error,
}) {
  if (!room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Room Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-gray-900">{room.title}</h4>
            {!room.isPublic && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                <Lock size={12} /> Private
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {room.description || "No description provided"}
          </p>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={14} />
            {room.participantCount}/{room.capacity ?? "-"} participants
          </div>
        </div>

        {!room.isPublic && (
          <div className="mt-4">
            <label className="text-xs text-gray-500">Passcode</label>
            <input
              value={passcode}
              onChange={(event) => onPasscodeChange(event.target.value)}
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Enter room passcode"
              type="password"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 px-3 py-1"
            disabled={joining}
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            className="text-sm bg-red-800 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 disabled:opacity-60"
            disabled={joining}
          >
            {joining ? "Joining..." : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
