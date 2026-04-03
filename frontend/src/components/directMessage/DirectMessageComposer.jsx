import { Send, ImagePlus, X } from "lucide-react";
import EmojiPickerButton from "../common/EmojiPickerButton";
import Skeleton from "../ui/Skeleton";

export default function DirectMessageComposer({
  imagePreviewUrl,
  selectedImageName,
  onClearSelectedImage,
  replyTarget,
  onClearReply,
  imageInputRef,
  onImageChange,
  sending,
  uploadingImage,
  onInsertEmoji,
  messageText,
  setMessageText,
  onSubmit,
  placeholder,
  allowImageUpload = true,
  uploadDisabledReason = "Image uploads are disabled.",
}) {
  return (
    <div className="bg-white border-t border-gray-200 px-2 sm:px-6 py-2 sm:py-4 shrink-0">
      <div className="max-w-4xl mx-auto">
        {replyTarget && (
          <div className="mb-2 sm:mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-900 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">
                Replying to {replyTarget?.profiles?.username || "User"}
              </p>
              <p className="text-red-700 truncate">
                {replyTarget?.content || "(no text)"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="text-red-700 hover:text-red-900 font-semibold"
            >
              Cancel
            </button>
          </div>
        )}

        {imagePreviewUrl && (
          <div className="mb-2 sm:mb-3 inline-flex items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 bg-gray-50 px-2 sm:px-3 py-2 max-w-full">
            <img
              src={imagePreviewUrl}
              alt="Selected attachment"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-gray-700">
                Image ready to send
              </p>
              <p className="text-xs text-gray-500 truncate max-w-55">
                {selectedImageName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClearSelectedImage}
              className="w-7 h-7 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-end gap-2 sm:gap-3">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 sm:p-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-red-700 transition-colors shrink-0"
            title={allowImageUpload ? "Attach image" : uploadDisabledReason}
            aria-label="Attach image"
            disabled={sending || uploadingImage || !allowImageUpload}
          >
            <ImagePlus className="w-5 h-5" />
          </button>

          <EmojiPickerButton
            onSelect={onInsertEmoji}
            disabled={sending || uploadingImage}
          />

          <div className="flex-1 bg-gray-100 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-red-500 transition-all">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
              placeholder={placeholder}
              rows="1"
              className="w-full bg-transparent border-none outline-none resize-none text-sm sm:text-base text-gray-900 placeholder-gray-500"
              style={{ maxHeight: "120px" }}
              disabled={sending || uploadingImage}
            />
          </div>
          <button
            type="submit"
            disabled={
              (!messageText.trim() && !imagePreviewUrl) ||
              sending ||
              uploadingImage
            }
            className="p-2.5 sm:p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending || uploadingImage ? (
              <Skeleton
                as="span"
                className="w-5 h-5 rounded-full inline-block"
              />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
