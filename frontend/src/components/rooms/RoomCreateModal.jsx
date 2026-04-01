import { useEffect, useState } from "react";
import { X } from "lucide-react";

const defaultForm = {
  title: "",
  description: "",
  isPublic: true,
  passcode: "",
};

export default function RoomCreateModal({
  open,
  onClose,
  onCreate,
  creating,
  error,
}) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (open) {
      setForm(defaultForm);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate?.({
      title: form.title,
      description: form.description,
      isPublic: form.isPublic,
      passcode: form.isPublic ? null : form.passcode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Create room</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close create room"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Room name</label>
            <input
              autoFocus
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Study Group - Math 101"
              required
              disabled={creating}
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              rows={3}
              placeholder="Add short notes about the room"
              disabled={creating}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={form.isPublic}
                onChange={() => setForm((f) => ({ ...f, isPublic: true }))}
                className="accent-red-800"
                disabled={creating}
              />
              <span className="text-sm">Public</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={!form.isPublic}
                onChange={() => setForm((f) => ({ ...f, isPublic: false }))}
                className="accent-red-800"
                disabled={creating}
              />
              <span className="text-sm">Private</span>
            </label>
          </div>

          {!form.isPublic && (
            <div>
              <label className="text-xs text-gray-500">Passcode</label>
              <input
                type="password"
                value={form.passcode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, passcode: e.target.value }))
                }
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Enter a passcode"
                required
                disabled={creating}
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 px-3 py-1"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-sm bg-red-800 text-white px-3 py-1 rounded-lg"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
