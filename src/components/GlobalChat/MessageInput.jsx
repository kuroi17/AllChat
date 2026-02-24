import { Plus, Smile, Send } from "lucide-react";

export default function MessageInput() {
  return (
    <div className="bg-white border-t border-gray-200 px-5 py-3 flex-shrink-0">
      <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
        <button className="text-gray-400 hover:text-red-600 transition-colors text-lg leading-none">
          <Plus size={20} />
        </button>
        <input
          type="text"
          placeholder="Type a message to global chat..."
          className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
        />
        <button className="text-gray-400 hover:text-red-600 transition-colors">
          <Smile size={20} />
        </button>
        <button className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors flex-shrink-0">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
