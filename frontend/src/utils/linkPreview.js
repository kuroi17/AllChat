import { supabase } from "./supabase";
import { API_BASE_URL } from "./runtimeConfig";

export function extractFirstHttpUrl(text = "", { exclude = [] } = {}) {
  if (typeof text !== "string" || !text.trim()) return "";

  const matches = text.match(/https?:\/\/[^\s]+/gi);
  if (!Array.isArray(matches) || matches.length === 0) return "";

  const excludedSet = new Set(
    (Array.isArray(exclude) ? exclude : [])
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean),
  );

  for (const rawCandidate of matches) {
    const candidate = rawCandidate.trim();
    if (!candidate || excludedSet.has(candidate)) continue;

    try {
      const parsed = new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
      return parsed.toString();
    } catch {
      // Ignore malformed URL tokens.
    }
  }

  return "";
}

export async function fetchLinkPreview(url) {
  const normalized = typeof url === "string" ? url.trim() : "";
  if (!normalized) {
    throw new Error("Missing URL for preview");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const endpoint = `${API_BASE_URL}/api/link-preview?url=${encodeURIComponent(normalized)}`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Failed to load link preview");
  }

  return {
    url: payload?.url || normalized,
    title: payload?.title || "Link preview",
    description: payload?.description || "",
    image: payload?.image || "",
    siteName: payload?.siteName || "",
  };
}
