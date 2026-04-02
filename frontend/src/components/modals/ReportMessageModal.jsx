import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Explicit content",
  "Scam or fraud",
  "Other",
];

export default function ReportMessageModal({
  open,
  onClose,
  onSubmit,
  reporting,
  reportedUsername,
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDescription("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Report message
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Reporting
                {reportedUsername ? ` ${reportedUsername}` : " this message"}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={reporting}
            className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Close report modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Select a reason
              </option>
              {REPORT_REASONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-gray-700">
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="Add context so moderators can review faster..."
              maxLength={280}
            />
            <span className="mt-1 block text-right text-[11px] text-gray-400">
              {description.length}/280
            </span>
          </label>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-2 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={reporting}
            className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ reason, description })}
            disabled={!reason || reporting}
            className="text-sm bg-red-800 text-white px-4 py-1.5 rounded-lg disabled:opacity-60 hover:bg-red-700"
          >
            {reporting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
