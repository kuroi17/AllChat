import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import RandomMobileHeader from "../components/random/RandomMobileHeader";
import RandomHeroSection from "../components/random/RandomHeroSection";
import RandomSessionPanel from "../components/random/RandomSessionPanel";
import RandomInsightsPanel from "../components/random/RandomInsightsPanel";
import RandomReportModal from "../components/random/RandomReportModal";
import {
  fetchRandomAccess,
  getRandomChatSocket,
  fetchRandomAnalytics,
  fetchRandomReports,
  getRandomSessionState,
  joinRandomQueue,
  leaveRandomQueue,
  sendRandomSessionMessage,
  sendRandomSessionTyping,
  submitRandomSessionReport,
  subscribeRandomChatEvents,
  toggleRandomMessageReaction,
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
    replyToMessageId: rawMessage.reply_to_message_id || null,
    replyMessage: rawMessage.reply_message || null,
    reactions: Array.isArray(rawMessage.reactions) ? rawMessage.reactions : [],
    createdAt: rawMessage.created_at,
    profile: rawMessage.profiles || null,
  };
}

const REPORT_REASON_OPTIONS = [
  "Harassment",
  "Hate speech",
  "Sexual content",
  "Spam",
  "Threats",
  "Other",
];

const RANDOM_PAGE_CACHE_KEY = "bsu_random_page_cache_v1";
const RANDOM_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;

function readRandomPageCache() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(RANDOM_PAGE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    if (Date.now() - Number(parsed.cachedAt || 0) > RANDOM_PAGE_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(RANDOM_PAGE_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeRandomPageCache(payload) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      RANDOM_PAGE_CACHE_KEY,
      JSON.stringify({ ...payload, cachedAt: Date.now() }),
    );
  } catch {
    // Ignore storage failures.
  }
}

function clearRandomPageCache() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RANDOM_PAGE_CACHE_KEY);
}

