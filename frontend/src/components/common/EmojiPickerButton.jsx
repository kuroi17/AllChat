import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJI_SET = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙏",
  "🔥",
  "🎉",
  "💯",
  "✅",
  "❤️",
  "💔",
  "💙",
  "💚",
  "😅",
  "😴",
  "🤯",
  "🙌",
  "👀",
  "💬",
  "🤝",
  "✨",
  "📚",
  "🎓",
  "📌",
  "🫶",
];

export default function EmojiPickerButton({
  onSelect,
  disabled = false,
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  function handleEmojiSelect(emoji) {
    if (disabled) return;
    onSelect?.(emoji);
  }

  return (
    <div className="relative shrink-0" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="h-10 w-10 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-red-700 transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Insert emoji"
        title="Insert emoji"
      >
        <Smile className="w-5 h-5" />
      </button>

      {open && (
        <div
          className={`absolute bottom-full mb-2 z-30 w-56 sm:w-64 rounded-2xl border border-gray-200 bg-white shadow-xl p-2.5 sm:p-3 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="text-xs font-semibold text-gray-600 mb-2">Emojis</p>
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
            {EMOJI_SET.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="h-7 w-7 rounded-md hover:bg-red-50 transition-colors text-base sm:text-lg leading-none flex items-center justify-center"
                aria-label={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
