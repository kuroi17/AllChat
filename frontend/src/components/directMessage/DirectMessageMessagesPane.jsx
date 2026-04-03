import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { extractRoomLink } from "../../utils/roomLinks";
import RoomLinkPreviewCard from "../rooms/RoomLinkPreviewCard";

const DELETED_MESSAGE_MARKER = "__BSUALLCHAT_DM_DELETED__";

export default function DirectMessageMessagesPane({
  containerRef,
  loadingMessages,
  visibleMessages,
  currentUserId,
  otherUser,
  activeMessageMenuId,
  deletingMessageId,
  onToggleMessageMenu,
  onUnsendForYou,
  onUnsendForEveryone,
  onReportMessage,
  onReply,
  onReactToggle,
  messagesEndRef,
}) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const longPressTimeoutRef = useRef(null);

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
    if (!longPressTimeoutRef.current) return;
    clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = null;
  }

  function handleLongPressStart({ messageId, isDeleted, isMenuOpen }) {
    if (!isMobileViewport || isDeleted) return;

    clearLongPress();
    longPressTimeoutRef.current = setTimeout(() => {
      if (!isMenuOpen) {
        onToggleMessageMenu(messageId);
      }
    }, 550);
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {loadingMessages ? (
          <div className="space-y-4 py-6 animate-pulse">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`dm-skeleton-${index}`}
                className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="max-w-[70%] bg-white rounded-2xl px-4 py-3 shadow-sm space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-40 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const isMenuOpen = activeMessageMenuId === msg.id;
            const isDeleted =
              (typeof msg.content === "string" &&
                msg.content.startsWith(DELETED_MESSAGE_MARKER)) ||
              msg.deletedByUsername;
            const replyMessage = msg.reply_message || null;
            const deletedLabel =
              msg.deletedByUsername || (isMe ? "You" : otherUser.username);
            const roomLink =
              !isDeleted && msg.content ? extractRoomLink(msg.content) : null;
            const reactionGroups = Array.isArray(msg.reactions)
              ? msg.reactions.reduce((acc, item) => {
                  if (!item?.emoji) return acc;

                  if (!acc[item.emoji]) {
                    acc[item.emoji] = {
                      emoji: item.emoji,
                      count: 0,
                      reactedByMe: false,
                    };
                  }

                  acc[item.emoji].count += 1;
                  if (item.user_id === currentUserId) {
                    acc[item.emoji].reactedByMe = true;
                  }

                  return acc;
                }, {})
              : {};

            const reactionGroupList = Object.values(reactionGroups);
            // msg.profiles?.username || otherUser.username || "User")
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`group relative flex min-w-0 gap-2 sm:gap-3 max-w-[88%] sm:max-w-[70%] ${
                    isMe
                      ? "flex-row-reverse pl-7 sm:pl-8 -ml-7 sm:-ml-8"
                      : "flex-row pr-7 sm:pr-8 -mr-7 sm:-mr-8"
                  }`}
                >
                  {!isMe && (
                    <div className="shrink-0">
                      {otherUser.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt={otherUser.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white text-sm font-bold">
                          {(otherUser.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className="relative min-w-0"
                    onTouchStart={() =>
                      handleLongPressStart({
                        messageId: msg.id,
                        isDeleted,
                        isMenuOpen,
                      })
                    }
                    onTouchEnd={clearLongPress}
                    onTouchCancel={clearLongPress}
                    onTouchMove={clearLongPress}
                    onMouseDown={() =>
                      handleLongPressStart({
                        messageId: msg.id,
                        isDeleted,
                        isMenuOpen,
                      })
                    }
                    onMouseUp={clearLongPress}
                    onMouseLeave={clearLongPress}
                    onContextMenu={(event) => {
                      if (isMobileViewport) {
                        event.preventDefault();
                      }
                    }}
                  >
                    {!isDeleted && !isMobileViewport && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleMessageMenu(msg.id);
                        }}
                        className={`absolute top-0 z-10 h-7 w-7 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm transition-colors flex items-center justify-center ${
                          isMe ? "-left-7 sm:-left-8" : "-right-7 sm:-right-8"
                        } ${isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"}`}
                        aria-label="Message options"
                        title="Message options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}

                    {isMenuOpen && !isDeleted && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className={`absolute top-10 z-20 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden ${
                          isMe ? "right-0" : "left-0"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onUnsendForYou(msg.id)}
                          className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Unsend for you
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onReply?.(msg);
                            onToggleMessageMenu(msg.id);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Reply
                        </button>

                        {!isMe && (
                          <button
                            type="button"
                            onClick={() => onReportMessage?.(msg)}
                            className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Report message
                          </button>
                        )}

                        {isMe && (
                          <button
                            type="button"
                            onClick={() => onUnsendForEveryone(msg.id)}
                            disabled={deletingMessageId === msg.id}
                            className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {deletingMessageId === msg.id
                              ? "Unsending..."
                              : "Unsend for everyone"}
                          </button>
                        )}
                      </div>
                    )}

                    {isDeleted ? (
                      <div
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${
                          isMe
                            ? "bg-gray-200 text-gray-600 rounded-br-sm"
                            : "bg-gray-100 text-gray-600 rounded-bl-sm"
                        }`}
                      >
                        <p className="text-xs sm:text-sm italic">
                          {deletedLabel} deleted this message
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`w-fit max-w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl ${
                          isMe
                            ? "bg-red-800 text-white rounded-br-sm"
                            : "bg-white text-gray-900 rounded-bl-sm shadow-sm"
                        }`}
                      >
                        {replyMessage && (
                          <div
                            className={`mb-2 rounded-xl px-2.5 py-1.5 border ${
                              isMe
                                ? "bg-red-700/70 border-red-300/40"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <p
                              className={`text-[10px] font-semibold uppercase tracking-wide ${
                                isMe ? "text-red-100" : "text-gray-500"
                              }`}
                            >
                              Replying to{" "}
                              {replyMessage?.profiles?.username || "User"}
                            </p>
                            <p
                              className={`text-xs truncate ${
                                isMe ? "text-red-100" : "text-gray-600"
                              }`}
                            >
                              {replyMessage?.content || "(no text)"}
                            </p>
                          </div>
                        )}

                        {msg.image_url && (
                          <a
                            href={msg.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-full"
                          >
                            <img
                              src={msg.image_url}
                              alt="Shared media"
                              className="mb-2 w-full max-w-52.5 sm:max-w-70 max-h-90 rounded-xl object-cover"
                            />
                          </a>
                        )}

                        {msg.content && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">
                            {msg.content}
                          </p>
                        )}
                        {roomLink && (
                          <RoomLinkPreviewCard
                            roomId={
                              roomLink.type === "room" ? roomLink.value : null
                            }
                            inviteToken={
                              roomLink.type === "invite" ? roomLink.value : null
                            }
                          />
                        )}
                      </div>
                    )}

                    <p
                      className={`text-xs text-gray-500 mt-1 ${
                        isMe ? "text-right" : "text-left"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {!isDeleted && (
                      <div
                        className={`mt-1 flex items-center gap-2 flex-wrap ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onReply?.(msg)}
                          className="text-[11px] text-gray-500 hover:text-red-700 font-semibold"
                        >
                          Reply
                        </button>

                        {["👍", "❤️", "😂"].map((emoji) => {
                          const current = reactionGroups[emoji];
                          return (
                            <button
                              key={`${msg.id}-${emoji}`}
                              type="button"
                              onClick={() =>
                                onReactToggle?.({
                                  messageId: msg.id,
                                  emoji,
                                  reactedByMe: !!current?.reactedByMe,
                                })
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
                    )}

                    {!isDeleted && reactionGroupList.length > 0 && (
                      <div
                        className={`mt-1 flex gap-1.5 flex-wrap ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        {reactionGroupList.map((group) => (
                          <button
                            key={`${msg.id}-group-${group.emoji}`}
                            type="button"
                            onClick={() =>
                              onReactToggle?.({
                                messageId: msg.id,
                                emoji: group.emoji,
                                reactedByMe: group.reactedByMe,
                              })
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
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
