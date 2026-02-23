
import Sidebar from "../common/Sidebar";
export default function GlobalChat() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* ─── LEFT SIDEBAR ─── */}
      <Sidebar showExtras={true} />

      {/* ─── MIDDLE: MAIN CHAT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-3 flex-shrink-0">
          <span className="text-red-500 text-lg font-extrabold leading-none">
            #
          </span>
          <h2 className="font-bold text-gray-800 text-base">
            Campus Global Chat
          </h2>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-600 font-semibold">
              1,248 ONLINE
            </span>
          </div>
          <div className="flex-1" />
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            🔍
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            🔔
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50">
          {/* Alex Rivera */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              A
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-800">
                  Alex Rivera
                </span>
                <span className="text-xs text-gray-400">10:42 AM</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm text-gray-700 max-w-md">
                Anyone knows if the Library is open late tonight for finals? 📚
              </div>
            </div>
          </div>

          {/* My reply */}
          <div className="flex items-end justify-end gap-3">
            <div className="text-xs text-gray-400 mb-1 flex-shrink-0">
              10:45 AM · Me
            </div>
            <div className="bg-red-600 rounded-2xl rounded-br-none px-4 py-2.5 shadow-sm text-sm text-white max-w-md">
              Yeah, they announced it's 24/7 this week! I'll be there around 8
              PM.
            </div>
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              J
            </div>
          </div>

          {/* New Messages Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-red-200" />
            <span className="text-[11px] text-red-500 font-semibold bg-red-50 border border-red-200 px-3 py-0.5 rounded-full whitespace-nowrap">
              NEW MESSAGES SINCE 10:45 AM
            </span>
            <div className="flex-1 h-px bg-red-200" />
          </div>

          {/* Maya Wong */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              M
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-800">
                  Maya Wong
                </span>
                <span className="text-xs text-gray-400">11:02 AM</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm text-gray-700 max-w-md">
                Awesome! Does anyone want to start a study group for Bio Chem?
                🚀 I have pizza vouchers!
              </div>
            </div>
          </div>

          {/* David Chen */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              D
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-800">
                  David Chen
                </span>
                <span className="text-xs text-gray-400">11:05 AM</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-sm text-gray-700 max-w-md">
                Count me in! I've been struggling with the Krebs cycle concepts.
                Let's meet at the Student Union 2nd floor?
              </div>
            </div>
          </div>

          {/* My reply 2 */}
          <div className="flex items-end justify-end gap-3">
            <div className="text-xs text-gray-400 mb-1 flex-shrink-0">
              11:07 AM · Me
            </div>
            <div className="bg-red-600 rounded-2xl rounded-br-none px-4 py-2.5 shadow-sm text-sm text-white max-w-md">
              Can't make Bio Chem but I'm down for pizza later lol 🍕
            </div>
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              J
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
            <button className="text-gray-400 hover:text-red-600 transition-colors text-lg leading-none">
              +
            </button>
            <input
              type="text"
              placeholder="Type a message to global chat..."
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
            />
            <button className="text-gray-400 hover:text-red-600 transition-colors">
              😊
            </button>
            <button className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors flex-shrink-0">
              <span className="text-sm">▶</span>
            </button>
          </div>
        </div>
      </main>

      {/* ─── RIGHT PANEL ─── */}
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
              <span className="text-red-600 text-sm">📅</span>
              <span className="text-[10px] font-bold text-red-600 tracking-wider">
                UPCOMING EVENT
              </span>
            </div>
            <p className="text-sm font-bold text-gray-800 mb-1">
              Hackathon 2024
            </p>
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
              <span className="text-sm">📢</span>
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
    </div>
  );
}
