const rawApiUrl = import.meta.env.VITE_API_URL;
const trimmedApiUrl = typeof rawApiUrl === "string" ? rawApiUrl.trim() : "";
const defaultDevApiUrl = "https://allchatbackendservice.onrender.com";

function parsePositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return parsed;
}

function parseBoolean(value, fallbackValue) {
  if (typeof value !== "string") return fallbackValue;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallbackValue;
}

export const API_BASE_URL =
  trimmedApiUrl || (import.meta.env.DEV ? defaultDevApiUrl : "");

// Force media uploads off by default; set VITE_ENABLE_MEDIA_UPLOADS=true to allow uploads.
export const ENABLE_MEDIA_UPLOADS = parseBoolean(
  import.meta.env.VITE_ENABLE_MEDIA_UPLOADS,
  false,
);

const rawMediaProvider =
  typeof import.meta.env.VITE_MEDIA_STORAGE_PROVIDER === "string"
    ? import.meta.env.VITE_MEDIA_STORAGE_PROVIDER.trim().toLowerCase()
    : "";

export const MEDIA_STORAGE_PROVIDER = ["supabase", "cloudinary"].includes(
  rawMediaProvider,
)
  ? rawMediaProvider
  : "supabase";

export const CLOUDINARY_UPLOAD_FOLDER =
  typeof import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER === "string" &&
  import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER.trim()
    ? import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER.trim()
    : "bsuallchat";

export const MAX_MEDIA_UPLOAD_BYTES = parsePositiveInt(
  import.meta.env.VITE_MAX_MEDIA_UPLOAD_BYTES,
  1024 * 1024,
);

export const MAX_MEDIA_UPLOAD_MB = Math.max(
  1,
  Math.round((MAX_MEDIA_UPLOAD_BYTES / (1024 * 1024)) * 10) / 10,
);

export const MAX_GLOBAL_MESSAGE_CHARS = parsePositiveInt(
  import.meta.env.VITE_MAX_GLOBAL_MESSAGE_CHARS,
  1000,
);

export const MAX_DIRECT_MESSAGE_CHARS = parsePositiveInt(
  import.meta.env.VITE_MAX_DIRECT_MESSAGE_CHARS,
  1500,
);

export const PRESENCE_UPDATE_INTERVAL_MS = parsePositiveInt(
  import.meta.env.VITE_PRESENCE_UPDATE_INTERVAL_MS,
  3 * 60 * 1000,
);

export const PRESENCE_ACTIVITY_THROTTLE_MS = parsePositiveInt(
  import.meta.env.VITE_PRESENCE_ACTIVITY_THROTTLE_MS,
  60 * 1000,
);

export const ONLINE_USERS_REFETCH_INTERVAL_MS = parsePositiveInt(
  import.meta.env.VITE_ONLINE_USERS_REFETCH_INTERVAL_MS,
  60 * 1000,
);

if (!API_BASE_URL) {
  throw new Error(
    "Missing VITE_API_URL. Set it in your frontend environment before deploying.",
  );
}
