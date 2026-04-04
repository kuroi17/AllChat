function parseCsvSet(rawValue) {
  if (!rawValue) return new Set();

  return new Set(
    String(rawValue)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function hasAdminRoleMetadata(user) {
  if (!user) return false;

  const roleCandidates = [];

  if (typeof user.role === "string") {
    roleCandidates.push(user.role);
  }

  if (typeof user.app_metadata?.role === "string") {
    roleCandidates.push(user.app_metadata.role);
  }

  const appRoles = user.app_metadata?.roles;
  if (Array.isArray(appRoles)) {
    for (const roleItem of appRoles) {
      if (typeof roleItem === "string") {
        roleCandidates.push(roleItem);
      }
    }
  }

  const normalizedRoles = roleCandidates
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);

  return normalizedRoles.some((role) =>
    ["admin", "developer", "owner", "superadmin"].includes(role),
  );
}

function canUserAccessRandomAnalytics(user) {
  if (!user?.id) return false;

  const allowedIds = parseCsvSet(process.env.RANDOM_ANALYTICS_ADMIN_IDS);
  const allowedEmails = parseCsvSet(process.env.RANDOM_ANALYTICS_ADMIN_EMAILS);

  const userId = String(user.id || "")
    .trim()
    .toLowerCase();
  const userEmail = String(user.email || "")
    .trim()
    .toLowerCase();

  // If explicit allowlists are configured, enforce them strictly.
  if (allowedIds.size > 0 || allowedEmails.size > 0) {
    return (
      allowedIds.has(userId) || (userEmail && allowedEmails.has(userEmail))
    );
  }

  // Fallback for projects that already set admin metadata claims.
  return hasAdminRoleMetadata(user);
}

function requireRandomAnalyticsAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!canUserAccessRandomAnalytics(req.user)) {
    return res.status(403).json({
      error: "Admin access required for random analytics.",
    });
  }

  next();
}

module.exports = {
  canUserAccessRandomAnalytics,
  requireRandomAnalyticsAdmin,
};
