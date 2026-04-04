const RANDOM_SESSION_LOCK_KEY = "bsu_random_session_lock";
const RANDOM_SESSION_LOCK_EVENT = "random-session-lock-changed";

function readLockState() {
  try {
    const raw = localStorage.getItem(RANDOM_SESSION_LOCK_KEY);
    if (!raw) {
      return {
        locked: false,
        sessionId: null,
        updatedAt: 0,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      locked: Boolean(parsed?.locked),
      sessionId: parsed?.sessionId || null,
      updatedAt: Number(parsed?.updatedAt || 0),
    };
  } catch {
    return {
      locked: false,
      sessionId: null,
      updatedAt: 0,
    };
  }
}

function notifyLockChange(state) {
  window.dispatchEvent(
    new CustomEvent(RANDOM_SESSION_LOCK_EVENT, {
      detail: state,
    }),
  );
}

export function getRandomSessionLock() {
  return readLockState();
}

export function isRandomSessionLocked() {
  return readLockState().locked;
}

export function setRandomSessionLock({ locked, sessionId = null } = {}) {
  const nextState = {
    locked: Boolean(locked),
    sessionId: locked ? sessionId || null : null,
    updatedAt: Date.now(),
  };

  if (!nextState.locked) {
    localStorage.removeItem(RANDOM_SESSION_LOCK_KEY);
    notifyLockChange(nextState);
    return nextState;
  }

  localStorage.setItem(RANDOM_SESSION_LOCK_KEY, JSON.stringify(nextState));
  notifyLockChange(nextState);
  return nextState;
}

export function clearRandomSessionLock() {
  return setRandomSessionLock({ locked: false });
}

export function subscribeRandomSessionLock(callback) {
  if (typeof callback !== "function") {
    return () => {};
  }

  const onLocalLockChange = (event) => {
    callback(event.detail || readLockState());
  };

  const onStorage = (event) => {
    if (event.key === RANDOM_SESSION_LOCK_KEY) {
      callback(readLockState());
    }
  };

  callback(readLockState());

  window.addEventListener(RANDOM_SESSION_LOCK_EVENT, onLocalLockChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(RANDOM_SESSION_LOCK_EVENT, onLocalLockChange);
    window.removeEventListener("storage", onStorage);
  };
}
