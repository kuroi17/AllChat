import Sidebar from "../common/Sidebar";
import { MessageCircle, Users, Megaphone } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />
     

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
          <h2 className="font-bold text-gray-800 text-base">Dashboard</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="bg-red-600 rounded-2xl p-6 text-white">
              <h1 className="text-xl font-bold mb-1">
                Welcome back, Jordan! 👋
              </h1>
              <p className="text-red-100 text-sm">
                Here's what's happening on campus today.
              </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Messages Today", value: "24", icon: MessageCircle },
                { label: "Active Groups", value: "5", icon: Users },
                { label: "New Announcements", value: "3", icon: Megaphone },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <s.icon size={32} className="text-red-600 mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Recent Activity</h3>
              <div className="space-y-3">
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
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${a.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                    >
                      {a.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{a.user}</span>{" "}
                        {a.action}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
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
