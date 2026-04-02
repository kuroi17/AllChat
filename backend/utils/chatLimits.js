function parsePositiveInt(name, fallbackValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallbackValue;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return parsed;
}

function parseBoolean(name, fallbackValue) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallbackValue;

  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallbackValue;
}

const isProduction = process.env.NODE_ENV === "production";

const supabaseHost = (() => {
  try {
    const url = new URL(process.env.SUPABASE_URL || "");
    return url.host || "";
  } catch {
    return "";
  }
})();

const configuredAllowedHosts = String(process.env.ALLOWED_MEDIA_HOSTS || "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const allowedMediaHosts = new Set(configuredAllowedHosts);
if (supabaseHost) {
  allowedMediaHosts.add(supabaseHost.toLowerCase());
}

const chatLimits = {
  globalMessageRateWindowMs: parsePositiveInt(
    "GLOBAL_MESSAGE_RATE_WINDOW_MS",
    10000,
  ),
  globalMessageRateMax: parsePositiveInt("GLOBAL_MESSAGE_RATE_MAX", 5),
  globalMessageMinIntervalMs: parsePositiveInt(
    "GLOBAL_MESSAGE_MIN_INTERVAL_MS",
    2000,
  ),
  globalMessageMaxChars: parsePositiveInt("GLOBAL_MESSAGE_MAX_CHARS", 1000),
  globalMessageFetchLimit: parsePositiveInt("GLOBAL_MESSAGE_FETCH_LIMIT", 50),

  directMessageRateWindowMs: parsePositiveInt(
    "DIRECT_MESSAGE_RATE_WINDOW_MS",
    10000,
  ),
  directMessageRateMax: parsePositiveInt("DIRECT_MESSAGE_RATE_MAX", 6),
  directMessageMinIntervalMs: parsePositiveInt(
    "DIRECT_MESSAGE_MIN_INTERVAL_MS",
    800,
  ),
  directMessageMaxChars: parsePositiveInt("DIRECT_MESSAGE_MAX_CHARS", 1500),
  directMessageFetchLimit: parsePositiveInt("DIRECT_MESSAGE_FETCH_LIMIT", 75),

  // Force media uploads off by default to protect free-tier usage.
  // Set ENABLE_MEDIA_UPLOADS=true in the environment to re-enable.
  mediaUploadsEnabled: parseBoolean("ENABLE_MEDIA_UPLOADS", false),
  maxMediaMessagesPerDay: parsePositiveInt("MAX_MEDIA_MESSAGES_PER_DAY", 5),
  allowedMediaHosts,
};

function cleanImageUrl(rawValue) {
  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function validateMediaImageUrl(rawValue) {
  const cleanedValue = cleanImageUrl(rawValue);

  if (!cleanedValue) {
    return { ok: true, value: "" };
  }

  if (!chatLimits.mediaUploadsEnabled) {
    return {
      ok: false,
      status: 403,
      error: "Image uploads are currently disabled.",
    };
  }

  let parsed;
  try {
    parsed = new URL(cleanedValue);
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Invalid image URL.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      status: 400,
      error: "Image URL must use HTTPS.",
    };
  }

  const normalizedHost = parsed.host.toLowerCase();
  if (!chatLimits.allowedMediaHosts.has(normalizedHost)) {
    return {
      ok: false,
      status: 400,
      error: "Image host is not allowed.",
    };
  }

  return {
    ok: true,
    value: parsed.toString(),
  };
}

async function enforceDailyMediaQuota({ db, table, userColumn, userId }) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(userColumn, userId)
    .gte("created_at", startOfDay.toISOString())
    .not("image_url", "is", null)
    .neq("image_url", "");

  if (error) throw error;

  if ((count || 0) >= chatLimits.maxMediaMessagesPerDay) {
    return {
      ok: false,
      status: 429,
      error: `Daily image upload limit reached (${chatLimits.maxMediaMessagesPerDay}/day).`,
    };
  }

  return { ok: true };
}

module.exports = {
  chatLimits,
  validateMediaImageUrl,
  enforceDailyMediaQuota,
};
