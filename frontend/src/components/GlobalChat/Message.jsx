import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle, MoreVertical } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { extractRoomLink } from "../../utils/roomLinks";
import RoomLinkPreviewCard from "../rooms/RoomLinkPreviewCard";

export default function Message({
  user,
  color,
  time,
  text,
  me,
  userId,
  avatarUrl,
  onReport,
}) {
  const { profile } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef(null);
  const actionsRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false);
      }
    };

    if (showMenu || showActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, showActions]);

  const handleAvatarClick = () => {
    if (!me) {
      setShowMenu(!showMenu);
    }
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    navigate(`/user/${userId}`);
  };

  const handleSendMessage = () => {
    setShowMenu(false);
    navigate(`/dm/new?userId=${userId}`);
  };

  const handleReport = () => {
    setShowActions(false);
    onReport?.({ userId, username: user });
  };

  const roomLink = extractRoomLink(text);

  if (me) {
    return (
      <div className="flex items-end justify-end gap-2 sm:gap-3">
        <div className="text-[11px] sm:text-xs text-gray-400 mb-1 shrink-0">
          {time} · Me
        </div>
        <div className="max-w-xs sm:max-w-md">
          <div className="bg-red-800 rounded-2xl rounded-br-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-white">
            {text}
          </div>
          {roomLink && (
            <RoomLinkPreviewCard
              roomId={roomLink.type === "room" ? roomLink.value : null}
              inviteToken={roomLink.type === "invite" ? roomLink.value : null}
              className="bg-white"
            />
          )}
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-800 flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 overflow-hidden">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Your avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            profile?.username?.[0]?.toUpperCase() || "U"
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 sm:gap-3 group">
      <div className="relative" ref={menuRef}>
        <div
          className={`cursor-pointer w-8 h-8 sm:w-9 sm:h-9 rounded-full ${color} flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 hover:ring-2 hover:ring-red-300 transition-all overflow-hidden`}
          onClick={handleAvatarClick}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user}
              className="w-full h-full object-cover"
            />
          ) : (
            user[0]
          )}
        </div>

        {/* User Menu Dropdown */}
        {showMenu && (
          <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={handleViewProfile}
              className="cursor-pointer w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <User size={16} />
              <span className="font-medium cursor-pointer ">Profile</span>
            </button>
            <button
              onClick={handleSendMessage}
              className="cursor-pointer w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <MessageCircle size={16} />
              <span className="font-medium cursor-pointer">Message</span>
            </button>
          </div>
        )}
      </div>

      <div className="max-w-xs sm:max-w-md relative">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-xs sm:text-sm text-gray-800">
            {user}
          </span>
          <span className="text-[11px] sm:text-xs text-gray-400">{time}</span>
        </div>
        <div className="bg-white rounded-2xl rounded-tl-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-gray-700 max-w-xs sm:max-w-md">
          {text}
        </div>
        {!me && (
          <div ref={actionsRef} className="absolute top-0 right-0">
            <button
              type="button"
              onClick={() => setShowActions((prev) => !prev)}
              className={`h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                showActions
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              aria-label="Message actions"
              title="Message actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 mt-2 w-40 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                <button
                  type="button"
                  onClick={handleReport}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Report message
                </button>
              </div>
            )}
          </div>
        )}
        {roomLink && (
          <RoomLinkPreviewCard
            roomId={roomLink.type === "room" ? roomLink.value : null}
            inviteToken={roomLink.type === "invite" ? roomLink.value : null}
          />
        )}
      </div>
    </div>
  );
}
