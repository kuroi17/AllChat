import { Shuffle } from "lucide-react";
import MobileNavMenuButton from "../navigation/MobileNavMenuButton";

export default function RandomMobileHeader({ statusChipLabel = "Idle" }) {
  return (
    <header className="md:hidden h-14 bg-white border-b border-gray-200 flex items-center px-2 gap-2 shrink-0">
      <MobileNavMenuButton showExtras={true} />
      <span className="text-red-800 text-lg font-extrabold leading-none">
        #
      </span>
      <h2 className="font-bold text-gray-800 text-sm truncate inline-flex items-center gap-1.5">
        <Shuffle size={14} /> Random
      </h2>
      <div className="flex-1" />
      <span className="rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        {statusChipLabel}
      </span>
    </header>
  );
}
