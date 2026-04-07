const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

function normalizeRawMessage(input) {
  const message =
    typeof input === "string" ? input : input?.message || input?.error;
  return String(message || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function toSafeErrorMessage(
  errorLike,
  fallbackMessage = DEFAULT_FALLBACK,
) {
  const rawMessage = normalizeRawMessage(errorLike);
  const fallback = String(fallbackMessage || DEFAULT_FALLBACK);

  if (!rawMessage) {
    return fallback;
  }

  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("connection")
  ) {
    return "Network error. Please check your internet connection and try again.";
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "Request timed out. Please try again.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Too many requests right now. Please wait a moment and try again.";
  }

  if (
    normalized.includes("not authenticated") ||
    normalized.includes("invalid token") ||
    normalized.includes("jwt") ||
    normalized.includes("session")
  ) {
    return "Your session expired. Please sign in again.";
  }

  if (
    normalized.includes("not authorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("permission denied")
  ) {
    return "You are not allowed to perform this action.";
  }

  if (
    /\b(42p\d+|pgrst\d+)\b/i.test(rawMessage) ||
    /(postgres|database|row-level security|rls|constraint|schema|table|column|sql state|stack trace|internal server)/i.test(
      rawMessage,
    )
  ) {
    return fallback;
  }

  if (rawMessage.length > 180) {
    return fallback;
  }

  return rawMessage;
}

export function sanitizeApiErrorMessage(
  rawMessage,
  fallbackMessage = DEFAULT_FALLBACK,
) {
  return toSafeErrorMessage(rawMessage, fallbackMessage);
}
