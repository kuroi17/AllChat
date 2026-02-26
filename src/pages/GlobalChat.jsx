import Sidebar from "../common/Sidebar";
import RightPanel from "../components/GlobalChat/RightPanel";
import ChatHeader from "../components/GlobalChat/ChatHeader";
import MessagesList from "../components/GlobalChat/MessagesList";
import MessageInput from "../components/GlobalChat/MessageInput";
export default function GlobalChat() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={true} />

      {/* Main chat column: header + scrollable messages + input fixed at bottom */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatHeader />

        {/* Messages area - grows and scrolls */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <MessagesList />
          </div>
        </div>

        {/* Input stays visible at bottom */}
        <MessageInput />
      </main>

      <RightPanel />
    </div>
  );
}
