import Sidebar from "../layouts/Sidebar";
import Header from "../layouts/Header";
import { MessageCircle, Users, Megaphone } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar showExtras={false} />
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        <Header title="Dashboard" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-6">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {/* Welcome Banner */}
            <div className="bg-red-800 rounded-2xl p-4 sm:p-6 text-white">
              <h1 className="text-lg sm:text-xl font-bold mb-1">
                Welcome back, Jordan!
                <MessageCircle
                  size={18}
                  className="inline-block ml-2 text-red-800"
                />
              </h1>
              <p className="text-red-800 text-xs sm:text-sm">
                Here's what's happening on campus today.
              </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              {[
                { label: "Messages Today", value: "24", icon: MessageCircle },
                { label: "Active Groups", value: "5", icon: Users },
                { label: "New Announcements", value: "3", icon: Megaphone },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100"
                >
                  <s.icon size={28} className="text-red-800 mb-2" />
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">
                    {s.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">
                Recent Activity
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {[
                  {
                    user: "Alex Rivera",
                    action: "mentioned you in Global Chat",
                    time: "2m ago",
                    color: "bg-blue-400",
                  },
                  {
                    user: "Design Club",
                    action: "posted a new announcement",
                    time: "1h ago",
                    color: "bg-green-500",
                  },
                  {
                    user: "Sarah Jenkins",
                    action: "sent you a direct message",
                    time: "3h ago",
                    color: "bg-pink-400",
                  },
                ].map((a) => (
                  <div
                    key={a.user + a.time}
                    className="flex items-start sm:items-center gap-2 sm:gap-3"
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${a.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                    >
                      {a.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-700 leading-snug">
                        <span className="font-semibold">{a.user}</span>{" "}
                        {a.action}
                      </p>
                      <span className="text-[11px] sm:hidden text-gray-400">
                        {a.time}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-xs text-gray-400 shrink-0">
                      {a.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
