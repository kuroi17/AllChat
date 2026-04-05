const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const EMAIL_COOLDOWN_SECONDS = 5 * 60;

function getCooldownStorageKey(action, email) {
  return `auth-email-cooldown:${action}:${email}`;
}

function getExpiryTimestamp(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function validateEmailFormat(rawEmail) {
  const normalizedEmail = String(rawEmail ?? "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    return {
      isValid: false,
      normalizedEmail,
      errorMessage: "Please enter your email address.",
    };
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return {
      isValid: false,
      normalizedEmail,
      errorMessage:
        "Please enter a valid email address (example: name@school.edu).",
    };
  }

  return {
    isValid: true,
    normalizedEmail,
    errorMessage: "",
  };
}

export function getRemainingCooldownSeconds(action, rawEmail) {
  const { normalizedEmail } = validateEmailFormat(rawEmail);

  if (!normalizedEmail) {
    return 0;
  }

  const key = getCooldownStorageKey(action, normalizedEmail);
  const expiry = getExpiryTimestamp(key);

  if (!expiry) {
    return 0;
  }

  const remainingMs = expiry - Date.now();
  if (remainingMs <= 0) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore localStorage errors.
    }
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

export function startEmailCooldown(
  action,
  rawEmail,
  seconds = EMAIL_COOLDOWN_SECONDS,
) {
  const { normalizedEmail } = validateEmailFormat(rawEmail);

  if (!normalizedEmail) {
    return;
  }

  const key = getCooldownStorageKey(action, normalizedEmail);
  const expiry = Date.now() + Math.max(0, seconds) * 1000;

  try {
    window.localStorage.setItem(key, String(expiry));
  } catch {
    // Ignore localStorage errors.
  }
}

export function formatCooldownLabel(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
