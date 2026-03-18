import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "../../layouts/Sidebar";

export default function MobileNavMenuButton({ showExtras = false }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
        aria-label="Open navigation menu"
        title="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-70 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45"
            aria-label="Close navigation menu"
          />

          <div className="relative h-full w-56 max-w-[85vw] shadow-xl">
            <Sidebar
              showExtras={showExtras}
              onNavigate={() => setOpen(false)}
            />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center"
              aria-label="Close navigation menu"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
