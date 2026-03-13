export const SETTINGS_STORAGE_KEY = "bsu_chat_settings";

export const defaultSettings = {
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

export function playNotificationSoundEffect() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
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

    oscillator.onended = () => {
      audioContext.close().catch(() => {});
    };
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}
