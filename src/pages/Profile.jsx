export default function Profile() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* ─── LEFT SIDEBAR (shared layout - will be componentized later) ─── */}
      <aside className="w-56 bg-white flex flex-col border-r border-gray-200 flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white text-lg">
              🎓
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
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm transition-colors">
            <span>💬</span> Global Chat
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 text-sm transition-colors">
            <span>🏠</span> Dashboard
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm shadow-sm">
            <span>👤</span> Profile
          </button>
        </nav>

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
            ⚙️
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
          <h2 className="font-bold text-gray-800 text-base">My Profile</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Cover */}
              <div className="h-28 bg-gradient-to-r from-red-600 to-red-400" />
              {/* Avatar + Info */}
              <div className="px-6 pb-5">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-red-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md">
                    J
                  </div>
                  <button className="mb-1 px-4 py-1.5 border border-red-300 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors">
                    Edit Profile
                  </button>
                </div>
                <h2 className="text-lg font-bold text-gray-800">Jordan Cruz</h2>
                <p className="text-sm text-gray-500">Computer Science · BSU</p>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  3rd year CS student 🖥️ | Coffee addict ☕ | Always down for a
                  hackathon
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">
                Account Information
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Username", value: "@jordan_cruz" },
                  { label: "Email", value: "jordan.cruz@bsu.edu.ph" },
                  {
                    label: "Department",
                    value: "College of Information Technology",
                  },
                  { label: "Year Level", value: "3rd Year" },
                  { label: "Student ID", value: "BSU-2023-0456" },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {f.label}
                    </span>
                    <span className="text-sm text-gray-700">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Stats */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Activity</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Messages Sent", value: "1,204" },
                  { label: "Groups Joined", value: "8" },
                  { label: "Following", value: "15" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center bg-gray-50 rounded-xl p-3"
                  >
                    <p className="text-xl font-bold text-red-600">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
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
