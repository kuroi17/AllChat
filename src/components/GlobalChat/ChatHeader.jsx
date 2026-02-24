import { Search, Bell } from "lucide-react";

export default function ChatHeader() {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 flex-shrink-0">
      <span className="text-red-500 text-lg font-extrabold leading-none">
        #
      </span>
      <h2 className="font-bold text-gray-800 text-base">Campus Global Chat</h2>
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-xs text-green-600 font-semibold">
          1,248 ONLINE
        </span>
      </div>
      <div className="flex-1" />
      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
        <Search size={16} />
      </button>
      <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
        <Bell size={16} />
      </button>
    </div>
  );
}
