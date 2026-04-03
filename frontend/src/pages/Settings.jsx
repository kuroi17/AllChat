import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Volume2,
  Monitor,
  Shield,
  RotateCcw,
  KeyRound,
  User,
  Archive,
} from "lucide-react";
import Sidebar from "../layouts/Sidebar";
import { useUser } from "../contexts/UserContext";
import {
  defaultSettings,
  getChatSettings,
  playNotificationSoundEffect,
  setChatSettings,
} from "../utils/settings";
import AppToast from "../components/common/AppToast";

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  actionLabel,
  onAction,
  actionDisabled,
}) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionDisabled}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        )}

        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            checked ? "bg-red-600" : "bg-gray-300"
          }`}
          aria-pressed={checked}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile } = useUser();
  const [settings, setSettings] = useState(defaultSettings);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setSettings(getChatSettings());
  }, []);

  useEffect(() => {
    setChatSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!toast?.message) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const accountLabel = useMemo(() => {
    return profile?.username || user?.email?.split("@")[0] || "User";
  }, [profile?.username, user?.email]);

  async function handleDesktopNotificationsToggle(enabled) {
    if (enabled && !("Notification" in window)) {
      setSettings((prev) => ({ ...prev, desktopNotifications: false }));
      setToast({
        type: "error",
        message: "Desktop notifications are not supported in this browser.",
      });
      return;
    }

    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSettings((prev) => ({ ...prev, desktopNotifications: false }));
        setToast({
          type: "error",
          message:
            "Desktop notifications are blocked in your browser settings.",
        });
        return;
      }

      setToast({
        type: "success",
        message: "Desktop notifications enabled.",
      });
    }

    if (!enabled) {
      setToast({ type: "success", message: "Desktop notifications disabled." });
    }

    setSettings((prev) => ({ ...prev, desktopNotifications: enabled }));
  }

  function handleSoundEffectsToggle(enabled) {
    setSettings((prev) => ({ ...prev, soundEffects: enabled }));
    if (enabled) {
      playNotificationSoundEffect();
      setToast({ type: "success", message: "Message sound effects enabled." });
    } else {
      setToast({ type: "success", message: "Message sound effects disabled." });
    }
  }

  async function handleTestDesktopNotification() {
    if (!settings.desktopNotifications) {
      setToast({
        type: "error",
        message: "Enable desktop notifications first.",
      });
      return;
    }

    if (!("Notification" in window)) {
      setToast({
        type: "error",
        message: "Desktop notifications are not supported in this browser.",
      });
      return;
    }

    if (Notification.permission !== "granted") {
      setToast({
        type: "error",
        message: "Notification permission is not granted.",
      });
      return;
    }

    new Notification("BSU All Chat", {
      body: "Desktop notifications are working.",
    });
    setToast({ type: "success", message: "Test desktop notification sent." });
  }

  function handleTestSoundEffect() {
    if (!settings.soundEffects) {
      setToast({ type: "error", message: "Enable sound effects first." });
      return;
    }

    playNotificationSoundEffect();
    setToast({ type: "success", message: "Sound effect played." });
  }

  function handleSimpleToggle(key) {
    return (value) => {
      setSettings((prev) => ({ ...prev, [key]: value }));

      if (key === "showOnlineStatus") {
        setToast({
          type: "success",
          message: value
            ? "Your online status is now visible."
            : "Your online status is now hidden.",
        });
      }

      if (key === "compactConversationCards") {
        setToast({
          type: "success",
          message: value
            ? "Compact conversation cards enabled."
            : "Compact conversation cards disabled.",
        });
      }

      if (key === "doNotDisturb") {
        setToast({
          type: "success",
          message: value
            ? "Do Not Disturb enabled. Alerts are now muted."
            : "Do Not Disturb disabled. Alerts are active again.",
        });
      }
    };
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset all chat settings to default values?",
    );
    if (!confirmed) return;

    setSettings(defaultSettings);
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-20 md:pb-6">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-9 h-9 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Settings
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Personalize your chat experience
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Account
                </h2>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {accountLabel}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    View Profile
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Password & Security
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Change your account password anytime.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/change-password")}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    Change Password
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Preferences
                </h2>

                <ToggleRow
                  icon={BellOff}
                  title="Do Not Disturb"
                  description="Mute all sound and desktop alerts while keeping unread counters updated."
                  checked={settings.doNotDisturb}
                  onChange={handleSimpleToggle("doNotDisturb")}
                />

                <ToggleRow
                  icon={Bell}
                  title="Desktop Notifications"
                  description="Allow browser pop-up alerts for new chat activity."
                  checked={settings.desktopNotifications}
                  onChange={handleDesktopNotificationsToggle}
                  actionLabel="Test"
                  onAction={handleTestDesktopNotification}
                  actionDisabled={settings.doNotDisturb}
                />

                <ToggleRow
                  icon={Volume2}
                  title="Message Sound Effects"
                  description="Play an alert sound when new direct, global, or room messages arrive."
                  checked={settings.soundEffects}
                  onChange={handleSoundEffectsToggle}
                  actionLabel="Play"
                  onAction={handleTestSoundEffect}
                  actionDisabled={settings.doNotDisturb}
                />

                <ToggleRow
                  icon={Shield}
                  title="Show My Online Status"
                  description="Display your active status to other users."
                  checked={settings.showOnlineStatus}
                  onChange={handleSimpleToggle("showOnlineStatus")}
                />

                <ToggleRow
                  icon={Monitor}
                  title="Compact Conversation Cards"
                  description="Use tighter spacing in the direct messages conversation list."
                  checked={settings.compactConversationCards}
                  onChange={handleSimpleToggle("compactConversationCards")}
                />
              </section>

              <section className="space-y-3">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                  Maintenance
                </h2>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Room Archive
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        View rooms you left and rejoin public ones quickly.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/settings/rooms-archive")}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Open Archive
                  </button>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Reset App Preferences
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Revert all settings here back to defaults.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetSettings}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <AppToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
