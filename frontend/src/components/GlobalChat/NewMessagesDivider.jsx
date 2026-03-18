export default function NewMessagesDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-red-200" />
      <span className="text-[11px] text-red-500 font-semibold bg-red-50 border border-red-200 px-3 py-0.5 rounded-full whitespace-nowrap">
        NEW MESSAGES SINCE 10:45 AM
      </span>
      <div className="flex-1 h-px bg-red-200" />
    </div>
  );
}
