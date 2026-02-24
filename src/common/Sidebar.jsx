import { NavLink } from "react-router-dom";
import {
  GraduationCap,
  MessageCircle,
  Home,
  User,
  Settings,
} from "lucide-react";

export default function Sidebar({ showExtras }) {
  return (
    <aside className="w-56 bg-white flex flex-col border-r border-gray-200 flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white text-lg">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-medium leading-tight">
              Campus
            </p>
            <p className="text-sm font-bold text-red-600 leading-tight">
              Global Chat
            </p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 bg-red-50 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm transition-colors"
          }
        >
          <MessageCircle size={18} /> Global Chat
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 bg-red-50 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm transition-colors"
          }
        >
          <Home size={18} /> Dashboard
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive
              ? "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 bg-red-50 font-semibold text-sm transition-colors"
              : "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm transition-colors"
          }
        >
          <User size={18} /> Profile
        </NavLink>
      </nav>

      {/* additional infos in sidebar intended for globalChatTab only */}
      {showExtras && (
        <>
          {/* Direct Messages */}
          <div className="px-3 mt-3">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 mb-2">
              DIRECT MESSAGES
            </p>
            <div className="space-y-0.5">
              {[
                { name: "Alex Rivera", color: "bg-blue-400", online: true },
                { name: "Sarah Jenkins", color: "bg-pink-400", online: false },
              ].map((u) => (
                <button
                  key={u.name}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-red-50 text-sm text-gray-700 hover:text-red-700 transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full ${u.color} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {u.name[0]}
                    </div>
                    {u.online && (
                      <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-white" />
                    )}
                  </div>
                  <span className="truncate">{u.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Following */}
          <div className="px-3 mt-4">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 mb-2">
              FOLLOWING
            </p>
            <div className="space-y-0.5">
              {[
                { name: "Prof. Marcus", color: "bg-purple-400" },
                { name: "Design Club", color: "bg-green-500" },
              ].map((u) => (
                <button
                  key={u.name}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-red-50 text-sm text-gray-700 hover:text-red-700 transition-colors"
                >
                  <div
                    className={`w-7 h-7 rounded-full ${u.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                  >
                    {u.name[0]}
                  </div>
                  <span className="truncate">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1" />

      <div className="p-3 border-t border-gray-200 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          J
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            Me (Jordan)
          </p>
          <p className="text-xs text-gray-500">Computer Science</p>
        </div>
        <button className="text-gray-400 hover:text-red-600 p-1 transition-colors text-base">
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
}