export default function RandomChat() {
  const { user, profile } = useUser();
  const initialCacheRef = useRef(readRandomPageCache());
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingResetTimerRef = useRef(null);
  const lastTypingEmitAtRef = useRef(0);
  const activeSessionIdRef = useRef(null);
  const reconnectSyncInFlightRef = useRef(false);

  const initialCache = initialCacheRef.current;
  const hasWarmCache = !!initialCache;

  const [socket, setSocket] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(!hasWarmCache);
  const [status, setStatus] = useState(initialCache?.status || "idle");
  const [session, setSession] = useState(initialCache?.session || null);
  const [messages, setMessages] = useState(
    Array.isArray(initialCache?.messages) ? initialCache.messages : [],
  );
  const [replyTarget, setReplyTarget] = useState(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState(null);
  const [draft, setDraft] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    initialCache?.notice || "Tap Start to enter the queue.",
  );
  const [warningActive, setWarningActive] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [voteDecision, setVoteDecision] = useState("");
  const [voteMap, setVoteMap] = useState({});
  const [queueSize, setQueueSize] = useState(initialCache?.queueSize ?? null);
  const [clockTick, setClockTick] = useState(Date.now());
  const [lastSessionSummary, setLastSessionSummary] = useState(
    initialCache?.lastSessionSummary || null,
  );

  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [canViewAdminAnalytics, setCanViewAdminAnalytics] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASON_OPTIONS[0]);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState("");
  const [reportFeedbackTone, setReportFeedbackTone] = useState("success");

  useEffect(() => {
    const interval = setInterval(() => {
      setClockTick(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (session?.sessionId) {
      activeSessionIdRef.current = session.sessionId;
    } else if (status !== "matched") {
      activeSessionIdRef.current = null;
    }
  }, [session?.sessionId, status]);

  useEffect(() => {
    if (!user?.id) return;

    const cached = readRandomPageCache();
    if (cached?.userId && cached.userId !== user.id) {
      clearRandomPageCache();
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    writeRandomPageCache({
      userId: user.id,
      status,
      session,
      messages: Array.isArray(messages) ? messages.slice(-120) : [],
      notice,
      queueSize,
      lastSessionSummary,
    });
  }, [
    user?.id,
    status,
    session,
    messages,
    notice,
    queueSize,
    lastSessionSummary,
  ]);

  const applySession = useCallback((sessionPayload) => {
    if (!sessionPayload?.sessionId) return;

    const isSameSession =
      activeSessionIdRef.current === sessionPayload.sessionId;
    const messageHistory = Array.isArray(sessionPayload.messages)
      ? sessionPayload.messages.map(normalizeMessage).filter(Boolean)
      : [];

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
    setNotice("Matched! Say hi and start chatting.");
    setError("");
    setWarningActive(false);
    setPartnerTyping(false);
    setVoteDecision("");
    setVoteMap({});
    setReplyTarget(null);
    setActiveReactionPickerId(null);
    setMessages((previous) => {
      if (isSameSession && previous.length > 0) {
        return previous;
      }

      return messageHistory;
    });

    setRandomSessionLock({
      locked: true,
      sessionId: sessionPayload.sessionId,
    });

    setLastSessionSummary({
      sessionId: sessionPayload.sessionId,
      partnerProfile: sessionPayload.partnerProfile || null,
      selfProfile: sessionPayload.selfProfile || null,
      round: sessionPayload.round || 1,
      endedReason: null,
      endedAt: null,
    });
  }, []);

  const loadAdminAnalytics = useCallback(async () => {
    setIsAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const access = await fetchRandomAccess();
      const canView = !!access?.canViewAnalytics;
      setCanViewAdminAnalytics(canView);

      if (!canView) {
        setAnalyticsData(null);
        setRecentReports([]);
        return;
      }

      const [analytics, reports] = await Promise.all([
        fetchRandomAnalytics(7),
        fetchRandomReports(8),
      ]);

      setAnalyticsData(analytics || null);
      setRecentReports(Array.isArray(reports) ? reports : []);
    } catch (requestError) {
      if (requestError?.status === 403) {
        setCanViewAdminAnalytics(false);
        setAnalyticsData(null);
        setRecentReports([]);
        setAnalyticsError("");
      } else {
        setCanViewAdminAnalytics(false);
        setAnalyticsError(
          requestError.message || "Unable to load random analytics.",
        );
      }
    } finally {
      setIsAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminAnalytics();
  }, [loadAdminAnalytics]);

  useEffect(() => {
    let unsubscribe = () => {};
    let isDisposed = false;

    (async () => {
      try {
        const liveSocket = await getRandomChatSocket();
        if (isDisposed) return;

        setSocket(liveSocket);

        unsubscribe = subscribeRandomChatEvents(liveSocket, {
          onQueueStats: (payload) => {
            setQueueSize(payload?.queueSize ?? null);
          },
          onQueueJoined: (payload) => {
            setStatus("queueing");
            setQueueSize(payload?.queueSize ?? null);
            setNotice("Finding a match!");
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
            if (Number(payload?.secondsRemaining || 0) <= 20) {
              playNotificationSoundEffect();
            }

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
            setNotice("Time is up. Vote now.");
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
            setNotice("Round extended.");
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
            setSession((previous) => {
              if (previous?.sessionId === payload.sessionId) {
                setLastSessionSummary({
                  sessionId: previous.sessionId,
                  partnerProfile: previous.partnerProfile || null,
                  selfProfile: previous.selfProfile || null,
                  round: previous.round || 1,
                  endedReason: payload.reason || "ended",
                  endedAt: payload.endedAt || Date.now(),
                });
              }
              return null;
            });
            setPartnerTyping(false);
            setWarningActive(false);
            setVoteDecision("");
            setVoteMap({});
            setReplyTarget(null);
            setActiveReactionPickerId(null);
            setQueueSize(null);

            if (payload.reason === "partner_left") {
              setNotice("Partner left. Start again when ready.");
            } else if (payload.reason === "ended_by_vote") {
              setNotice("Session ended by vote.");
            } else if (payload.reason === "vote_timeout") {
              setNotice("Vote timed out. Session ended.");
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
              const existingIndex = previous.findIndex(
                (message) => message.id === normalized.id,
              );

              if (existingIndex === -1) {
                return [...previous, normalized];
              }

              const next = [...previous];
              next[existingIndex] = {
                ...next[existingIndex],
                ...normalized,
              };
              return next;
            });
          },
          onReaction: (payload) => {
            if (
              !payload?.sessionId ||
              payload.sessionId !== activeSessionIdRef.current
            ) {
              return;
            }

            if (!payload?.messageId) return;

            setMessages((previous) =>
              previous.map((message) =>
                message.id === payload.messageId
                  ? {
                      ...message,
                      reactions: Array.isArray(payload.reactions)
                        ? payload.reactions
                        : [],
                    }
                  : message,
              ),
            );
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

        const syncSessionState = async ({
          finalizeBootstrapping = false,
        } = {}) => {
          if (reconnectSyncInFlightRef.current) return;

          reconnectSyncInFlightRef.current = true;

          try {
            const existingState = await getRandomSessionState(liveSocket);
            if (isDisposed) return;

            if (existingState?.state === "matched" && existingState?.session) {
              applySession(existingState.session);
            } else if (existingState?.state === "queued") {
              setStatus("queueing");
              setQueueSize(existingState.queueSize ?? null);
              setNotice("Finding a match!");
              clearRandomSessionLock();
            } else {
              setStatus("idle");
              activeSessionIdRef.current = null;
              setSession(null);
              setMessages([]);
              clearRandomSessionLock();
            }
          } catch {
            // Ignore transient reconnect sync failures.
          } finally {
            reconnectSyncInFlightRef.current = false;
            if (finalizeBootstrapping) {
              setIsBootstrapping(false);
            }
          }
        };

        const handleSocketReconnect = () => {
          syncSessionState({ finalizeBootstrapping: false });
        };

        liveSocket.on("connect", handleSocketReconnect);

        await syncSessionState({ finalizeBootstrapping: true });

        unsubscribe = (() => {
          const originalUnsubscribe = unsubscribe;
          return () => {
            originalUnsubscribe();
            liveSocket.off("connect", handleSocketReconnect);
          };
        })();
      } catch (setupError) {
        setError(setupError.message || "Failed to initialize random chat");
        setIsBootstrapping(false);
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
      setNotice("Finding a match!");
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

  const applyMessageReactions = useCallback((messageId, reactions) => {
    if (!messageId) return;

    setMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reactions: Array.isArray(reactions) ? reactions : [],
            }
          : message,
      ),
    );
  }, []);

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
        replyToMessageId: replyTarget?.id || null,
      });
      setDraft("");
      setReplyTarget(null);
    } catch (messageError) {
      setError(messageError.message || "Unable to send message");
    }
  };

  const handleInsertEmoji = (emoji) => {
    if (!emoji) return;
    setDraft((previous) => `${previous}${emoji}`);
  };

  const handleSelectReply = (message) => {
    if (!message?.id) return;
    setReplyTarget(message);
    setActiveReactionPickerId(null);
  };

  const handleClearReply = () => {
    setReplyTarget(null);
  };

  const handleToggleReaction = async ({ messageId, emoji, reactedByMe }) => {
    if (
      !socket ||
      !session?.sessionId ||
      !messageId ||
      !emoji ||
      !currentUserId
    )
      return;

    const targetMessage = messages.find((item) => item.id === messageId);
    const previousReactions = Array.isArray(targetMessage?.reactions)
      ? targetMessage.reactions
      : [];

    const nextReactions = reactedByMe
      ? previousReactions.filter(
          (item) => !(item?.user_id === currentUserId && item?.emoji === emoji),
        )
      : [
          ...previousReactions,
          {
            user_id: currentUserId,
            emoji,
            created_at: new Date().toISOString(),
          },
        ];

    applyMessageReactions(messageId, nextReactions);

    try {
      await toggleRandomMessageReaction(socket, {
        sessionId: session.sessionId,
        messageId,
        emoji,
      });
    } catch (reactionError) {
      applyMessageReactions(messageId, previousReactions);
      setError(reactionError.message || "Unable to update reaction");
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
        replyToMessageId: replyTarget?.id || null,
      });

      setDraft("");
      setReplyTarget(null);
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

  const reportSessionTarget = session || lastSessionSummary;
  const canReportSession =
    !!reportSessionTarget?.sessionId &&
    !!reportSessionTarget?.partnerProfile?.id &&
    reportSessionTarget.partnerProfile.id !== currentUserId;

  const openReportModal = () => {
    if (!canReportSession) return;

    setReportFeedback("");
    setReportFeedbackTone("success");
    setReportReason(REPORT_REASON_OPTIONS[0]);
    setReportDescription("");
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    if (isSubmittingReport) return;
    setShowReportModal(false);
  };

  const handleSubmitReport = async (event) => {
    event.preventDefault();

    if (!canReportSession || !reportSessionTarget?.sessionId) {
      setReportFeedback("No session available to report.");
      return;
    }

    setIsSubmittingReport(true);
    setReportFeedback("");

    try {
      await submitRandomSessionReport({
        sessionId: reportSessionTarget.sessionId,
        reportedUserId: reportSessionTarget.partnerProfile.id,
        reason: reportReason,
        description: reportDescription,
      });

      setReportFeedback("Report submitted. The moderation log has been saved.");
      setReportFeedbackTone("success");
      setShowReportModal(false);

      if (canViewAdminAnalytics) {
        loadAdminAnalytics();
      }
    } catch (reportError) {
      setReportFeedbackTone("error");
      setReportFeedback(reportError.message || "Unable to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const statusChipLabel = isBootstrapping
    ? "Loading"
    : status === "queueing"
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

      <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <RandomMobileHeader statusChipLabel={statusChipLabel} />

        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 md:p-6">
          <div className="max-w-6xl mx-auto h-full flex flex-col gap-3 sm:gap-4">
            <RandomHeroSection
              statusChipLabel={statusChipLabel}
              warningActive={warningActive}
              round={session?.round || 1}
              notice={notice}
              queueSize={queueSize}
              status={status}
              isActionLoading={isActionLoading}
              isBootstrapping={isBootstrapping}
              socket={socket}
              canReportSession={canReportSession}
              onJoinQueue={handleJoinQueue}
              onLeaveQueue={handleLeaveQueue}
              onOpenReport={openReportModal}
            />

            <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
              <RandomSessionPanel
                isBootstrapping={isBootstrapping}
                messages={messages}
                currentUserId={currentUserId}
                session={session}
                warningActive={warningActive}
                sessionTimeRemainingSeconds={sessionTimeRemainingSeconds}
                voteTimeRemainingSeconds={voteTimeRemainingSeconds}
                partnerTyping={partnerTyping}
                status={status}
                messagesEndRef={messagesEndRef}
                formatClock={formatClock}
                replyTarget={replyTarget}
                onClearReply={handleClearReply}
                onSubmitMessage={handleSendMessage}
                fileInputRef={fileInputRef}
                onImagePicked={handleImagePicked}
                canSendMessage={canSendMessage}
                isUploading={isUploading}
                draft={draft}
                onDraftChange={handleMessageInputChange}
                onInsertEmoji={handleInsertEmoji}
                onSelectReply={handleSelectReply}
                onToggleReaction={handleToggleReaction}
                activeReactionPickerId={activeReactionPickerId}
                setActiveReactionPickerId={setActiveReactionPickerId}
              />

              <RandomInsightsPanel
                isBootstrapping={isBootstrapping}
                session={session}
                canViewAdminAnalytics={canViewAdminAnalytics}
                isAnalyticsLoading={isAnalyticsLoading}
                onRefreshAnalytics={loadAdminAnalytics}
                analyticsData={analyticsData}
                recentReports={recentReports}
                status={status}
                onVote={handleVote}
                myDecision={myDecision}
                partnerDecision={partnerDecision}
                error={error}
                analyticsError={analyticsError}
                reportFeedback={reportFeedback}
                reportFeedbackTone={reportFeedbackTone}
              />
            </section>
          </div>
        </div>
      </main>

      <RandomReportModal
        open={showReportModal}
        canReportSession={canReportSession}
        onClose={closeReportModal}
        isSubmittingReport={isSubmittingReport}
        reportSessionTarget={reportSessionTarget}
        reportReason={reportReason}
        onChangeReason={setReportReason}
        reportDescription={reportDescription}
        onChangeDescription={setReportDescription}
        onSubmit={handleSubmitReport}
        reasonOptions={REPORT_REASON_OPTIONS}
      />
    </div>
  );
}
