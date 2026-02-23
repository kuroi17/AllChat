import Sidebar from "../common/Sidebar";
export default function Profile() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar showExtras={false} />

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
