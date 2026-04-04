import { supabase } from "./supabase";
import { API_BASE_URL } from "./runtimeConfig";

const REQUEST_CACHE_TTL_MS = 20000;
const apiGetCache = new Map();
const pendingGetRequests = new Map();
const SHOULD_LOG_DEBUG = import.meta.env.DEV;

export function logDebugError(...args) {
  if (SHOULD_LOG_DEBUG) {
    console.error(...args);
  }
}

function buildRequestCacheKey({ method, path, authKey }) {
  return `${method}:${path}:${authKey || "public"}`;
}

function getCachedResponse(cacheKey) {
  const entry = apiGetCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > REQUEST_CACHE_TTL_MS) {
    apiGetCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return session.access_token;
}

export async function readErrorResponse(response, fallbackMessage) {
  try {
    const data = await response.json();
    return data?.error || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function requestApi(
  path,
  { method = "GET", body, auth = false } = {},
) {
  const headers = {};
  const normalizedMethod = method.toUpperCase();
  let authCacheKey = "";

  if (auth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
    authCacheKey = token.slice(-16);
  }

  const cacheKey = buildRequestCacheKey({
    method: normalizedMethod,
    path,
    authKey: authCacheKey,
  });

  if (normalizedMethod === "GET") {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) {
      return cached;
    }

    if (pendingGetRequests.has(cacheKey)) {
      return pendingGetRequests.get(cacheKey);
    }
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const executeRequest = async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: normalizedMethod,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const fallbackMessage = `Request failed (${normalizedMethod} ${path})`;
      const errorMessage = await readErrorResponse(response, fallbackMessage);
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;

    return response.json();
  };

  if (normalizedMethod !== "GET") {
    const result = await executeRequest();
    apiGetCache.clear();
    pendingGetRequests.clear();
    return result;
  }

  const pendingPromise = executeRequest()
    .then((result) => {
      apiGetCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    })
    .finally(() => {
      pendingGetRequests.delete(cacheKey);
    });

  pendingGetRequests.set(cacheKey, pendingPromise);
  return pendingPromise;
}
