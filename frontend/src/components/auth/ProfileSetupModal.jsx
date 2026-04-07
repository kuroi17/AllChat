import { useEffect, useRef, useState } from "react";
import { Camera, UserRound, X } from "lucide-react";
import Skeleton from "../ui/Skeleton";
import {
  MAX_PROFILE_IMAGE_BYTES,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  getNicknameInitial,
  imageFileToDataUrl,
  normalizeNicknameInput,
  validateNickname,
} from "../../utils/profileIdentity";

export default function ProfileSetupModal({
  isOpen,
  mode = "signup",
  defaultNickname = "",
  defaultAvatarUrl = "",
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setNickname(normalizeNicknameInput(defaultNickname));
    setAvatarUrl(defaultAvatarUrl || "");
    setError("");
  }, [defaultAvatarUrl, defaultNickname, isOpen]);

  if (!isOpen) {
    return null;
  }

  const title = mode === "guest" ? "Continue as Guest" : "Set Up Your Profile";
  const description =
    mode === "guest"
      ? "Choose a nickname and optional profile photo so people can recognize you in chat."
      : "Before creating your account, choose your nickname and optional profile photo.";

  const handleNicknameChange = (event) => {
    setNickname(normalizeNicknameInput(event.target.value));
    setError("");
  };

  const handlePickAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    const result = await imageFileToDataUrl(file);

    if (!result.ok) {
      setError(result.errorMessage);
      event.target.value = "";
      return;
    }

    setAvatarUrl(result.dataUrl);
    event.target.value = "";
  };

  const handleSubmit = () => {
    const nicknameValidation = validateNickname(nickname);

    if (!nicknameValidation.isValid) {
      setError(nicknameValidation.errorMessage);
      return;
    }

    onSubmit?.({
      nickname: nicknameValidation.nickname,
      avatarUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
            aria-label="Close profile setup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-red-800 text-white text-2xl font-bold flex items-center justify-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getNicknameInitial(nickname)
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gray-900 text-white shadow-md hover:bg-gray-800 transition-colors flex items-center justify-center"
                aria-label="Upload profile photo"
              >
                <Camera className="h-4 w-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePickAvatar}
              />
            </div>

            <div className="text-xs text-gray-500 leading-5">
              <p className="font-semibold text-gray-700">Profile photo</p>
              <p>Optional, but helps people identify you quickly.</p>
              <p>Max size: {Math.floor(MAX_PROFILE_IMAGE_BYTES / 1024)}KB.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nickname
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <UserRound className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={nickname}
                onChange={handleNicknameChange}
                maxLength={NICKNAME_MAX_LENGTH}
                placeholder="e.g. campusbuddy"
                className="w-full pl-9 pr-16 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
                {nickname.length}/{NICKNAME_MAX_LENGTH}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {NICKNAME_MIN_LENGTH}-{NICKNAME_MAX_LENGTH} chars. Allowed:
              letters, numbers, _, ., -
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="text-sm bg-red-800 text-white px-4 py-1.5 rounded-lg disabled:opacity-60 hover:bg-red-700 inline-flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Skeleton as="span" className="h-3.5 w-3.5 rounded-full" />
                Processing...
              </>
            ) : mode === "guest" ? (
              "Start as Guest"
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
