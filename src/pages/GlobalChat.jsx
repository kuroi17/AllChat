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
    </div>
  );
}
