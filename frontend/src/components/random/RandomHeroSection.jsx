import {
  Loader2,
  MessageCircleHeart,
  Flag,
  Shuffle,
  Users,
  X,
} from "lucide-react";

export default function RandomHeroSection({
  statusChipLabel,
  warningActive,
  round,
  notice,
  queueSize,
  status,
  isActionLoading,
  isBootstrapping,
  socket,
  canReportSession,
  onJoinQueue,
  onLeaveQueue,
  onOpenReport,
}) {
  return (
    <>
      <section className="rounded-2xl bg-linear-to-r from-red-800 to-red-700 text-white p-3 sm:p-4 md:p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-red-100 font-semibold">
              New Mode
            </p>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold mt-1 flex items-center gap-2">
              <Shuffle size={20} /> Random
            </h1>
            <p className="text-xs sm:text-sm text-red-100 mt-2 max-w-2xl">
              1-on-1 pairing with timed rounds and instant rematch voting.
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
                Round {round || 1}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{notice}</p>
            <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
              <Users size={12} />
              Waiting now: {queueSize ?? "..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(status === "idle" || status === "ended") && (
              <button
                type="button"
                onClick={onJoinQueue}
                disabled={isActionLoading || isBootstrapping || !socket}
                className="inline-flex items-center gap-2 rounded-xl bg-red-700 text-white px-4 py-2 text-sm font-semibold hover:bg-red-800 disabled:opacity-60"
              >
                {isActionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <MessageCircleHeart size={16} />
                )}
                Start
              </button>
            )}

            {status === "queueing" && (
              <button
                type="button"
                onClick={onLeaveQueue}
                disabled={isActionLoading || isBootstrapping}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
              >
                {isActionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <X size={16} />
                )}
                Cancel Queue
              </button>
            )}

            {canReportSession && (
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-2 text-sm font-semibold hover:bg-amber-100"
              >
                <Flag size={16} />
                Report User
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
