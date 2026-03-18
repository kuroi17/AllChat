import { Search, Send } from "lucide-react";
import MobileNavMenuButton from "../navigation/MobileNavMenuButton";

export default function DirectMessagesHeader({
  conversationsCount,
  searchQuery,
  onSearchChange,
}) {
  return (
    <header className="bg-linear-to-r from-red-50 via-white to-red-50 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-5 shrink-0">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <MobileNavMenuButton />
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-linear-to-br from-red-500 to-pink-500 flex items-center justify-center shrink-0">
            <Send className="text-white" size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Messages
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {conversationsCount} conversation
              {conversationsCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border-2 border-gray-200 rounded-2xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm hover:shadow-md"
          />
        </div>
      </div>
    </header>
  );
}
