import { useRef, useState, useEffect } from "react";
import Sidebar from "../layouts/Sidebar";
import RightPanel from "../components/GlobalChat/RightPanel";
import ChatHeader from "../components/GlobalChat/ChatHeader";
import MessagesList from "../components/GlobalChat/MessagesList";
import MessageInput from "../components/GlobalChat/MessageInput";

export default function GlobalChat() {
  const messagesScrollRef = useRef(null);
  const [showRightOverlay, setShowRightOverlay] = useState(false);

  useEffect(() => {
    const handler = () => setShowRightOverlay(true);
    window.addEventListener("openRightPanel", handler);
    return () => window.removeEventListener("openRightPanel", handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={true} />
      </div>

      {/* Main chat column: header + scrollable messages + input fixed at bottom */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatHeader />

        {/* Messages area - grows and scrolls */}
        <div ref={messagesScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full px-2 sm:px-4 md:px-0">
            <MessagesList scrollRef={messagesScrollRef} />
          </div>
        </div>

        {/* Input stays visible at bottom */}
        <MessageInput />
      </main>

      <div className="hidden xl:block">
        <RightPanel />
      </div>

      {/* Mobile overlay for right panel */}
      {showRightOverlay && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowRightOverlay(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white border-l border-gray-200">
            <div className="p-2">
              <button
                onClick={() => setShowRightOverlay(false)}
                className="text-gray-500 mb-2"
              >
                Close
              </button>
            </div>
            <RightPanel />
          </div>
        </div>
      )}
    </div>
  );
}
