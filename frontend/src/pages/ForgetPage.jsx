import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  ArrowLeft,
  Send,
  CheckCircle,
} from "lucide-react";
import Skeleton from "../components/ui/Skeleton";
import {
  formatCooldownLabel,
  getLastCooldownEmail,
  getRemainingCooldownSeconds,
  mapAuthEmailError,
  startEmailCooldown,
  validateEmailFormat,
} from "../utils/authEmailGuards";

const PASSWORD_RESET_ACTION = "password-reset";

export default function ForgetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [lastSentEmail, setLastSentEmail] = useState(() =>
    getLastCooldownEmail(PASSWORD_RESET_ACTION),
  );

  useEffect(() => {
    if (!lastSentEmail) {
      return;
    }

    const remainingCooldown = getRemainingCooldownSeconds(
      PASSWORD_RESET_ACTION,
      lastSentEmail,
    );

    if (remainingCooldown > 0) {
      setCooldownSeconds(remainingCooldown);
      if (!email) {
        setEmail(lastSentEmail);
      }
    }
  }, [email, lastSentEmail]);

  useEffect(() => {
    const sourceEmail = lastSentEmail || email;

    if (!sourceEmail) {
      setCooldownSeconds(0);
      return undefined;
    }

    const refreshCooldown = () => {
      setCooldownSeconds(
        getRemainingCooldownSeconds(PASSWORD_RESET_ACTION, sourceEmail),
      );
    };

    refreshCooldown();
    const intervalId = window.setInterval(refreshCooldown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [email, lastSentEmail]);

  const sendResetEmail = async () => {
    const validation = validateEmailFormat(email);
    if (!validation.isValid) {
      setError(validation.errorMessage);
      return;
    }

    const normalizedEmail = validation.normalizedEmail;

    const remainingCooldown = getRemainingCooldownSeconds(
      PASSWORD_RESET_ACTION,
      normalizedEmail,
    );
    if (remainingCooldown > 0) {
      setCooldownSeconds(remainingCooldown);
      setError(
        `Please wait ${formatCooldownLabel(remainingCooldown)} before requesting another reset email.`,
      );
      return;
    }

    setEmail(normalizedEmail);
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/change-password`,
      },
    );

    setLoading(false);

    if (resetError) {
      setError(
        mapAuthEmailError(resetError, "Failed to send password reset email."),
      );
      return;
    }

    setSent(true);
    setLastSentEmail(normalizedEmail);
    startEmailCooldown(PASSWORD_RESET_ACTION, normalizedEmail);
    setCooldownSeconds(5 * 60);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    await sendResetEmail();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ─── HEADER ─── */}
      <header className="w-full px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white" size={20} />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
            AllChat
          </h1>
        </div>
        <Link
          to="/auth"
          className="hidden sm:flex items-center gap-2 text-gray-600 text-sm font-medium hover:text-red-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md">
          {/* Reset Password Card */}
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
                  Reset Password
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 px-3">
                  {sent ? "Check your email" : "Enter your university email"}
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-8">
              {sent ? (
                // Success State
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="bg-green-50 p-3 rounded-full">
                      <CheckCircle className="text-green-600" size={48} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Email Sent!
                    </h3>
                    <p className="text-gray-600 text-sm">
                      We've sent a password reset link to{" "}
                      <strong>{lastSentEmail || email}</strong>. Please check
                      your inbox and follow the instructions.
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      Cooldown: You can request another reset email in{" "}
                      <strong>{formatCooldownLabel(cooldownSeconds)}</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={sendResetEmail}
                    disabled={loading || cooldownSeconds > 0}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg disabled:cursor-not-allowed disabled:opacity-60 hover:bg-gray-50 transition-colors"
                  >
                    {loading
                      ? "Sending..."
                      : cooldownSeconds > 0
                        ? `Resend available in ${formatCooldownLabel(cooldownSeconds)}`
                        : "Resend reset link"}
                  </button>
                  <div className="pt-4">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Back to Login
                    </Link>
                  </div>
                </div>
              ) : (
                // Form State
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <p className="text-gray-600 text-sm">
                    Enter your university email address and we'll send you a
                    link to reset your password.
                  </p>

                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      University Email
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-600 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="name@university.edu"
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || cooldownSeconds > 0}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 sm:py-3.5 rounded-lg shadow-lg shadow-red-600/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Skeleton
                          as="span"
                          className="w-5 h-5 rounded-full inline-block"
                        />
                        <span>Sending...</span>
                      </>
                    ) : cooldownSeconds > 0 ? (
                      <>
                        <span>
                          Resend available in{" "}
                          {formatCooldownLabel(cooldownSeconds)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <Send size={18} />
                      </>
                    )}
                  </button>

                  {/* Back to Login */}
                  <div className="text-center pt-2">
                    <Link
                      to="/auth"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Back to Login
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-6 sm:mt-8 text-center text-gray-500 text-xs px-2">
            <p>© 2024 AllChat. All university guidelines apply.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
