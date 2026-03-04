import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle } from "lucide-react";

export default function Message({ user, color, time, text, me, userId }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleAvatarClick = () => {
    if (!me) {
      setShowMenu(!showMenu);
    }
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    navigate(`/user/${userId}`);
  };

  const handleSendMessage = () => {
    setShowMenu(false);
    navigate(`/dm/new?userId=${userId}`);
  };

  if (me) {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="text-xs text-gray-400 mb-1 shrink-0">{time} · Me</div>
        <div className="bg-red-800 rounded-2xl rounded-br-none px-4 py-2.5 shadow-sm text-sm text-white max-w-md">
          {text}
        </div>
        <div className="w-9 h-9 rounded-full bg-red-800 flex items-center justify-center text-white text-sm font-bold shrink-0">
          J
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <div className="relative" ref={menuRef}>
        <div
          className={`cursor-pointer w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shrink-0 hover:ring-2 hover:ring-red-300 transition-all`}
          onClick={handleAvatarClick}
        >
          {user[0]}
        </div>

        {/* User Menu Dropdown */}
        {showMenu && (
          <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={handleViewProfile}
              className="cursor-pointer w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <User size={16} />
              <span className="font-medium cursor-pointer ">Profile</span>
            </button>
            <button
              onClick={handleSendMessage}
              className="cursor-pointer w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <MessageCircle size={16} />
              <span className="font-medium cursor-pointer">Message</span>
            </button>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm text-gray-800">{user}</span>
          <span className="text-xs text-gray-400">{time}</span>
        </div>
        <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm text-gray-700 max-w-md">
          {text}
        </div>
      </div>
    </div>
  );
}
