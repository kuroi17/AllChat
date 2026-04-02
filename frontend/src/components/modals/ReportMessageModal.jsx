import { useEffect, useState } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Report message</h3>
        <p className="mt-1 text-sm text-gray-500">
          Reporting{reportedUsername ? ` ${reportedUsername}` : " this message"}
          .
        </p>

        <div className="mt-4 space-y-3">
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
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={reporting}
            className="text-sm text-gray-500 px-3 py-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit({ reason, description })}
            disabled={!reason || reporting}
            className="text-sm bg-red-800 text-white px-4 py-1.5 rounded-lg disabled:opacity-60"
          >
            {reporting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
