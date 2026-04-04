import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  CornerUpLeft,
  ImagePlus,
  Loader2,
  Send,
  SmilePlus,
  Timer,
} from "lucide-react";
import EmojiPickerButton from "../common/EmojiPickerButton";
import MessageLinkPreview from "../common/MessageLinkPreview";

const RANDOM_REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function buildReactionGroups(reactions, currentUserId) {
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
}

export default function RandomSessionPanel({
  isBootstrapping,
  messages,
  currentUserId,
  session,
  warningActive,
  sessionTimeRemainingSeconds,
  voteTimeRemainingSeconds,
  partnerTyping,
  status,
  messagesEndRef,
  formatClock,
  replyTarget,
  onClearReply,
  onSubmitMessage,
  fileInputRef,
  onImagePicked,
  canSendMessage,
  isUploading,
  draft,
  onDraftChange,
  onInsertEmoji,
  onSelectReply,
  onToggleReaction,
  activeReactionPickerId,
  setActiveReactionPickerId,
  detailsContent,
  defaultDetailsOpen = false,
  className = "",
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(defaultDetailsOpen);

  return (
    <div
      className={`lg:col-span-8 rounded-2xl border border-gray-200 bg-white flex flex-col min-h-0 shadow-sm ${className}`}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Session
          </p>
          <p className="text-sm font-semibold text-gray-800 truncate">
            {session?.partnerProfile?.username || "Waiting for match..."}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 size={16} className="text-red-700" />
          {session?.phase === "chat" ? (
            <span
              className={warningActive ? "text-amber-600" : "text-gray-700"}
            >
              {formatClock(sessionTimeRemainingSeconds)}
            </span>
          ) : session?.phase === "vote" ? (
            <span className="text-amber-700">
              Vote: {formatClock(voteTimeRemainingSeconds)}
            </span>
          ) : (
            <span className="text-gray-400">--:--</span>
          )}
        </div>
      </div>

      {detailsContent ? (
        <div className="px-3 sm:px-4 pt-3">
          <button
            type="button"
            onClick={() => setIsDetailsOpen((previous) => !previous)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-700 px-3 py-2 text-xs font-semibold flex items-center justify-between"
          >
            <span>Session details & analytics</span>
            {isDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {isDetailsOpen ? <div className="mt-2">{detailsContent}</div> : null}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gray-50">
        {isBootstrapping ? (
          <div className="animate-pulse space-y-3">
            <div className="h-14 w-2/3 rounded-2xl bg-gray-200" />
            <div className="h-14 w-1/2 rounded-2xl bg-gray-200 ml-auto" />
            <div className="h-14 w-3/5 rounded-2xl bg-gray-200" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full min-h-56 flex flex-col items-center justify-center text-center text-gray-400">
            <Timer size={26} className="mb-2" />
            <p className="text-sm">No messages yet.</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.userId === currentUserId;
            const reactionGroups = buildReactionGroups(
              message.reactions,
              currentUserId,
            );
            const reactionMap = reactionGroups.reduce((acc, group) => {
              acc[group.emoji] = group;
              return acc;
            }, {});

            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className="max-w-[90%] sm:max-w-[82%]">
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm ${
                      isMine
                        ? "bg-red-700 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <p
                      className={`text-[11px] font-semibold mb-1 ${
                        isMine ? "text-red-100" : "text-gray-500"
                      }`}
                    >
                      {message.profile?.username || "User"}
                    </p>

                    {message.replyMessage && (
                      <div
                        className={`mb-2 rounded-xl px-2.5 py-1.5 border ${
                          isMine
                            ? "bg-red-600/70 border-red-300/40"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-semibold uppercase tracking-wide ${
                            isMine ? "text-red-100" : "text-gray-500"
                          }`}
                        >
                          Replying to{" "}
                          {message.replyMessage?.profiles?.username || "User"}
                        </p>
                        <p
                          className={`text-xs truncate ${
                            isMine ? "text-red-100" : "text-gray-600"
                          }`}
                        >
                          {message.replyMessage?.content ||
                            (message.replyMessage?.image_url
                              ? "(image)"
                              : "(no text)")}
                        </p>
                      </div>
                    )}

                    {message.content ? (
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">
                        {message.content}
                      </p>
                    ) : null}

                    {message.imageUrl ? (
                      <img
                        src={message.imageUrl}
                        alt="Shared"
                        className="mt-2 rounded-xl max-h-64 w-auto object-cover border border-black/10"
                      />
                    ) : null}

                    <MessageLinkPreview
                      text={message.content}
                      excludeUrls={message.imageUrl ? [message.imageUrl] : []}
                      className={isMine ? "bg-red-50 border-red-100" : ""}
                    />
                  </div>

                  {canSendMessage && (
                    <div
                      className={`mt-1 flex items-center gap-1.5 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectReply(message)}
                        className="h-7 px-2 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300 text-[11px] inline-flex items-center gap-1"
                        title="Reply"
                      >
                        <CornerUpLeft size={12} /> Reply
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveReactionPickerId((previous) =>
                            previous === message.id ? null : message.id,
                          )
                        }
                        className="h-7 w-7 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:border-gray-300 inline-flex items-center justify-center"
                        title="React"
                      >
                        <SmilePlus size={14} />
                      </button>
                    </div>
                  )}

                  {activeReactionPickerId === message.id && (
                    <div
                      className={`mt-1 flex flex-wrap gap-1.5 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {RANDOM_REACTION_EMOJIS.map((emoji) => {
                        const current = reactionMap[emoji];
                        return (
                          <button
                            key={`${message.id}-${emoji}`}
                            type="button"
                            onClick={() => {
                              onToggleReaction({
                                messageId: message.id,
                                emoji,
                                reactedByMe: !!current?.reactedByMe,
                              });
                              setActiveReactionPickerId(null);
                            }}
                            className={`h-8 w-8 rounded-full border text-base flex items-center justify-center ${
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
                  )}

                  {reactionGroups.length > 0 && (
                    <div
                      className={`mt-1 flex gap-1.5 flex-wrap ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      {reactionGroups.map((group) => (
                        <button
                          key={`${message.id}-reaction-${group.emoji}`}
                          type="button"
                          onClick={() =>
                            onToggleReaction({
                              messageId: message.id,
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
            );
          })
        )}

        {partnerTyping && status === "matched" && session?.phase === "chat" && (
          <p className="text-xs text-gray-500">Partner is typing...</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={onSubmitMessage}
        className="p-3 border-t border-gray-100 min-w-0"
      >
        {replyTarget && (
          <div className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-900 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                Replying to {replyTarget?.profile?.username || "User"}
              </p>
              <p className="text-red-700 truncate">
                {replyTarget?.content ||
                  (replyTarget?.imageUrl ? "(image)" : "(no text)")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="text-red-700 hover:text-red-900 font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex items-end gap-1.5 sm:gap-2 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImagePicked}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canSendMessage || isUploading}
            className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Send image"
          >
            {isUploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ImagePlus size={15} />
            )}
          </button>

          <EmojiPickerButton
            onSelect={onInsertEmoji}
            disabled={!canSendMessage || isUploading}
            align="left"
          />

          <textarea
            value={draft}
            onChange={onDraftChange}
            placeholder={
              canSendMessage
                ? "Type your message..."
                : "You can send messages while chat is active"
            }
            rows={1}
            disabled={!canSendMessage || isUploading}
            className="flex-1 min-w-0 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-100 disabled:text-gray-400"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSubmitMessage(event);
              }
            }}
          />

          <button
            type="submit"
            disabled={!canSendMessage || !draft.trim() || isUploading}
            className="h-9 sm:h-10 shrink-0 rounded-xl bg-red-700 text-white px-3 sm:px-4 text-sm font-semibold hover:bg-red-800 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            <Send size={14} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
