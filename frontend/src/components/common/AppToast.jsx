import { CheckCircle2, AlertCircle, X } from "lucide-react";

export default function AppToast({ toast, onClose, className = "" }) {
  if (!toast?.message) return null;

  const isError = toast.type === "error";

  return (
    <div
      className={`fixed bottom-5 right-4 xl:right-72 z-[80] pointer-events-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto min-w-[240px] max-w-sm rounded-xl border shadow-lg backdrop-blur px-4 py-3 flex items-start gap-3 animate-in slide-in-from-bottom-3 fade-in duration-200 ${
          isError
            ? "bg-red-50/95 border-red-200 text-red-800"
            : "bg-white/95 border-emerald-200 text-emerald-800"
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isError ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
        </div>

        <p className="text-sm font-medium leading-snug flex-1">
          {toast.message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-current/70 hover:text-current"
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
