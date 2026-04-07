import { AlertTriangle, Info, X } from "lucide-react";

export default function AppDialogModal({
  open,
  mode = "confirm",
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isConfirm = mode === "confirm";
  const iconClass = danger
    ? "bg-red-50 text-red-700"
    : "bg-blue-50 text-blue-700";

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center ${iconClass}`}
            >
              {danger ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">{message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-end gap-2">
          {isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white"
            >
              {cancelLabel || "Cancel"}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={`text-sm px-4 py-1.5 rounded-lg text-white ${danger ? "bg-red-700 hover:bg-red-800" : "bg-gray-900 hover:bg-black"}`}
          >
            {confirmLabel || (isConfirm ? "Confirm" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
