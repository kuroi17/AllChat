export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 24;
export const MAX_PROFILE_IMAGE_BYTES = 450 * 1024;

const NICKNAME_REGEX = /^[A-Za-z0-9._-]+$/;

export function normalizeNicknameInput(rawValue) {
  return String(rawValue || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, NICKNAME_MAX_LENGTH);
}

export function validateNickname(rawValue) {
  const nickname = normalizeNicknameInput(rawValue);

  if (!nickname) {
    return {
      isValid: false,
      nickname,
      errorMessage: "Nickname is required.",
    };
  }

  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return {
      isValid: false,
      nickname,
      errorMessage: `Nickname must be at least ${NICKNAME_MIN_LENGTH} characters.`,
    };
  }

  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return {
      isValid: false,
      nickname,
      errorMessage: `Nickname must be ${NICKNAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!NICKNAME_REGEX.test(nickname)) {
    return {
      isValid: false,
      nickname,
      errorMessage:
        "Nickname can only use letters, numbers, underscore (_), dot (.), and hyphen (-).",
    };
  }

  return {
    isValid: true,
    nickname,
    errorMessage: "",
  };
}

export function getNicknameInitial(nickname) {
  const safeNickname = normalizeNicknameInput(nickname);
  return (safeNickname[0] || "U").toUpperCase();
}

export async function imageFileToDataUrl(file) {
  if (!file) {
    return { ok: false, errorMessage: "No image selected.", dataUrl: "" };
  }

  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      errorMessage: "Please choose a valid image file.",
      dataUrl: "",
    };
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    return {
      ok: false,
      errorMessage:
        "Profile photo must be 450KB or smaller for faster login and sync.",
      dataUrl: "",
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({ ok: true, errorMessage: "", dataUrl: String(reader.result) });
    };

    reader.onerror = () => {
      resolve({
        ok: false,
        errorMessage:
          "Unable to read the selected image. Try a different file.",
        dataUrl: "",
      });
    };

    reader.readAsDataURL(file);
  });
}
