const rawApiUrl = import.meta.env.VITE_API_URL;
const trimmedApiUrl = typeof rawApiUrl === "string" ? rawApiUrl.trim() : "";
const defaultDevApiUrl = "http://localhost:4000";

export const API_BASE_URL =
  trimmedApiUrl || (import.meta.env.DEV ? defaultDevApiUrl : "");

if (!API_BASE_URL) {
  throw new Error(
    "Missing VITE_API_URL. Set it in your frontend environment before deploying.",
  );
}
