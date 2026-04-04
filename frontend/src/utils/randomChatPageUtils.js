export function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

export function normalizeMessage(rawMessage) {
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

export const REPORT_REASON_OPTIONS = [
  "Harassment",
  "Hate speech",
  "Sexual content",
  "Spam",
  "Threats",
  "Other",
];

const RANDOM_PAGE_CACHE_KEY = "bsu_random_page_cache_v1";
const RANDOM_PAGE_CACHE_TTL_MS = 5 * 60 * 1000;

export function readRandomPageCache() {
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

export function writeRandomPageCache(payload) {
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

export function clearRandomPageCache() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(RANDOM_PAGE_CACHE_KEY);
}
