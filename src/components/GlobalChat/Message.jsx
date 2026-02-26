export default function Message({ user, color, time, text, me }) {
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
      <div
        className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
      >
        {user[0]}
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
