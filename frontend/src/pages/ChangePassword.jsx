import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if user came from password reset email
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
        setTimeout(() => navigate("/forget"), 3000);
      }
    };
    checkSession();
  }, [navigate]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth");
      }, 2000);
    }
  };

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ─── HEADER ─── */}
      <header className="w-full px-3 sm:px-6 py-3 sm:py-4 flex items-center border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-800 p-1.5 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white" size={20} />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
          AllChat
          </h1>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md">
          {/* Change Password Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="h-28 sm:h-32 bg-red-50 flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, #dc2626 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              ></div>
              <div className="z-10 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {success ? "Password Changed!" : "Set New Password"}
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 px-3">
                  {success
                    ? "Redirecting to login..."
                    : "Enter your new password"}
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-8">
              {success ? (
                // Success State
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-green-50 p-3 rounded-full">
                      <CheckCircle className="text-green-600" size={48} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Success!
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Your password has been changed successfully. You can now
                      sign in with your new password.
                    </p>
                  </div>
                </div>
              ) : error && !isValidSession ? (
                // Invalid Link State
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-red-50 p-3 rounded-full">
                      <AlertCircle className="text-red-600" size={48} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Invalid Link
                    </h3>
                    <p className="text-gray-600 text-sm">{error}</p>
                  </div>
                </div>
              ) : (
                // Form State
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <p className="text-gray-600 text-sm">
                    Please enter your new password. Make sure it's at least 6
                    characters long.
                  </p>

                  {/* New Password Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-600 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Confirm New Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-600 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && isValidSession && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-3.5 rounded-lg shadow-lg shadow-red-600/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Skeleton
                          as="span"
                          className="w-5 h-5 rounded-full inline-block"
                        />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-6 sm:mt-8 text-center text-gray-500 text-xs px-2">
            <p>
              © 2024 AllChat. All university guidelines
              apply.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
