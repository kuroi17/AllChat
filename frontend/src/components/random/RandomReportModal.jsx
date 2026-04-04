import { Flag, Loader2, ShieldAlert, X } from "lucide-react";

export default function RandomReportModal({
  open,
  canReportSession,
  onClose,
  isSubmittingReport,
  reportSessionTarget,
  reportReason,
  onChangeReason,
  reportDescription,
  onChangeDescription,
  onSubmit,
  reasonOptions,
}) {
  if (!open || !canReportSession) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-700" />
            Report Random Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmittingReport}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Report target:{" "}
          {reportSessionTarget?.partnerProfile?.username || "User"}
        </p>

        <form className="mt-3 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-xs font-semibold text-gray-700">
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(event) => onChangeReason(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              {reasonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700">
              Details (optional)
            </label>
            <textarea
              value={reportDescription}
              onChange={(event) => onChangeDescription(event.target.value)}
              maxLength={1000}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Share short context for moderation logs"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmittingReport}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingReport}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 text-white px-4 py-2 text-sm font-semibold hover:bg-red-800 disabled:opacity-60"
            >
              {isSubmittingReport ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Flag size={14} />
              )}
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
