const crypto = require("crypto");
const express = require("express");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function getCloudinaryCredentials() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL || "";
  if (!cloudinaryUrl) return null;

  try {
    const parsed = new URL(cloudinaryUrl);
    const cloudName = (parsed.hostname || "").trim();
    const apiKey = decodeURIComponent(parsed.username || "").trim();
    const apiSecret = decodeURIComponent(parsed.password || "").trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

function buildCloudinarySignature(params, apiSecret) {
  const payload = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function sanitizeFolder(inputFolder) {
  const fallback = "bsuallchat/dm";
  const raw = typeof inputFolder === "string" ? inputFolder : fallback;
  const normalized = raw
    .trim()
    .replace(/\\+/g, "/")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/\/+$/g, "")
    .slice(0, 120);

  return normalized || fallback;
}

router.post("/cloudinary/signature", verifyToken, async (req, res) => {
  try {
    const credentials = getCloudinaryCredentials();
    if (!credentials) {
      return res.status(503).json({
        error: "Cloudinary is not configured on the server.",
      });
    }

    const requestedResourceType =
      typeof req.body?.resourceType === "string"
        ? req.body.resourceType.trim().toLowerCase()
        : "image";

    const resourceType = ["image", "video", "raw"].includes(
      requestedResourceType,
    )
      ? requestedResourceType
      : "image";

    const folder = sanitizeFolder(req.body?.folder);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = buildCloudinarySignature(
      {
        folder,
        timestamp,
      },
      credentials.apiSecret,
    );

    return res.json({
      cloudName: credentials.cloudName,
      apiKey: credentials.apiKey,
      timestamp,
      signature,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${credentials.cloudName}/${resourceType}/upload`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Signing failed" });
  }
});

module.exports = router;
