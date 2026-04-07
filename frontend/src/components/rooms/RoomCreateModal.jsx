import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useAppDialog } from "../../contexts/DialogContext";

const defaultForm = {
  title: "",
  description: "",
  isPublic: true,
};

export default function RoomCreateModal({
  open,
  onClose,
  onCreate,
  creating,
  error,
}) {
  const { confirm } = useAppDialog();
  const [form, setForm] = useState(defaultForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [logoError, setLogoError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(defaultForm);
      setLogoFile(null);
      setLogoPreviewUrl("");
      setLogoError("");
    }
  }, [open]);

  useEffect(() => {
    if (!logoPreviewUrl) return;
    return () => URL.revokeObjectURL(logoPreviewUrl);
  }, [logoPreviewUrl]);

  if (!open) return null;

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLogoError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError("Room logo must be 5MB or less.");
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoError("");
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(null);
    setLogoPreviewUrl("");
    setLogoError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!logoFile) {
      const proceed = await confirm({
        title: "Create room without logo?",
        message:
          "Adding a logo improves room recognition. You can still continue without one.",
        confirmLabel: "Continue",
        cancelLabel: "Add logo",
      });
      if (!proceed) return;
    }

    onCreate?.({
      title: form.title,
      description: form.description,
      isPublic: form.isPublic,
      logoFile,
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

          <div>
            <p className="text-xs text-gray-500">Room logo (recommended)</p>
            <div className="mt-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3">
              {logoPreviewUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={logoPreviewUrl}
                    alt="Room logo preview"
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700 truncate">
                      {logoFile?.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(logoFile?.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="text-xs font-semibold text-red-700 hover:text-red-800"
                    disabled={creating}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex items-center gap-2 text-sm text-gray-600">
                  <ImagePlus className="w-4 h-4 text-red-700" />
                  <span>Upload a logo image before creating</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={creating}
                  />
                </label>
              )}

              {logoPreviewUrl && (
                <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                  Change image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                    disabled={creating}
                  />
                </label>
              )}
            </div>

            {logoError && (
              <p className="mt-1 text-xs text-red-600">{logoError}</p>
            )}
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
              <span className="text-sm">Private (invite-only)</span>
            </label>
          </div>

          {(error || logoError) && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error || logoError}
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
