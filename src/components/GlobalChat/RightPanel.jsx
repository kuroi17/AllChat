import { Calendar, Megaphone } from "lucide-react";
export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto flex-shrink-0">
      {/* Online Now */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest">
            ONLINE NOW
          </span>
          <button className="text-xs text-red-600 font-semibold hover:underline">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {[
            {
              name: "Leon Kim",
              status: "Writing an essay...",
              color: "bg-blue-400",
            },
            {
              name: "Taylor Swift",
              status: "At the Gym",
              color: "bg-pink-400",
            },
            { name: "Emma Watson", status: "Idle", color: "bg-purple-400" },
          ].map((u) => (
            <div key={u.name} className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-white text-xs font-bold`}
                >
                  {u.name[0]}
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                  {u.name}
                </p>
                <p className="text-xs text-gray-400">{u.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Info */}
      <div className="p-4 space-y-3">
        <p className="text-[10px] font-bold text-gray-400 tracking-widest">
          CAMPUS INFO
        </p>

        {/* Upcoming Event */}
        <div className="border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={16} className="text-red-600" />
            <span className="text-[10px] font-bold text-red-600 tracking-wider">
              UPCOMING EVENT
            </span>
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1">Hackathon 2024</p>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Join us for 48 hours of building, learning, and free snacks!
          </p>
          <button className="w-full py-1.5 border border-red-300 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
            Register Now
          </button>
        </div>

        {/* Announcement */}
        <div className="border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Megaphone size={16} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-400 tracking-wider">
              ANNOUNCEMENT
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            New Coffee Shop opening in the Engineering wing next Monday! ☕
          </p>
        </div>

        {/* Trending / Active */}
        <div className="flex gap-2">
          <div className="flex-1 bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 font-semibold mb-1">
              TRENDING
            </p>
            <p className="text-sm font-bold text-red-600">#FinalsWeek</p>
          </div>
          <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-400 font-semibold mb-1">
              ACTIVE
            </p>
            <p className="text-sm font-bold text-gray-800">32 Clubs</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
