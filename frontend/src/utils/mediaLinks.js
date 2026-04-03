const MEDIA_HOST_HINTS = [
  "res.cloudinary.com",
  "media.giphy.com",
  "i.giphy.com",
  "media.tenor.com",
  "c.tenor.com",
];

const MEDIA_EXTENSIONS = ["gif", "png", "jpg", "jpeg", "webp", "avif"];

function isLikelyMediaPath(pathname = "") {
  const normalized = pathname.toLowerCase();
  return MEDIA_EXTENSIONS.some((extension) =>
    normalized.endsWith(`.${extension}`),
  );
}

function isSupportedMediaHost(hostname = "") {
  const normalized = hostname.toLowerCase();
  return MEDIA_HOST_HINTS.some((host) => normalized.includes(host));
}

function extractUrls(text = "") {
  const matches = text.match(/https:\/\/[^\s]+/gi);
  return Array.isArray(matches) ? matches : [];
}

export function extractRenderableMediaUrl(text = "") {
  const urls = extractUrls(text);

  for (const rawUrl of urls) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:") continue;

      if (
        isLikelyMediaPath(parsed.pathname) ||
        isSupportedMediaHost(parsed.host)
      ) {
        return parsed.toString();
      }
    } catch {
      // ignore invalid URLs
    }
  }

  return "";
}

export function stripMediaUrlFromText(text = "", mediaUrl = "") {
  if (!mediaUrl || !text) return text;

  return text
    .replace(mediaUrl, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
