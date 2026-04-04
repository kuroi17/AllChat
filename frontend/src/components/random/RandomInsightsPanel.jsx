import {
  BarChart3,
  Check,
  Flag,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";

export default function RandomInsightsPanel({
  isBootstrapping,
  session,
  canViewAdminAnalytics,
  isAnalyticsLoading,
  onRefreshAnalytics,
  analyticsData,
  recentReports,
  status,
  onVote,
  myDecision,
  partnerDecision,
  error,
  analyticsError,
  reportFeedback,
  reportFeedbackTone,
}) {
  return (
    <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col gap-3 sm:gap-4 min-h-0 overflow-y-auto">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Partner
        </p>
        {isBootstrapping ? (
          <div className="mt-2 animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
              <div className="h-2 w-2/3 bg-gray-200 rounded" />
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-3">
            {session?.partnerProfile?.avatar_url ? (
              <img
                src={session.partnerProfile.avatar_url}
                alt={session.partnerProfile.username || "Partner"}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 text-gray-700 font-semibold flex items-center justify-center">
                {session?.partnerProfile?.username?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {session?.partnerProfile?.username || "Pending match"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-red-100 bg-red-50 p-3">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">
          Match Flow
        </p>
        <p className="text-xs text-red-700 mt-2 leading-relaxed">
          1. 3-minute round
          <br />
          2. Vote at timeout
          <br />
          3. Both must vote Continue
        </p>
      </div>

      {canViewAdminAnalytics ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider inline-flex items-center gap-1">
              <BarChart3 size={13} /> Admin Analytics
            </p>
            <button
              type="button"
              onClick={onRefreshAnalytics}
              disabled={isAnalyticsLoading}
              className="text-blue-700 hover:text-blue-900 disabled:opacity-50"
              title="Refresh admin analytics"
            >
              <RefreshCw
                size={14}
                className={isAnalyticsLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {analyticsData ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-blue-900">
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="font-semibold">Matches Today</p>
                <p>{analyticsData.summary?.matchesToday ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="font-semibold">Avg Rounds</p>
                <p>{analyticsData.summary?.averageRounds ?? 0}</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="font-semibold">Extend Rate</p>
                <p>{analyticsData.summary?.extendRate ?? 0}%</p>
              </div>
              <div className="rounded-lg bg-white/70 px-2 py-1">
                <p className="font-semibold">Reports Today</p>
                <p>{analyticsData.summary?.reportsToday ?? 0}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-3">
            <p className="text-[11px] font-semibold text-blue-800 inline-flex items-center gap-1">
              <ShieldAlert size={13} /> Recent Random Reports
            </p>

            {recentReports.length === 0 ? (
              <p className="text-[11px] text-blue-700 mt-1">
                No reports in recent logs.
              </p>
            ) : (
              <div className="mt-1 space-y-1 max-h-24 overflow-y-auto pr-1">
                {recentReports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg bg-white/70 px-2 py-1 text-[11px] text-blue-900"
                  >
                    <p className="font-semibold truncate">
                      {report.reason || "Report"}
                    </p>
                    <p className="truncate">
                      Session {String(report.sessionId || "").slice(0, 8)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {session?.phase === "vote" && status === "matched" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            Time is up. Vote now.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onVote("extend")}
              disabled={myDecision === "extend"}
              className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-55 inline-flex items-center justify-center gap-1"
            >
              <Check size={14} />
              Continue
            </button>
            <button
              type="button"
              onClick={() => onVote("end")}
              disabled={myDecision === "end"}
              className="rounded-lg bg-gray-800 text-white px-3 py-2 text-sm font-semibold hover:bg-black disabled:opacity-55 inline-flex items-center justify-center gap-1"
            >
              <XCircle size={14} />
              End
            </button>
          </div>

          <div className="mt-3 text-xs text-amber-900 space-y-1">
            <p>You: {myDecision ? myDecision.toUpperCase() : "PENDING"}</p>
            <p>
              Partner:{" "}
              {partnerDecision ? partnerDecision.toUpperCase() : "PENDING"}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {canViewAdminAnalytics && analyticsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {analyticsError}
        </div>
      ) : null}

      {reportFeedback ? (
        <div
          className={`rounded-xl p-3 text-xs ${
            reportFeedbackTone === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {reportFeedback}
        </div>
      ) : null}
    </div>
  );
}
