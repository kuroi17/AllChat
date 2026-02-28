import { useRef } from "react";
import Sidebar from "../layouts/Sidebar";
import RightPanel from "../components/GlobalChat/RightPanel";
import ChatHeader from "../components/GlobalChat/ChatHeader";
import MessagesList from "../components/GlobalChat/MessagesList";
import MessageInput from "../components/GlobalChat/MessageInput";

export default function GlobalChat() {
  const messagesScrollRef = useRef(null);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={true} />

      {/* Main chat column: header + scrollable messages + input fixed at bottom */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatHeader />

        {/* Messages area - grows and scrolls */}
        <div ref={messagesScrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <MessagesList scrollRef={messagesScrollRef} />
          </div>
        </div>

        {/* Input stays visible at bottom */}
        <MessageInput />
      </main>

      <RightPanel />
    </div>
  );
}
