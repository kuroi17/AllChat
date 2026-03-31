import { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { sendMessage } from "../../utils/messages";
import EmojiPickerButton from "../common/EmojiPickerButton";

const GLOBAL_CHAT_COOLDOWN_SECONDS = 30;

export default function MessageInput() {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const isCoolingDown = cooldownRemaining > 0;

  const handleInsertEmoji = (emoji) => {
    setText((prev) => `${prev}${emoji}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || isCoolingDown || sending) return;

    setSending(true);

    try {
      await sendMessage({ userId: user.id, content: text });
      // We already dispatch a client event from sendMessage; still clear input
      setText("");
      setCooldownRemaining(GLOBAL_CHAT_COOLDOWN_SECONDS);
    } catch (err) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  const tickCooldown = () => {
    setCooldownRemaining((prev) => (prev > 0 ? prev - 1 : 0));
  };

  useEffect(() => {
    if (!isCoolingDown) return undefined;
    const timer = window.setTimeout(tickCooldown, 1000);
    return () => window.clearTimeout(timer);
  }, [isCoolingDown, cooldownRemaining]);

  return (
    <form
      onSubmit={handleSend}
      className="bg-white border-t border-gray-200 px-2 sm:px-5 py-2 sm:py-3 shrink-0"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <EmojiPickerButton
          onSelect={handleInsertEmoji}
          disabled={sending || isCoolingDown}
          align="left"
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-3 sm:px-4 py-2 text-sm sm:text-base focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || isCoolingDown}
          className="bg-red-800 hover:bg-red-800 text-white px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base disabled:opacity-60"
        >
          {sending
            ? "Sending..."
            : isCoolingDown
              ? `Cooldown ${cooldownRemaining}s`
              : "Send"}
        </button>
      </div>
    </form>
  );
}
