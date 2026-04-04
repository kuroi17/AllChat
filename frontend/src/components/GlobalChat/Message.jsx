import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle, MoreVertical, SmilePlus, X } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import {
  extractRenderableMediaUrl,
  stripMediaUrlFromText,
} from "../../utils/mediaLinks";
import { extractRoomLink } from "../../utils/roomLinks";
import RoomLinkPreviewCard from "../rooms/RoomLinkPreviewCard";
import MessageLinkPreview from "../common/MessageLinkPreview";

const GLOBAL_REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function Message({
  user,
  color,
  time,
  text,
  me,
  userId,
  avatarUrl,
  onReport,
  onReactToggle,
  reactions = [],
  currentUserId,
  messageId,
}) {
  const { profile } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const menuRef = useRef(null);
  const actionsRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);
  const navigate = useNavigate();
  const messageText = typeof text === "string" ? text : "";
  const messageMediaUrl = useMemo(
    () => extractRenderableMediaUrl(messageText),
    [messageText],
  );
  const messageDisplayText = useMemo(
    () => stripMediaUrlFromText(messageText, messageMediaUrl),
    [messageText, messageMediaUrl],
  );

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
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target)
      ) {
        setShowReactionPicker(false);
      }
    };

    if (showMenu || showActions || showReactionPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu, showActions, showReactionPicker]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const updateViewportMode = (event) => {
      setIsMobileViewport(event.matches);
    };

    updateViewportMode(mediaQuery);

    mediaQuery.addEventListener("change", updateViewportMode);
    return () => {
      mediaQuery.removeEventListener("change", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  function clearLongPress() {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    touchStartRef.current = null;
  }

  function handleLongPressStart(event) {
    if (!isMobileViewport) return;

    clearLongPress();

    const touchPoint = event?.touches?.[0];
    if (touchPoint) {
      touchStartRef.current = {
        x: touchPoint.clientX,
        y: touchPoint.clientY,
      };
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setShowMobileActionSheet(true);
    }, 550);
  }

  function handleLongPressMove(event) {
    if (!isMobileViewport || !touchStartRef.current) return;

    const touchPoint = event?.touches?.[0];
    if (!touchPoint) return;

    const dx = Math.abs(touchPoint.clientX - touchStartRef.current.x);
    const dy = Math.abs(touchPoint.clientY - touchStartRef.current.y);

    if (dx > 12 || dy > 12) {
      clearLongPress();
    }
  }

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
    setShowMobileActionSheet(false);
    onReport?.({ userId, username: user });
  };

  const handleToggleReaction = (emoji, reactedByMe) => {
    setShowReactionPicker(false);
    setShowMobileActionSheet(false);
    onReactToggle?.({
      messageId,
      emoji,
      reactedByMe,
    });
  };

  const renderReactionPicker = (align = "right") => (
    <div
      className={`absolute top-10 z-20 rounded-full border border-gray-200 bg-white shadow-lg px-2 py-1.5 flex items-center gap-1.5 ${
        align === "left" ? "left-0" : "right-0"
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      {GLOBAL_REACTION_EMOJIS.map((emoji) => {
        const current = reactionGroups.find((item) => item.emoji === emoji);
        return (
          <button
            key={`${messageId}-picker-${emoji}`}
            type="button"
            onClick={() => handleToggleReaction(emoji, !!current?.reactedByMe)}
            className={`h-8 w-8 rounded-full border text-base transition-colors flex items-center justify-center ${
              current?.reactedByMe
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );

  const roomLink = extractRoomLink(messageDisplayText);

  if (me) {
    return (
      <div className="flex items-end justify-end gap-2 sm:gap-3">
        <div className="text-[11px] sm:text-xs text-gray-400 mb-1 shrink-0">
          {time} · Me
        </div>
        <div className="max-w-xs sm:max-w-md relative" ref={reactionPickerRef}>
          <div
            className="bg-red-800 rounded-2xl rounded-br-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-white space-y-2"
            onTouchStart={handleLongPressStart}
            onTouchMove={handleLongPressMove}
            onTouchEnd={clearLongPress}
            onTouchCancel={clearLongPress}
            onContextMenu={(event) => {
              if (isMobileViewport) {
                event.preventDefault();
              }
            }}
          >
            {messageMediaUrl && (
              <a
                href={messageMediaUrl}
                target="_blank"
                rel="noreferrer"
                className="block max-w-full"
              >
                <img
                  src={messageMediaUrl}
                  alt="Shared media"
                  className="w-full max-w-60 rounded-xl object-cover"
                />
              </a>
            )}
            {messageDisplayText && <p>{messageDisplayText}</p>}
          </div>

          {!isMobileViewport && (
            <div className="mt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowReactionPicker((prev) => !prev)}
                className="h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center"
                aria-label="Add reaction"
                title="Add reaction"
              >
                <SmilePlus className="w-4 h-4" />
              </button>
            </div>
          )}

          {showReactionPicker && !isMobileViewport && renderReactionPicker()}

          {reactionGroups.length > 0 && (
            <div className="mt-1 flex justify-end gap-1.5 flex-wrap">
              {reactionGroups.map((group) => (
                <button
                  key={`${messageId}-group-${group.emoji}`}
                  type="button"
                  onClick={() =>
                    isMobileViewport
                      ? setShowMobileActionSheet(true)
                      : handleToggleReaction(group.emoji, group.reactedByMe)
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

          <MessageLinkPreview
            text={messageDisplayText}
            excludeUrls={messageMediaUrl ? [messageMediaUrl] : []}
            disabled={!!roomLink}
            className="bg-white"
          />

          {isMobileViewport && showMobileActionSheet && (
            <div className="fixed inset-0 z-80 sm:hidden">
              <button
                type="button"
                onClick={() => setShowMobileActionSheet(false)}
                className="absolute inset-0 bg-black/40"
                aria-label="Close message actions"
              />

              <div className="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white border-t border-gray-200 p-4 shadow-2xl">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200 mb-3" />

                <div className="mb-3 rounded-full border border-gray-200 bg-gray-50 px-2 py-1.5 flex items-center justify-center gap-2 overflow-x-auto">
                  {GLOBAL_REACTION_EMOJIS.map((emoji) => {
                    const current = reactionGroups.find(
                      (group) => group.emoji === emoji,
                    );

                    return (
                      <button
                        key={`mobile-picker-${messageId}-${emoji}`}
                        type="button"
                        onClick={() =>
                          handleToggleReaction(emoji, !!current?.reactedByMe)
                        }
                        className={`h-10 w-10 shrink-0 rounded-full border text-lg transition-colors flex items-center justify-center ${
                          current?.reactedByMe
                            ? "bg-red-50 border-red-200"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileActionSheet(false)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
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
              {!isMobileViewport && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReactionPicker((prev) => !prev);
                      setShowActions(false);
                    }}
                    className={`h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                      showReactionPicker
                        ? "opacity-100"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    aria-label="Add reaction"
                    title="Add reaction"
                  >
                    <SmilePlus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowActions((prev) => !prev);
                      setShowReactionPicker(false);
                    }}
                    className={`h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                      showActions
                        ? "opacity-100"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    aria-label="Message actions"
                    title="Message actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              )}

              {showReactionPicker && !isMobileViewport && (
                <div ref={reactionPickerRef}>
                  {renderReactionPicker("right")}
                </div>
              )}

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
        <div
          className="bg-white rounded-2xl rounded-tl-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm text-xs sm:text-sm text-gray-700 max-w-xs sm:max-w-md space-y-2"
          onTouchStart={handleLongPressStart}
          onTouchMove={handleLongPressMove}
          onTouchEnd={clearLongPress}
          onTouchCancel={clearLongPress}
          onContextMenu={(event) => {
            if (isMobileViewport) {
              event.preventDefault();
            }
          }}
        >
          {messageMediaUrl && (
            <a
              href={messageMediaUrl}
              target="_blank"
              rel="noreferrer"
              className="block max-w-full"
            >
              <img
                src={messageMediaUrl}
                alt="Shared media"
                className="w-full max-w-60 rounded-xl object-cover"
              />
            </a>
          )}
          {messageDisplayText && <p>{messageDisplayText}</p>}
        </div>

        {reactionGroups.length > 0 && (
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {reactionGroups.map((group) => (
              <button
                key={`${messageId}-group-${group.emoji}`}
                type="button"
                onClick={() =>
                  isMobileViewport
                    ? setShowMobileActionSheet(true)
                    : handleToggleReaction(group.emoji, group.reactedByMe)
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

        <MessageLinkPreview
          text={messageDisplayText}
          excludeUrls={messageMediaUrl ? [messageMediaUrl] : []}
          disabled={!!roomLink}
        />

        {isMobileViewport && showMobileActionSheet && (
          <div className="fixed inset-0 z-80 sm:hidden">
            <button
              type="button"
              onClick={() => setShowMobileActionSheet(false)}
              className="absolute inset-0 bg-black/40"
              aria-label="Close message actions"
            />

            <div className="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-white border-t border-gray-200 p-4 shadow-2xl">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-200 mb-3" />

              <div className="mb-3 rounded-full border border-gray-200 bg-gray-50 px-2 py-1.5 flex items-center justify-center gap-2 overflow-x-auto">
                {GLOBAL_REACTION_EMOJIS.map((emoji) => {
                  const current = reactionGroups.find(
                    (group) => group.emoji === emoji,
                  );

                  return (
                    <button
                      key={`mobile-picker-${messageId}-${emoji}`}
                      type="button"
                      onClick={() =>
                        handleToggleReaction(emoji, !!current?.reactedByMe)
                      }
                      className={`h-10 w-10 shrink-0 rounded-full border text-lg transition-colors flex items-center justify-center ${
                        current?.reactedByMe
                          ? "bg-red-50 border-red-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>

              {!me && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={handleReport}
                    className="w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50"
                  >
                    Report message
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowMobileActionSheet(false)}
                className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
