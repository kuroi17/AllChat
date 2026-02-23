import Sidebar from "../common/Sidebar";
import RightPanel from "../components/GlobalChat/RightPanel";
import ChatHeader from "../components/GlobalChat/ChatHeader";
import MessagesList from "../components/GlobalChat/MessagesList";
import MessageInput from "../components/GlobalChat/MessageInput";
export default function GlobalChat() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={true} />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatHeader />
        <MessagesList />
        <MessageInput />
      </main>
      <RightPanel />
    </div>
  );
}
