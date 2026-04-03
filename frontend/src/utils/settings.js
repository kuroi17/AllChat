export const SETTINGS_STORAGE_KEY = "bsu_chat_settings";

export const defaultSettings = {
  doNotDisturb: false,
  desktopNotifications: true,
  soundEffects: true,
  showOnlineStatus: true,
  compactConversationCards: false,
};

export function getChatSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...defaultSettings };

    const parsed = JSON.parse(raw);
    return { ...defaultSettings, ...(parsed || {}) };
  } catch (error) {
    console.error("Failed to read chat settings:", error);
    return { ...defaultSettings };
  }
}

export function setChatSettings(nextSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  window.dispatchEvent(
    new CustomEvent("chat-settings-changed", {
      detail: nextSettings,
    }),
  );
}

export function updateChatSettings(updates) {
  const nextSettings = {
    ...getChatSettings(),
    ...updates,
  };

  setChatSettings(nextSettings);
  return nextSettings;
}

export function subscribeChatSettings(callback) {
  const handleLocalChange = (event) => {
    callback(event.detail || getChatSettings());
  };

  const handleStorageChange = (event) => {
    if (event.key === SETTINGS_STORAGE_KEY) {
      callback(getChatSettings());
    }
  };

  callback(getChatSettings());

  window.addEventListener("chat-settings-changed", handleLocalChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener("chat-settings-changed", handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

let sharedAudioContext = null;
let hasBoundAudioUnlock = false;
let hasUserInteracted = false;

function getSharedAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioCtx();
  }

  return sharedAudioContext;
}

function bindAudioUnlockHandlers() {
  if (hasBoundAudioUnlock || typeof window === "undefined") return;

  hasBoundAudioUnlock = true;

  const unlock = async () => {
    hasUserInteracted = true;

    const context = getSharedAudioContext();
    if (!context) return;

    try {
      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state === "running") {
        ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
          window.removeEventListener(eventName, unlock);
        });
      }
    } catch {
      // Ignore unlock failures; we'll retry on next gesture.
    }
  };

  ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, unlock, { passive: true });
  });
}

if (typeof window !== "undefined") {
  bindAudioUnlockHandlers();
}

export function triggerNotificationHaptic() {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate([24, 32, 24]);
    }
  } catch {
    // Ignore vibration failures on unsupported devices.
  }
}

export function playNotificationSoundEffect() {
  try {
    if (!hasUserInteracted) {
      triggerNotificationHaptic();
      return;
    }

    const audioContext = getSharedAudioContext();
    if (!audioContext) {
      triggerNotificationHaptic();
      return;
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    if (audioContext.state !== "running") {
      // On mobile/background tabs, browsers may block audio; haptic fallback still notifies.
      triggerNotificationHaptic();
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      980,
      audioContext.currentTime + 0.12,
    );

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.15,
      audioContext.currentTime + 0.01,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.18,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.error("Failed to play notification sound:", error);
    triggerNotificationHaptic();
  }
}
