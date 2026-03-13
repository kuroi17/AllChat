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

      // Update profile with avatar and banner URL
      const result = await updateProfile({
        ...formData,
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
          "Profile banner column is missing. Run database/add_profile_banner_support.sql first.",
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
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
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
          className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]"
        >
          {/* Banner Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Cover Photo
            </label>

            <div className="relative h-24 rounded-xl overflow-hidden border border-gray-200 bg-red-800">
              {bannerPreview && (
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              )}

              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="absolute right-2 bottom-2 bg-black/70 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
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

            <p className="text-xs text-gray-500">Recommended size: 1200x400</p>
          </div>

          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3 pb-4 border-b border-gray-200">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-red-800 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
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

          {/* Year Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Year Level
            </label>
            <select
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
            >
              <option value="">Select year level</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </select>
          </div>

          {/* Student ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Student ID
            </label>
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="e.g., BSU-2023-0456"
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
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
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
