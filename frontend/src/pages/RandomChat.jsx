import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  ImagePlus,
  Loader2,
  MessageCircleHeart,
  Shuffle,
  Timer,
  X,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import {
  getRandomChatSocket,
  getRandomSessionState,
  joinRandomQueue,
  leaveRandomQueue,
  leaveRandomSession,
  sendRandomSessionMessage,
  sendRandomSessionTyping,
  subscribeRandomChatEvents,
  uploadRandomChatImage,
  voteRandomSession,
} from "../utils/randomChat";
import {
  clearRandomSessionLock,
  setRandomSessionLock,
} from "../utils/randomSessionLock";
import {
  playNotificationSoundEffect,
  triggerNotificationHaptic,
} from "../utils/settings";

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function normalizeMessage(rawMessage) {
  if (!rawMessage) return null;

  return {
    id: rawMessage.id,
    userId: rawMessage.user_id,
    content: rawMessage.content || "",
    imageUrl: rawMessage.image_url || "",
    createdAt: rawMessage.created_at,
    profile: rawMessage.profiles || null,
  };
}

export default function RandomChat() {
  const { user, profile } = useUser();
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingResetTimerRef = useRef(null);
  const lastTypingEmitAtRef = useRef(0);
  const activeSessionIdRef = useRef(null);

  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState("idle");
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    "Click Start to enter the random queue.",
  );
  const [warningActive, setWarningActive] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [voteDecision, setVoteDecision] = useState("");
  const [voteMap, setVoteMap] = useState({});
  const [queueSize, setQueueSize] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const applySession = useCallback((sessionPayload) => {
    if (!sessionPayload?.sessionId) return;

    activeSessionIdRef.current = sessionPayload.sessionId;

    setSession({
      sessionId: sessionPayload.sessionId,
      roomName: sessionPayload.roomName,
      round: sessionPayload.round || 1,
      phase: sessionPayload.phase || "chat",
      roundStartedAt: Number(sessionPayload.roundStartedAt || Date.now()),
      durationSeconds: Number(sessionPayload.durationSeconds || 180),
      warningSeconds: Number(sessionPayload.warningSeconds || 160),
      voteWindowSeconds: Number(sessionPayload.voteWindowSeconds || 20),
      voteDeadlineAt: Number(sessionPayload.voteDeadlineAt || 0) || null,
      selfProfile: sessionPayload.selfProfile || null,
      partnerProfile: sessionPayload.partnerProfile || null,
    });

    setStatus("matched");
    setNotice("You are matched. Talk fast before time runs out.");
    setError("");
    setWarningActive(false);
    setPartnerTyping(false);
    setVoteDecision("");
    setVoteMap({});
    setMessages([]);

    setRandomSessionLock({
      locked: true,
      sessionId: sessionPayload.sessionId,
    });
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};
    let isDisposed = false;

    (async () => {
      try {
        const liveSocket = await getRandomChatSocket();
        if (isDisposed) return;

        setSocket(liveSocket);

        unsubscribe = subscribeRandomChatEvents(liveSocket, {
          onQueueJoined: (payload) => {
            setStatus("queueing");
            setQueueSize(payload?.queueSize ?? null);
            setNotice("Finding a random partner...");
          },
          onQueueLeft: () => {
            setStatus("idle");
            setQueueSize(null);
            setNotice("Queue canceled.");
          },
          onMatched: (payload) => {
            applySession(payload);
          },
          onWarning: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            setWarningActive(true);
            triggerNotificationHaptic();
            playNotificationSoundEffect();

            window.setTimeout(() => {
              setWarningActive(false);
            }, 2200);
          },
          onVoteOpen: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            setSession((previous) => {
              if (!previous || previous.sessionId !== payload.sessionId) {
                return previous;
              }

              return {
                ...previous,
                phase: "vote",
                voteDeadlineAt: payload.voteDeadlineAt || null,
              };
            });

            setVoteDecision("");
            setNotice(
              "Time is up. Continue only if both users choose Continue.",
            );
          },
          onVoteUpdate: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            const nextVoteMap = {};
            for (const voteItem of payload.votes || []) {
              if (!voteItem?.userId) continue;
              nextVoteMap[voteItem.userId] = voteItem.decision || null;
            }

            setVoteMap(nextVoteMap);
          },
          onRoundStarted: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            setSession((previous) => {
              if (!previous || previous.sessionId !== payload.sessionId) {
                return previous;
              }

              return {
                ...previous,
                round: payload.round || previous.round + 1,
                phase: "chat",
                roundStartedAt: Number(payload.roundStartedAt || Date.now()),
                durationSeconds:
                  Number(payload.durationSeconds || previous.durationSeconds) ||
                  previous.durationSeconds,
                warningSeconds:
                  Number(payload.warningSeconds || previous.warningSeconds) ||
                  previous.warningSeconds,
                voteDeadlineAt: null,
              };
            });

            setVoteDecision("");
            setVoteMap({});
            setWarningActive(false);
            setNotice("Round extended. Keep the conversation going.");
          },
          onSessionEnded: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            activeSessionIdRef.current = null;

            setStatus("ended");
            setSession(null);
            setPartnerTyping(false);
            setWarningActive(false);
            setVoteDecision("");
            setVoteMap({});
            setQueueSize(null);

            if (payload.reason === "partner_left") {
              setNotice("Your partner left. Start again when you are ready.");
            } else if (payload.reason === "ended_by_vote") {
              setNotice("Session ended by vote.");
            } else if (payload.reason === "vote_timeout") {
              setNotice("No full continue vote. Session ended.");
            } else {
              setNotice("Session ended.");
            }

            clearRandomSessionLock();
          },
          onMessage: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            const normalized = normalizeMessage(payload);
            if (!normalized) return;

            setMessages((previous) => {
              if (previous.some((message) => message.id === normalized.id)) {
                return previous;
              }
              return [...previous, normalized];
            });
          },
          onTyping: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            setPartnerTyping(true);

            if (typingResetTimerRef.current) {
              clearTimeout(typingResetTimerRef.current);
            }

            typingResetTimerRef.current = setTimeout(() => {
              setPartnerTyping(false);
            }, 1800);
          },
        });

        const existingState = await getRandomSessionState(liveSocket);
        if (isDisposed) return;

        if (existingState?.state === "matched" && existingState?.session) {
          applySession(existingState.session);
        } else if (existingState?.state === "queued") {
          setStatus("queueing");
          setQueueSize(existingState.queueSize ?? null);
          setNotice("Finding a random partner...");
          clearRandomSessionLock();
        } else {
          setStatus("idle");
          activeSessionIdRef.current = null;
          clearRandomSessionLock();
        }
      } catch (setupError) {
        setError(setupError.message || "Failed to initialize random chat");
      }
    })();

    return () => {
      isDisposed = true;
      unsubscribe();

      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current);
      }
    };
  }, [applySession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, partnerTyping, session?.phase]);

  const sessionTimeRemainingSeconds = useMemo(() => {
    if (!session || session.phase !== "chat") return 0;

    const roundEndAt =
      Number(session.roundStartedAt || Date.now()) +
      Number(session.durationSeconds || 180) * 1000;

    return Math.max(0, Math.ceil((roundEndAt - clockTick) / 1000));
  }, [clockTick, session]);

  const voteTimeRemainingSeconds = useMemo(() => {
    if (!session || session.phase !== "vote") return 0;
    if (!session.voteDeadlineAt) return 0;

    return Math.max(0, Math.ceil((session.voteDeadlineAt - clockTick) / 1000));
  }, [clockTick, session]);

  const currentUserId = user?.id;

  const myDecision = currentUserId
    ? voteMap[currentUserId] || voteDecision
    : "";
  const partnerDecision = useMemo(() => {
    if (!session?.partnerProfile?.id) return "";
    return voteMap[session.partnerProfile.id] || "";
  }, [session?.partnerProfile?.id, voteMap]);

  const canSendMessage = status === "matched" && session?.phase === "chat";

  const handleJoinQueue = async () => {
    if (!socket) return;

    setError("");
    setIsActionLoading(true);

    try {
      await joinRandomQueue(socket);
      setStatus("queueing");
      setNotice("Finding a random partner...");
    } catch (queueError) {
      setError(queueError.message || "Unable to join queue");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!socket) return;

    setError("");
    setIsActionLoading(true);

    try {
      await leaveRandomQueue(socket);
      setStatus("idle");
      setQueueSize(null);
      setNotice("Queue canceled.");
    } catch (queueError) {
      setError(queueError.message || "Unable to leave queue");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!socket || !session?.sessionId) return;

    setError("");
    setIsActionLoading(true);

    try {
      await leaveRandomSession(socket, {
        sessionId: session.sessionId,
        reason: "left_random_chat",
      });
      setStatus("idle");
      activeSessionIdRef.current = null;
      setSession(null);
      setNotice("You left the random session.");
      clearRandomSessionLock();
    } catch (leaveError) {
      setError(leaveError.message || "Unable to leave random session");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (!socket || !session?.sessionId || !canSendMessage) return;

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    setError("");

    try {
      await sendRandomSessionMessage(socket, {
        sessionId: session.sessionId,
        content: trimmedDraft,
      });
      setDraft("");
    } catch (messageError) {
      setError(messageError.message || "Unable to send message");
    }
  };

  const handleMessageInputChange = (event) => {
    const nextValue = event.target.value;
    setDraft(nextValue);

    if (!socket || !session?.sessionId || !canSendMessage) return;

    const now = Date.now();
    if (now - lastTypingEmitAtRef.current < 1200) return;

    lastTypingEmitAtRef.current = now;
    sendRandomSessionTyping(socket, { sessionId: session.sessionId });
  };

  const handleImagePicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !socket || !session?.sessionId || !canSendMessage) {
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const imageUrl = await uploadRandomChatImage({
        sessionId: session.sessionId,
        file,
      });

      await sendRandomSessionMessage(socket, {
        sessionId: session.sessionId,
        content: draft.trim(),
        imageUrl,
      });

      setDraft("");
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVote = async (decision) => {
    if (!socket || !session?.sessionId || session.phase !== "vote") return;

    setError("");

    try {
      await voteRandomSession(socket, {
        sessionId: session.sessionId,
        decision,
      });
      setVoteDecision(decision);
    } catch (voteError) {
      setError(voteError.message || "Unable to submit vote");
    }
  };

  const statusChipLabel =
    status === "queueing"
      ? "Queueing"
      : status === "matched"
        ? "In Session"
        : status === "ended"
          ? "Ended"
          : "Idle";

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={true} />
      </div>

      <main className="flex-1 min-w-0 p-3 md:p-5 overflow-hidden">
        <div className="max-w-5xl mx-auto h-full flex flex-col gap-3">
          <section className="rounded-2xl bg-gradient-to-r from-red-800 to-red-700 text-white p-4 md:p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-red-100 font-semibold">
                  New Mode
                </p>
                <h1 className="text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
                  <Shuffle size={20} /> Random
                </h1>
                <p className="text-sm text-red-100 mt-2 max-w-2xl">
                  1-on-1 random pairing with 3-minute rounds. Continue only when
                  both users vote Continue.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {statusChipLabel}
                </span>
                {status === "matched" && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                      warningActive
                        ? "bg-amber-300 text-amber-900 border-amber-200"
                        : "bg-white/15 text-white border-white/25"
                    }`}
                  >
                    Round {session?.round || 1}
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{notice}</p>
                {status === "queueing" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Queue size: {queueSize ?? "..."}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {status === "idle" || status === "ended" ? (
                  <button
                    type="button"
                    onClick={handleJoinQueue}
                    disabled={isActionLoading || !socket}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-700 text-white px-4 py-2 text-sm font-semibold hover:bg-red-800 disabled:opacity-60"
                  >
                    {isActionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <MessageCircleHeart size={16} />
                    )}
                    Start Random Chat
                  </button>
                ) : null}

                {status === "queueing" ? (
                  <button
                    type="button"
                    onClick={handleLeaveQueue}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isActionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    Cancel Queue
                  </button>
                ) : null}

                {status === "matched" ? (
                  <button
                    type="button"
                    onClick={handleLeaveSession}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white text-red-700 px-4 py-2 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
                  >
                    {isActionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <AlertCircle size={16} />
                    )}
                    Leave Session
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white flex flex-col min-h-0 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                    Session
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {session?.partnerProfile?.username ||
                      "Waiting for match..."}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 size={16} className="text-red-700" />
                  {session?.phase === "chat" ? (
                    <span
                      className={
                        warningActive ? "text-amber-600" : "text-gray-700"
                      }
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

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full min-h-56 flex flex-col items-center justify-center text-center text-gray-400">
                    <Timer size={26} className="mb-2" />
                    <p className="text-sm">No messages yet.</p>
                    <p className="text-xs">Say hi and keep it flowing.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.userId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-3 py-2 shadow-sm ${
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

                          {message.content ? (
                            <p className="text-sm whitespace-pre-wrap break-words">
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
                        </div>
                      </div>
                    );
                  })
                )}

                {partnerTyping &&
                  status === "matched" &&
                  session?.phase === "chat" && (
                    <p className="text-xs text-gray-500">
                      Partner is typing...
                    </p>
                  )}

                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-gray-100 flex items-end gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImagePicked}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canSendMessage || isUploading}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Send image"
                >
                  {isUploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ImagePlus size={16} />
                  )}
                </button>

                <textarea
                  value={draft}
                  onChange={handleMessageInputChange}
                  placeholder={
                    canSendMessage
                      ? "Type your message..."
                      : "You can send messages while chat is active"
                  }
                  rows={1}
                  disabled={!canSendMessage || isUploading}
                  className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 disabled:bg-gray-100 disabled:text-gray-400"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage(event);
                    }
                  }}
                />

                <button
                  type="submit"
                  disabled={!canSendMessage || !draft.trim() || isUploading}
                  className="h-10 rounded-xl bg-red-700 text-white px-4 text-sm font-semibold hover:bg-red-800 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Partner
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {session?.partnerProfile?.avatar_url ? (
                    <img
                      src={session.partnerProfile.avatar_url}
                      alt={session.partnerProfile.username || "Partner"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-700 font-semibold flex items-center justify-center">
                      {session?.partnerProfile?.username?.[0]?.toUpperCase() ||
                        "U"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {session?.partnerProfile?.username || "Pending match"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {profile?.username || "You"} vs random partner
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Flow
                </p>
                <p className="text-xs text-red-700 mt-2 leading-relaxed">
                  1. 3-minute talk round
                  <br />
                  2. At timer end, vote appears
                  <br />
                  3. Continue only if both choose Continue
                </p>
              </div>

              {session?.phase === "vote" && status === "matched" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">
                    Time is up. Choose now.
                  </p>
                  <p className="text-xs text-amber-800 mt-1">
                    One End vote is enough to end the session.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleVote("extend")}
                      disabled={myDecision === "extend"}
                      className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-55"
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote("end")}
                      disabled={myDecision === "end"}
                      className="rounded-lg bg-gray-800 text-white px-3 py-2 text-sm font-semibold hover:bg-black disabled:opacity-55"
                    >
                      End
                    </button>
                  </div>

                  <div className="mt-3 text-xs text-amber-900 space-y-1">
                    <p>
                      Your vote:{" "}
                      {myDecision ? myDecision.toUpperCase() : "Pending"}
                    </p>
                    <p>
                      Partner vote:{" "}
                      {partnerDecision
                        ? partnerDecision.toUpperCase()
                        : "Pending"}
                    </p>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                Side navigation is locked while session is active so users stay
                focused in the current random match.
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
