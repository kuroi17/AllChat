import { useState, useRef, useEffect, useMemo } from "react";
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
  onReply,
  onReactToggle,
  reactions = [],
  currentUserId,
  replyMessage,
  messageId,
}) {
  const { profile } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef(null);
  const actionsRef = useRef(null);
  const navigate = useNavigate();
  const messageText = typeof text === "string" ? text : "";

  const reactionGroups = useMemo(() => {
    const grouped = new Map();
    (Array.isArray(reactions) ? reactions : []).forEach((item) => {
      if (!item?.emoji) return;
      const existing = grouped.get(item.emoji) || {
        emoji: item.emoji,
        count: 0,
        reactedByMe: false,
      };
      existing.count += 1;
      if (item.user_id === currentUserId) {
        existing.reactedByMe = true;
      }
      grouped.set(item.emoji, existing);
    });
    return Array.from(grouped.values());
  }, [reactions, currentUserId]);

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

  const handleReply = () => {
    onReply?.({
      id: messageId,
      userId,
      user,
      content: messageText,
      profiles: {
        username: user,
        avatar_url: avatarUrl || null,
      },
    });
    setShowActions(false);
    setShowMenu(false);
  };

  const handleToggleReaction = (emoji, reactedByMe) => {
    onReactToggle?.({
      messageId,
      emoji,
      reactedByMe,
    });
  };

  const roomLink = extractRoomLink(messageText);

  if (me) {
    return (
      <div className="flex items-end justify-end gap-2 sm:gap-3">
        <div className="text-[11px] sm:text-xs text-gray-400 mb-1 shrink-0">
          {time} · Me
        </div>
        <div className="max-w-xs sm:max-w-md">
          <div className="bg-red-800 rounded-2xl rounded-br-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-white space-y-2">
            {replyMessage && (
              <div className="rounded-xl bg-red-700/70 px-2.5 py-1.5 border border-red-300/40">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red-100">
                  Replying to {replyMessage?.profiles?.username || "User"}
                </p>
                <p className="text-xs text-red-100 truncate">
                  {replyMessage?.content || "(no text)"}
                </p>
              </div>
            )}
            <p>{messageText}</p>
          </div>
          <div className="mt-1 flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleReply}
              className="text-[11px] text-gray-500 hover:text-red-700 font-semibold"
            >
              Reply
            </button>

            {["👍", "❤️", "😂"].map((emoji) => {
              const current = reactionGroups.find(
                (item) => item.emoji === emoji,
              );
              return (
                <button
                  key={`${messageId}-${emoji}`}
                  type="button"
                  onClick={() =>
                    handleToggleReaction(emoji, !!current?.reactedByMe)
                  }
                  className={`text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
                    current?.reactedByMe
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {emoji}
                  {current?.count ? ` ${current.count}` : ""}
                </button>
              );
            })}
          </div>
          {reactionGroups.length > 0 && (
            <div className="mt-1 flex justify-end gap-1.5 flex-wrap">
              {reactionGroups.map((group) => (
                <button
                  key={`${messageId}-group-${group.emoji}`}
                  type="button"
                  onClick={() =>
                    handleToggleReaction(group.emoji, group.reactedByMe)
                  }
                  className={`text-[11px] rounded-full border px-2 py-0.5 ${
                    group.reactedByMe
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-white border-gray-200 text-gray-600"
                  }`}
                >
                  {group.emoji} {group.count}
                </button>
              ))}
            </div>
          )}
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
    <div className="flex items-start gap-2 sm:gap-3">
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

      <div className="max-w-xs sm:max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-xs sm:text-sm text-gray-800">
            {user}
          </span>
          <span className="text-[11px] sm:text-xs text-gray-400">{time}</span>
          {!me && (
            <div ref={actionsRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setShowActions((prev) => !prev)}
                className={`h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                  showActions ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
                aria-label="Message actions"
                title="Message actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showActions && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-50">
                  <button
                    type="button"
                    onClick={handleReport}
                    className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    Report message
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl rounded-tl-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-gray-700 max-w-xs sm:max-w-md space-y-2">
          {replyMessage && (
            <div className="rounded-xl bg-gray-50 px-2.5 py-1.5 border border-gray-200">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Replying to {replyMessage?.profiles?.username || "User"}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {replyMessage?.content || "(no text)"}
              </p>
            </div>
          )}
          <p>{messageText}</p>
        </div>

        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReply}
            className="text-[11px] text-gray-500 hover:text-red-700 font-semibold"
          >
            Reply
          </button>

          {["👍", "❤️", "😂"].map((emoji) => {
            const current = reactionGroups.find((item) => item.emoji === emoji);
            return (
              <button
                key={`${messageId}-${emoji}`}
                type="button"
                onClick={() =>
                  handleToggleReaction(emoji, !!current?.reactedByMe)
                }
                className={`text-[11px] rounded-full border px-2 py-0.5 transition-colors ${
                  current?.reactedByMe
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {emoji}
                {current?.count ? ` ${current.count}` : ""}
              </button>
            );
          })}
        </div>

        {reactionGroups.length > 0 && (
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {reactionGroups.map((group) => (
              <button
                key={`${messageId}-group-${group.emoji}`}
                type="button"
                onClick={() =>
                  handleToggleReaction(group.emoji, group.reactedByMe)
                }
                className={`text-[11px] rounded-full border px-2 py-0.5 ${
                  group.reactedByMe
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                {group.emoji} {group.count}
              </button>
            ))}
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
