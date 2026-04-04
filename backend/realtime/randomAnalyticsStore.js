const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DAY_MS = 24 * 60 * 60 * 1000;

function asPositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return parsed;
}

function buildDayFormatter(timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
}

function createRandomAnalyticsStore(options = {}) {
  const maxReportLogs = asPositiveInt(options.maxReportLogs, 1000);
  const maxAuditSessions = asPositiveInt(options.maxAuditSessions, 2000);
  const maxPersistedReports = asPositiveInt(
    options.maxPersistedReports,
    maxReportLogs,
  );
  const maxReasonChars = asPositiveInt(options.maxReasonChars, 120);
  const maxDescriptionChars = asPositiveInt(options.maxDescriptionChars, 1000);
  const persistFlushMs = asPositiveInt(options.persistFlushMs, 600);
  const stateFilePath =
    typeof options.stateFilePath === "string" && options.stateFilePath.trim()
      ? options.stateFilePath
      : path.resolve(__dirname, "..", "data", "random-analytics-state.json");

  const formatter = buildDayFormatter(options.timeZone || "Asia/Manila");
  const analyticsByDay = new Map();
  const sessionAuditLog = new Map();
  const reportLogs = [];

  let persistTimer = null;

  function getDayKey(timestamp = Date.now()) {
    return formatter.format(new Date(timestamp));
  }

  function getDayStats(dayKey) {
    if (!analyticsByDay.has(dayKey)) {
      analyticsByDay.set(dayKey, {
        dayKey,
        matches: 0,
        completedSessions: 0,
        totalRounds: 0,
        extendedSessions: 0,
        totalExtensions: 0,
        reports: 0,
      });
    }

    return analyticsByDay.get(dayKey);
  }

  function getRecentDayKeys(days = 7) {
    const safeDays = Math.min(Math.max(Number(days) || 7, 1), 30);
    const keys = [];
    const seen = new Set();

    for (let index = safeDays - 1; index >= 0; index -= 1) {
      const dayKey = getDayKey(Date.now() - index * DAY_MS);
      if (!seen.has(dayKey)) {
        seen.add(dayKey);
        keys.push(dayKey);
      }
    }

    return keys;
  }

  function pruneAuditSessions() {
    if (sessionAuditLog.size <= maxAuditSessions) return;

    const sortedEntries = Array.from(sessionAuditLog.entries()).sort(
      (left, right) =>
        Number(left[1]?.endedAt || left[1]?.startedAt || 0) -
        Number(right[1]?.endedAt || right[1]?.startedAt || 0),
    );

    const removableCount = sortedEntries.length - maxAuditSessions;
    for (let index = 0; index < removableCount; index += 1) {
      const [sessionId] = sortedEntries[index];
      sessionAuditLog.delete(sessionId);
    }
  }

  function ensurePersistDir() {
    try {
      fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
    } catch {
      // Ignore persistence directory errors.
    }
  }

  function serializeAnalyticsByDay() {
    const payload = {};

    for (const [dayKey, stats] of analyticsByDay.entries()) {
      payload[dayKey] = {
        dayKey,
        matches: Number(stats?.matches || 0),
        completedSessions: Number(stats?.completedSessions || 0),
        totalRounds: Number(stats?.totalRounds || 0),
        extendedSessions: Number(stats?.extendedSessions || 0),
        totalExtensions: Number(stats?.totalExtensions || 0),
        reports: Number(stats?.reports || 0),
      };
    }

    return payload;
  }

  function persistState() {
    try {
      ensurePersistDir();
      const payload = {
        savedAt: new Date().toISOString(),
        analyticsByDay: serializeAnalyticsByDay(),
        reportLogs: reportLogs.slice(0, maxPersistedReports),
      };

      fs.writeFileSync(stateFilePath, JSON.stringify(payload, null, 2), "utf8");
    } catch {
      // Ignore persistence errors to protect realtime path.
    }
  }

  function queuePersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistState();
    }, persistFlushMs);
  }

  function hydratePersistedState() {
    try {
      if (!fs.existsSync(stateFilePath)) return;

      const raw = fs.readFileSync(stateFilePath, "utf8");
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const analyticsPayload = parsed?.analyticsByDay;

      if (analyticsPayload && typeof analyticsPayload === "object") {
        for (const [dayKey, stats] of Object.entries(analyticsPayload)) {
          analyticsByDay.set(dayKey, {
            dayKey,
            matches: Number(stats?.matches || 0),
            completedSessions: Number(stats?.completedSessions || 0),
            totalRounds: Number(stats?.totalRounds || 0),
            extendedSessions: Number(stats?.extendedSessions || 0),
            totalExtensions: Number(stats?.totalExtensions || 0),
            reports: Number(stats?.reports || 0),
          });
        }
      }

      const persistedReports = Array.isArray(parsed?.reportLogs)
        ? parsed.reportLogs
        : [];

      for (const report of persistedReports.slice(0, maxPersistedReports)) {
        reportLogs.push(report);
      }
    } catch {
      // Ignore hydrate failures and continue with in-memory state.
    }
  }

  function recordSessionMatched(session) {
    const dayKey = getDayKey();
    const dayStats = getDayStats(dayKey);
    dayStats.matches += 1;

    sessionAuditLog.set(session.id, {
      sessionId: session.id,
      roomName: session.roomName,
      startedAt: session.roundStartedAt,
      endedAt: null,
      endedReason: null,
      rounds: 1,
      wasExtended: false,
      participants: session.participants.map((participant) => ({
        userId: participant.userId,
        username: participant.profile?.username || "User",
      })),
      dayKey,
    });

    pruneAuditSessions();
    queuePersist();
  }

  function recordSessionExtended(sessionId) {
    const audit = sessionAuditLog.get(sessionId);
    if (!audit) return;

    audit.rounds += 1;
    audit.wasExtended = true;
    sessionAuditLog.set(sessionId, audit);
    queuePersist();
  }

  function recordSessionEnded(session, endedReason) {
    const audit = sessionAuditLog.get(session.id);
    if (!audit) return;

    audit.endedAt = Date.now();
    audit.endedReason = endedReason || "ended";
    audit.rounds = Math.max(Number(session.round) || 1, 1);
    audit.wasExtended = audit.rounds > 1 || audit.wasExtended;
    sessionAuditLog.set(session.id, audit);

    const dayStats = getDayStats(audit.dayKey || getDayKey());
    dayStats.completedSessions += 1;
    dayStats.totalRounds += audit.rounds;

    if (audit.wasExtended) {
      dayStats.extendedSessions += 1;
      dayStats.totalExtensions += Math.max(audit.rounds - 1, 1);
    }

    queuePersist();
  }

  function pushReportLog(reportEntry) {
    reportLogs.unshift(reportEntry);

    while (reportLogs.length > maxReportLogs) {
      reportLogs.pop();
    }

    queuePersist();
  }

  function submitReport({
    sessionId,
    reporterId,
    reporterEmail = "",
    reportedUserId,
    reason,
    description,
  }) {
    const audit = sessionAuditLog.get(sessionId);
    if (!audit) {
      return {
        ok: false,
        status: 404,
        error: "Random session log not found.",
      };
    }

    const participants = Array.isArray(audit.participants)
      ? audit.participants
      : [];
    const participantUserIds = participants.map((item) => item.userId);

    if (!participantUserIds.includes(reporterId)) {
      return {
        ok: false,
        status: 403,
        error: "You can only report users from your own random session.",
      };
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";

    if (!trimmedReason) {
      return {
        ok: false,
        status: 400,
        error: "Report reason is required.",
      };
    }

    if (trimmedReason.length > maxReasonChars) {
      return {
        ok: false,
        status: 400,
        error: `Report reason is too long (max ${maxReasonChars} characters).`,
      };
    }

    if (trimmedDescription.length > maxDescriptionChars) {
      return {
        ok: false,
        status: 400,
        error: `Report details are too long (max ${maxDescriptionChars} characters).`,
      };
    }

    const fallbackReportedUserId = participantUserIds.find(
      (userId) => userId !== reporterId,
    );
    const targetUserId = reportedUserId || fallbackReportedUserId || null;

    if (!targetUserId || targetUserId === reporterId) {
      return {
        ok: false,
        status: 400,
        error: "Invalid reported user.",
      };
    }

    const reportEntry = {
      id: crypto.randomUUID(),
      sessionId,
      reporterId,
      reporterEmail: reporterEmail || null,
      reportedUserId: targetUserId,
      reason: trimmedReason,
      description: trimmedDescription || null,
      createdAt: new Date().toISOString(),
      sessionStartedAt: audit.startedAt,
      sessionEndedAt: audit.endedAt,
      sessionRounds: audit.rounds,
      sessionEndedReason: audit.endedReason,
      participants,
    };

    pushReportLog(reportEntry);

    const dayStats = getDayStats(audit.dayKey || getDayKey());
    dayStats.reports += 1;
    queuePersist();

    return {
      ok: true,
      report: reportEntry,
    };
  }

  function getRecentReports({ limit = 30 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 200);
    return reportLogs.slice(0, safeLimit);
  }

  function getAnalyticsSnapshot({ days = 7, queueSize = 0, activeSessions = 0 } = {}) {
    const dayKeys = getRecentDayKeys(days);

    let totalMatches = 0;
    let totalCompletedSessions = 0;
    let totalRounds = 0;
    let totalExtendedSessions = 0;
    let totalReports = 0;

    const series = dayKeys.map((dayKey) => {
      const dayStats = analyticsByDay.get(dayKey) || {
        matches: 0,
        completedSessions: 0,
        totalRounds: 0,
        extendedSessions: 0,
        reports: 0,
      };

      totalMatches += dayStats.matches;
      totalCompletedSessions += dayStats.completedSessions;
      totalRounds += dayStats.totalRounds;
      totalExtendedSessions += dayStats.extendedSessions;
      totalReports += dayStats.reports;

      const dayAverageRounds =
        dayStats.completedSessions > 0
          ? Number((dayStats.totalRounds / dayStats.completedSessions).toFixed(2))
          : 0;

      const dayExtendRate =
        dayStats.completedSessions > 0
          ? Number(
              ((dayStats.extendedSessions / dayStats.completedSessions) * 100).toFixed(2),
            )
          : 0;

      return {
        day: dayKey,
        matches: dayStats.matches,
        completedSessions: dayStats.completedSessions,
        averageRounds: dayAverageRounds,
        extendRate: dayExtendRate,
        reports: dayStats.reports || 0,
      };
    });

    const averageRounds =
      totalCompletedSessions > 0
        ? Number((totalRounds / totalCompletedSessions).toFixed(2))
        : 0;

    const extendRate =
      totalCompletedSessions > 0
        ? Number(((totalExtendedSessions / totalCompletedSessions) * 100).toFixed(2))
        : 0;

    const todayStats = analyticsByDay.get(getDayKey()) || {
      matches: 0,
      completedSessions: 0,
      reports: 0,
    };

    return {
      generatedAt: Date.now(),
      queueSize,
      activeSessions,
      summary: {
        matchesToday: todayStats.matches || 0,
        completedToday: todayStats.completedSessions || 0,
        reportsToday: todayStats.reports || 0,
        matchesInRange: totalMatches,
        reportsInRange: totalReports,
        averageRounds,
        extendRate,
      },
      series,
    };
  }

  hydratePersistedState();

  return {
    recordSessionMatched,
    recordSessionExtended,
    recordSessionEnded,
    submitReport,
    getRecentReports,
    getAnalyticsSnapshot,
  };
}

module.exports = {
  createRandomAnalyticsStore,
};
