const express = require("express");
const dns = require("dns").promises;
const net = require("net");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const LINK_PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
const LINK_PREVIEW_TIMEOUT_MS = 6000;
const LINK_PREVIEW_MAX_BYTES = 250 * 1024;

const previewCache = new Map();

function decodeHtmlEntities(value = "") {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizePreviewText(value = "", max = 220) {
  const decoded = decodeHtmlEntities(stripHtml(String(value || "")));
  return decoded.slice(0, max).trim();
}

function isPrivateIp(address) {
  const ipVersion = net.isIP(address);
  if (!ipVersion) return false;

  if (ipVersion === 4) {
    const [a, b] = address.split(".").map((part) => Number(part));
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

async function validateUrlForPreview(rawUrl) {
  let parsed;

  try {
    parsed = new URL(String(rawUrl || ""));
  } catch {
    const error = new Error("Invalid URL");
    error.status = 400;
    throw error;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    const error = new Error("Only HTTP(S) URLs are supported");
    error.status = 400;
    throw error;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    const error = new Error("Invalid URL hostname");
    error.status = 400;
    throw error;
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    const error = new Error("Local URLs are not allowed");
    error.status = 400;
    throw error;
  }

  if (isPrivateIp(hostname)) {
    const error = new Error("Private network URLs are not allowed");
    error.status = 400;
    throw error;
  }

  try {
    const lookup = await dns.lookup(hostname);
    if (lookup?.address && isPrivateIp(lookup.address)) {
      const error = new Error("Private network URLs are not allowed");
      error.status = 400;
      throw error;
    }
  } catch (error) {
    if (error?.status) throw error;
    const wrapped = new Error("Unable to resolve URL host");
    wrapped.status = 400;
    throw wrapped;
  }

  return parsed;
}

function matchMetaContent(html, key) {
  if (!html || !key) return "";

  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] || "";
}

function toAbsoluteUrl(candidate, baseUrl) {
  if (!candidate) return "";

  try {
    const parsed = new URL(candidate, baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function buildFallbackPreview(parsedUrl) {
  const hostLabel = parsedUrl.hostname.replace(/^www\./i, "");

  return {
    url: parsedUrl.toString(),
    title: hostLabel,
    description: parsedUrl.pathname === "/" ? "" : parsedUrl.pathname,
    image: "",
    siteName: hostLabel,
  };
}

async function fetchLinkPreview(parsedUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LINK_PREVIEW_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "BSUAllChat-LinkPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return buildFallbackPreview(parsedUrl);
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();
    if (!contentType.includes("text/html")) {
      return buildFallbackPreview(
        new URL(response.url || parsedUrl.toString()),
      );
    }

    const htmlRaw = await response.text();
    const html = htmlRaw.slice(0, LINK_PREVIEW_MAX_BYTES);
    const finalUrl = new URL(response.url || parsedUrl.toString());

    const ogTitle = matchMetaContent(html, "og:title");
    const ogDescription = matchMetaContent(html, "og:description");
    const ogImage = matchMetaContent(html, "og:image");
    const ogSiteName = matchMetaContent(html, "og:site_name");
    const twitterImage = matchMetaContent(html, "twitter:image");
    const metaDescription = matchMetaContent(html, "description");
    const titleTag = extractTitle(html);

    const title =
      sanitizePreviewText(ogTitle, 180) ||
      sanitizePreviewText(titleTag, 180) ||
      finalUrl.hostname.replace(/^www\./i, "");

    const description =
      sanitizePreviewText(ogDescription, 320) ||
      sanitizePreviewText(metaDescription, 320);

    const image =
      toAbsoluteUrl(ogImage, finalUrl.toString()) ||
      toAbsoluteUrl(twitterImage, finalUrl.toString());

    const siteName =
      sanitizePreviewText(ogSiteName, 80) ||
      finalUrl.hostname.replace(/^www\./i, "");

    return {
      url: finalUrl.toString(),
      title,
      description,
      image,
      siteName,
    };
  } catch {
    return buildFallbackPreview(parsedUrl);
  } finally {
    clearTimeout(timer);
  }
}

router.get("/", verifyToken, async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ error: "url is required" });
    }

    const parsedUrl = await validateUrlForPreview(rawUrl);
    const cacheKey = parsedUrl.toString();
    const cached = previewCache.get(cacheKey);

    if (
      cached &&
      cached.data &&
      Date.now() - Number(cached.timestamp || 0) <= LINK_PREVIEW_CACHE_TTL_MS
    ) {
      return res.json({ ...cached.data, cached: true });
    }

    const preview = await fetchLinkPreview(parsedUrl);

    previewCache.set(cacheKey, {
      timestamp: Date.now(),
      data: preview,
    });

    res.json(preview);
  } catch (error) {
    res.status(error?.status || 500).json({
      error: error?.message || "Failed to fetch link preview",
    });
  }
});

module.exports = router;
