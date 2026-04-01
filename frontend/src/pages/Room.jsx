import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Users,
  MessageCircle,
  Info,
  Share2,
  Link2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import MobileNavMenuButton from "../components/navigation/MobileNavMenuButton";
import {
  createRoomInvite,
  fetchRoom,
  joinPublicRoom,
  updateRoomAvatar,
  uploadRoomAvatar,
} from "../utils/social";
import RoomPreviewModal from "../components/rooms/RoomPreviewModal";
import RoomMessagesList from "../components/rooms/RoomMessagesList";
import DirectMessageComposer from "../components/directMessage/DirectMessageComposer";
import { sendMessage, uploadRoomMessageImage } from "../utils/messages";
import { useUser } from "../contexts/UserContext";

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useUser();
  const queryClient = useQueryClient();

  const [room, setRoom] = useState(null);
  const [roomMedia, setRoomMedia] = useState([]);
  const [toast, setToast] = useState(
    location?.state?.showToast
      ? { type: "success", message: location.state.message || "" }
      : null,
  );
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [previewRoom, setPreviewRoom] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const imageInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const normalizeRoom = (data) => {
    const creatorId = data?.creatorId ?? data?.creator_id ?? null;
    return {
      ...data,
      participantCount: data?.participantCount ?? data?.participant_count ?? 0,
      creatorId,
      isPublic: data?.isPublic ?? data?.is_public ?? true,
      isMember:
        data?.isMember ??
        data?.is_member ??
        (profile?.id ? creatorId === profile.id : false),
    };
  };

  const {
    data: roomData,
    isLoading: loadingRoom,
    error: roomError,
  } = useQuery({
    queryKey: ["rooms", "detail", roomId],
    queryFn: () => fetchRoom(roomId),
    enabled: !!roomId,
  });

  useEffect(() => {
    if (!roomData) return;
    setRoom(normalizeRoom(roomData));
  }, [roomData, profile?.id]);

  useEffect(() => {
    if (!toast?.message) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const openPreview = (targetRoom) => {
    setJoinError("");
    setPreviewRoom(normalizeRoom(targetRoom));
  };

  const handleJoinRoom = async (targetRoom, { closeModal = false } = {}) => {
    if (!targetRoom) return;

    try {
      setJoining(true);
      setJoinError("");

      const response = await joinPublicRoom(targetRoom.id);

      const updated = normalizeRoom({ ...targetRoom, is_member: true });

      if (targetRoom.id === roomId) {
        setRoom((current) =>
          current
            ? {
                ...current,
                participantCount:
                  response?.participantCount ?? current.participantCount,
                isMember: true,
              }
            : current,
        );
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
      }

      if (closeModal) {
        setPreviewRoom(null);
      }

      navigate(`/rooms/${targetRoom.id}`, {
        state: {
          showToast: true,
          message: response?.alreadyMember ? "Already joined" : "Joined room",
        },
      });
    } catch (err) {
      console.error("Join failed:", err);
      if (closeModal) {
        setJoinError(err.message || "Failed to join room");
      } else {
        setToast({
          type: "error",
          message: err.message || "Failed to join room",
        });
      }
    } finally {
      setJoining(false);
    }
  };

  const handleShareRoom = async () => {
    if (!room?.id) return;
    try {
      setInviteLoading(true);
      const response = await createRoomInvite(room.id);
      const link = `${window.location.origin}/invite/${response.token}`;
      await navigator.clipboard.writeText(link);
      setInviteLink(link);
      setToast({ type: "success", message: "Room link copied" });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Copy failed" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !room?.id) return;

    try {
      setAvatarUploading(true);
      const avatarUrl = await uploadRoomAvatar({ roomId: room.id, file });
      const updated = await updateRoomAvatar(room.id, avatarUrl);
      setRoom(normalizeRoom(updated));
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setToast({ type: "success", message: "Room logo updated" });
    } catch (err) {
      setToast({ type: "error", message: err.message || "Upload failed" });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl("");
  };

  const handleSendMessage = async (event) => {
    event?.preventDefault?.();
    const trimmedText = messageText.trim();
    const hasText = !!trimmedText;
    const hasImage = !!selectedImage;
    if (!room?.id || (!hasText && !hasImage)) return;

    const tempId = `temp-room-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const roomKey = `room:${room.id}`;
    const imageToSend = selectedImage;
    const previewUrl = imagePreviewUrl;
    const optimisticMessage = {
      id: tempId,
      clientTempId: tempId,
      room: roomKey,
      user_id: user?.id,
      content: trimmedText,
      image_url: previewUrl || null,
      created_at: new Date().toISOString(),
      profiles: {
        username: profile?.username || "You",
        avatar_url: profile?.avatar_url || null,
      },
      optimistic: true,
    };

    try {
      window.dispatchEvent(
        new CustomEvent("roomMessage:optimistic", {
          detail: optimisticMessage,
        }),
      );

      setMessageText("");
      clearSelectedImage();
      setSendingMessage(hasImage);
      let imageUrl = "";

      if (imageToSend) {
        setUploadingImage(true);
        imageUrl = await uploadRoomMessageImage({
          roomId: room.id,
          file: imageToSend,
        });
      }

      const created = await sendMessage({
        userId: user?.id,
        content: trimmedText,
        room: roomKey,
        imageUrl,
      });

      window.dispatchEvent(
        new CustomEvent("roomMessage:replace", {
          detail: { clientTempId: tempId, message: created },
        }),
      );
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("roomMessage:remove", {
          detail: { clientTempId: tempId },
        }),
      );
      setMessageText(trimmedText);
      if (imageToSend) {
        setSelectedImage(imageToSend);
        setImagePreviewUrl(previewUrl);
      }
      setToast({ type: "error", message: err.message || "Send failed" });
    } finally {
      setUploadingImage(false);
      setSendingMessage(false);
    }
  };

  const loading = loadingRoom && !room;
  const loadError = roomError?.message || "";

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div className="flex-1 flex min-w-0 overflow-hidden">
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-56 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-hidden">
              <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 h-full flex flex-col min-h-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex-1 min-h-0 p-4 animate-pulse">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                  <div className="h-3 w-64 bg-gray-200 rounded mb-3" />
                  <div className="h-3 w-56 bg-gray-200 rounded mb-6" />
                  <div className="h-64 bg-gray-100 rounded-xl" />
                </div>
              </div>
            </div>
          </main>

          <aside className="hidden xl:block w-72 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 space-y-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-20 bg-gray-100 rounded-xl" />
              <div className="h-32 bg-gray-100 rounded-xl" />
            </div>
          </aside>
        </div>
      </div>
    );
  }
  if (loadError) return <div className="p-6">{loadError}</div>;
  if (!room) return <div className="p-6">Room not found</div>;

  const isCreator = room.creatorId && profile?.id === room.creatorId;
  const isMember = room.isMember || isCreator;

  const displayInviteLink = inviteLink || "Generate a shareable invite link";

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex min-w-0 overflow-hidden">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <MobileNavMenuButton />
                <button
                  onClick={() => navigate("/rooms")}
                  className="cursor-pointer text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Back to rooms"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-50 text-red-700 flex items-center justify-center overflow-hidden">
                  {room.avatar_url ? (
                    <img
                      src={room.avatar_url}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold">
                      {room.title?.[0]?.toUpperCase() || "R"}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {room.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">
                    {room.description || "No description"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                  <Users size={14} />
                  {room.participantCount}/{room.capacity ?? "-"}
                </div>

                {!isMember && room.isPublic && (
                  <button
                    onClick={() => openPreview(room)}
                    className="bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold"
                  >
                    Join
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowInfoPanel(true)}
                  className="xl:hidden w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center"
                  aria-label="Open room info"
                  title="Room info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 h-full flex flex-col min-h-0">
              {toast?.message && (
                <div
                  className={`mb-4 px-4 py-2 rounded font-semibold text-sm ${
                    toast.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-800"
                  }`}
                >
                  {toast.message}
                </div>
              )}

              {!isMember ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-700">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Preview mode
                      </h2>
                      <p className="text-sm text-gray-500">
                        Join this room to view messages and participate.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    {room.isPublic && (
                      <button
                        onClick={() => openPreview(room)}
                        className="bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Join room
                      </button>
                    )}
                    <span className="text-xs text-gray-400">
                      {room.isPublic ? "Public room" : "Invite required"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-hidden">
                    <RoomMessagesList
                      roomId={room.id}
                      onMediaUpdate={setRoomMedia}
                    />
                  </div>

                  <DirectMessageComposer
                    imagePreviewUrl={imagePreviewUrl}
                    selectedImageName={selectedImage?.name || ""}
                    onClearSelectedImage={clearSelectedImage}
                    imageInputRef={imageInputRef}
                    onImageChange={handleImageChange}
                    sending={sendingMessage}
                    uploadingImage={uploadingImage}
                    onInsertEmoji={(emoji) =>
                      setMessageText((prev) => `${prev}${emoji}`)
                    }
                    messageText={messageText}
                    setMessageText={setMessageText}
                    onSubmit={handleSendMessage}
                    placeholder="Send a message to the room..."
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="hidden xl:block w-72 border-l border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center overflow-hidden">
                {room.avatar_url ? (
                  <img
                    src={room.avatar_url}
                    alt={room.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-semibold">
                    {room.title?.[0]?.toUpperCase() || "R"}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {room.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {room.isPublic ? "Public room" : "Invite-only room"}
                </p>
                {isCreator && (
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="mt-2 text-xs font-semibold text-red-800 bg-white border border-red-100 px-2 py-1 rounded-lg disabled:opacity-60"
                  >
                    {avatarUploading ? "Uploading..." : "Change logo"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Link2 size={14} />
                  Share group
                </div>
                <button
                  onClick={handleShareRoom}
                  disabled={!isMember || inviteLoading}
                  className="text-xs font-semibold text-red-800 bg-white border border-red-100 px-2 py-1 rounded-lg disabled:opacity-60"
                >
                  {!isMember
                    ? "Join to share"
                    : inviteLoading
                      ? "Linking..."
                      : "Copy link"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 break-all">
                {displayInviteLink}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Shared media
              </h4>
              {roomMedia.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 text-center">
                  No images shared in this room yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {roomMedia.map((item) => (
                    <a
                      key={item.id}
                      href={item.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                      title="Open image"
                    >
                      <img
                        src={item.image_url}
                        alt="Room media"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showInfoPanel && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            onClick={() => setShowInfoPanel(false)}
            className="absolute inset-0 bg-black/40"
            aria-label="Close room info"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Share2 size={14} /> Room info
              </div>
              <button
                onClick={() => setShowInfoPanel(false)}
                className="text-gray-500 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center overflow-hidden">
                  {room.avatar_url ? (
                    <img
                      src={room.avatar_url}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold">
                      {room.title?.[0]?.toUpperCase() || "R"}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {room.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {room.isPublic ? "Public room" : "Invite-only room"}
                  </p>
                  {isCreator && (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="mt-2 text-xs font-semibold text-red-800 bg-white border border-red-100 px-2 py-1 rounded-lg disabled:opacity-60"
                    >
                      {avatarUploading ? "Uploading..." : "Change logo"}
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Link2 size={14} />
                    Share group
                  </div>
                  <button
                    onClick={handleShareRoom}
                    disabled={!isMember || inviteLoading}
                    className="text-xs font-semibold text-red-800 bg-white border border-red-100 px-2 py-1 rounded-lg disabled:opacity-60"
                  >
                    {!isMember
                      ? "Join to share"
                      : inviteLoading
                        ? "Linking..."
                        : "Copy link"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 break-all">
                  {displayInviteLink}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Shared media
                </h4>
                {roomMedia.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500 text-center">
                    No images shared in this room yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {roomMedia.map((item) => (
                      <a
                        key={item.id}
                        href={item.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                        title="Open image"
                      >
                        <img
                          src={item.image_url}
                          alt="Room media"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewRoom && (
        <RoomPreviewModal
          room={previewRoom}
          onClose={() => setPreviewRoom(null)}
          onJoin={() => handleJoinRoom(previewRoom, { closeModal: true })}
          joining={joining}
          error={joinError}
        />
      )}
    </div>
  );
}
