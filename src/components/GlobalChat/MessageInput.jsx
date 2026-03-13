import { useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { sendMessage } from "../../utils/messages";
import EmojiPickerButton from "../common/EmojiPickerButton";

export default function MessageInput() {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleInsertEmoji = (emoji) => {
    setText((prev) => `${prev}${emoji}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const inserted = await sendMessage({ userId: user.id, content: text });
      // We already dispatch a client event from sendMessage; still clear input
      setText("");
    } catch (err) {
      alert(err.message);
    }
    setSending(false);
  };

  return (
    <form
      onSubmit={handleSend}
      className="bg-white border-t border-gray-200 px-5 py-3 shrink-0"
    >
      <div className="flex items-center gap-3">
        <EmojiPickerButton
          onSelect={handleInsertEmoji}
          disabled={sending}
          align="left"
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="ml-2 bg-red-800 hover:bg-red-800 text-white px-4 py-2 rounded-full text-sm disabled:opacity-60"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </form>
  );
}
