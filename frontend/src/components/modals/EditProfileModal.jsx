import { useState, useEffect, useRef } from "react";
import { X, Save, Camera } from "lucide-react";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../utils/supabase";

export default function EditProfileModal({ isOpen, onClose }) {
  const { user, profile, updateProfile } = useUser();
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    bio: "",
    instagram_url: "",
    spotify_url: "",
    website_url: "",
    department: "",
    year_level: "",
    student_id: "",
  });
  // Avatar states
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null); // To trigger file input click from custom button
  const bannerInputRef = useRef(null);

  // Populate form with existing profile data when modal opens
  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        username: profile.username || "",
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        instagram_url: profile.instagram_url || "",
        spotify_url: profile.spotify_url || "",
        website_url: profile.website_url || "",
        department: profile.department || "",
        year_level: profile.year_level || "",
        student_id: profile.student_id || "",
      });
      setAvatarPreview(profile.avatar_url || null);
      setAvatarFile(null);
      setBannerPreview(profile.banner_url || null);
      setBannerFile(null);
    }
  }, [isOpen, profile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  function normalizeLinkInput(rawValue, type) {
    const value = (rawValue || "").trim();
    if (!value) return "";

    if (/^https?:\/\//i.test(value)) return value;

    if (type === "instagram") {
      const cleaned = value
        .replace(/^@/, "")
        .replace(/^instagram\.com\//i, "")
        .replace(/^www\.instagram\.com\//i, "")
        .replace(/\/+$/, "");
      return cleaned ? `https://instagram.com/${cleaned}` : "";
    }

    if (type === "spotify") {
      const cleaned = value
        .replace(/^spotify\.com\//i, "")
        .replace(/^open\.spotify\.com\//i, "open.spotify.com/");
      return `https://${cleaned}`;
    }

    return `https://${value}`;
  }
  function validateImageFile(file, maxSizeInMb) {
    if (!file) return false;

    if (file.size > maxSizeInMb * 1024 * 1024) {
      setError(`Image size should be less than ${maxSizeInMb}MB`);
      return false;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return false;
    }

    return true;
  }

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!validateImageFile(file, 2)) return;

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  // Handle banner file selection
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!validateImageFile(file, 5)) return;

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setError("");
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadBanner = async () => {
    if (!bannerFile) return null;

    const fileExt = bannerFile.name.split(".").pop();
    const fileName = `banner-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-banners")
      .upload(filePath, bannerFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-banners").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // try to upload new avatar if selected, otherwise keep existing URL
      let avatarUrl = profile?.avatar_url;
      let bannerUrl = profile?.banner_url;

      // Upload avatar if a new one was selected
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      if (bannerFile) {
        bannerUrl = await uploadBanner();
      }

      const normalizedSocialLinks = {
        instagram_url: normalizeLinkInput(formData.instagram_url, "instagram"),
        spotify_url: normalizeLinkInput(formData.spotify_url, "spotify"),
        website_url: normalizeLinkInput(formData.website_url, "website"),
      };

      // Update profile with avatar and banner URL
      const result = await updateProfile({
        ...formData,
        ...normalizedSocialLinks,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      });

      setLoading(false);

      if (result.success) {
        onClose();
      } else {
        setError(result.error?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      if (err?.code === "42703") {
        setError(
          "Profile columns are missing. Run database/add_profile_banner_support.sql and database/add_profile_social_links.sql first.",
        );
        setLoading(false);
        return;
      }
      setError(err.message || "Failed to upload profile media");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          {/* Banner Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Cover Photo
            </label>

            <div
              className={`relative h-28 rounded-xl overflow-hidden border border-gray-200 ${bannerPreview ? "bg-red-800" : "bg-gray-100"}`}
            >
              {bannerPreview && (
                <>
                  <img
                    src={bannerPreview}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                  />
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="pointer-events-none relative z-10 w-full h-full object-contain p-1"
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute right-2 bottom-2 z-30 cursor-pointer bg-black/70 hover:bg-black/80 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera size={14} />
                Change Cover
              </button>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </div>

            <p className="text-xs text-gray-500">
              Recommended size: 1200x400 (wide image works best)
            </p>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3 pb-4 border-b border-gray-200">
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-800 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold overflow-hidden">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile?.username?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-red-800 hover:bg-red-800 text-white p-2 rounded-full shadow-lg transition-colors"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">
              Click the camera icon to upload a photo (max 2MB)
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all resize-none"
            />
          </div>

          {/* Social Links */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Social Links
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Instagram
                </label>
                <input
                  type="text"
                  name="instagram_url"
                  value={formData.instagram_url}
                  onChange={handleChange}
                  placeholder="@username or full URL"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Spotify
                </label>
                <input
                  type="text"
                  name="spotify_url"
                  value={formData.spotify_url}
                  onChange={handleChange}
                  placeholder="Artist/playlist profile URL"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g., Computer Science"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-5 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="cursor-pointer   px-4 py-2 bg-red-800 hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
