import { Users, Lock, Globe } from "lucide-react";

export default function RoomCard({
  room,
  index,
  colors,
  onClick,
  isJoined,
  getRelativeTime,
}) {
  const updatedAt = room.last_updated || room.created_at;
  const initial = room.title?.trim()?.[0]?.toUpperCase() || "R";

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border-2 border-gray-100 hover:border-red-200"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-red-800 opacity-0 group-hover:opacity-30 transition-opacity" />
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt={room.title}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-gray-200 shadow-md"
            />
          ) : (
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${colors[index % colors.length]} flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md ring-2 ring-gray-200`}
            >
              {initial}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-gray-900 truncate text-base sm:text-lg">
              {room.title}
            </h3>
            {updatedAt && (
              <span className="text-xs font-semibold text-gray-400">
                {getRelativeTime(updatedAt)}
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-gray-500 truncate">
            {room.description || "No description provided"}
          </p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${room.isPublic ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-600 border-gray-100"}`}
            >
              {room.isPublic ? <Globe size={12} /> : <Lock size={12} />}
              {room.isPublic ? "Public" : "Private"}
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
              <Users size={12} />
              {room.participantCount}/{room.capacity ?? "-"}
            </span>

            {room.profiles?.username && (
              <span className="text-[11px] text-gray-500">
                Created by {room.profiles.username}
              </span>
            )}

            {isJoined && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                Joined
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
