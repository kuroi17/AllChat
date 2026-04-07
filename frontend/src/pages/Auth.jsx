import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import {
  formatCooldownLabel,
  getLastCooldownEmail,
  getRemainingCooldownSeconds,
  mapAuthEmailError,
  startEmailCooldown,
  validateEmailFormat,
} from "../utils/authEmailGuards";
import ProfileSetupModal from "../components/auth/ProfileSetupModal";
import { normalizeNicknameInput } from "../utils/profileIdentity";
import { toSafeErrorMessage } from "../utils/safeErrorMessage";

const SIGNUP_CONFIRMATION_ACTION = "signup-confirmation";

function createGuestNicknameSeed() {
  return normalizeNicknameInput(
    `guest${Math.floor(1000 + Math.random() * 9000)}`,
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [signupCooldownSeconds, setSignupCooldownSeconds] = useState(0);
  const [resendingSignupEmail, setResendingSignupEmail] = useState(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);
  const [pendingSignupCredentials, setPendingSignupCredentials] =
    useState(null);
  const [profileSetupMode, setProfileSetupMode] = useState("signup");
  const [guestNicknameSeed, setGuestNicknameSeed] = useState(
    createGuestNicknameSeed,
  );

  useEffect(() => {
    const rememberedEmail = getLastCooldownEmail(SIGNUP_CONFIRMATION_ACTION);
    if (!rememberedEmail) {
      return;
    }

    const remaining = getRemainingCooldownSeconds(
      SIGNUP_CONFIRMATION_ACTION,
      rememberedEmail,
    );

    if (remaining > 0) {
      setPendingSignupEmail(rememberedEmail);
      setSignupCooldownSeconds(remaining);
    }
  }, []);

  useEffect(() => {
    if (!pendingSignupEmail) {
      setSignupCooldownSeconds(0);
      return undefined;
    }

    const refreshCooldown = () => {
      setSignupCooldownSeconds(
        getRemainingCooldownSeconds(
          SIGNUP_CONFIRMATION_ACTION,
          pendingSignupEmail,
        ),
      );
    };

    refreshCooldown();
    const intervalId = window.setInterval(refreshCooldown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pendingSignupEmail]);

  const getValidatedEmail = () => {
    const validation = validateEmailFormat(email);

    if (!validation.isValid) {
      setError(validation.errorMessage);
      return null;
    }

    return validation.normalizedEmail;
  };

  const getSignupNicknameSeed = () => {
    const sourceEmail =
      pendingSignupCredentials?.email || email || pendingSignupEmail;
    const baseNickname = sourceEmail.split("@")[0] || "newuser";
    return normalizeNicknameInput(baseNickname);
  };

  const closeProfileSetupModal = () => {
    if (loading) {
      return;
    }

    setIsProfileSetupOpen(false);
    setPendingSignupCredentials(null);
    setProfileSetupMode("signup");
  };

  const openGuestProfileSetup = () => {
    setError("");
    setNotice("");
    setGuestNicknameSeed(createGuestNicknameSeed());
    setProfileSetupMode("guest");
    setIsProfileSetupOpen(true);
  };

  const completeSignupWithProfile = async ({ nickname, avatarUrl }) => {
    if (!pendingSignupCredentials) {
      setError("Signup session expired. Please try again.");
      setIsProfileSetupOpen(false);
      return;
    }

    const { email: signupEmail, password: signupPassword } =
      pendingSignupCredentials;

    const remainingCooldown = getRemainingCooldownSeconds(
      SIGNUP_CONFIRMATION_ACTION,
      signupEmail,
    );

    if (remainingCooldown > 0) {
      setSignupCooldownSeconds(remainingCooldown);
      setPendingSignupEmail(signupEmail);
      setError(`Please wait before requesting another confirmation email.`);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          full_name: nickname,
          name: nickname,
          avatar_url: avatarUrl || "",
          is_guest: false,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(mapAuthEmailError(error, "Unable to create account."));
      return;
    }

    if (!data.user) {
      setError("Unable to create account right now. Please try again.");
      return;
    }

    setIsProfileSetupOpen(false);
    setPendingSignupCredentials(null);

    startEmailCooldown(SIGNUP_CONFIRMATION_ACTION, signupEmail);
    setPendingSignupEmail(signupEmail);
    setSignupCooldownSeconds(5 * 60);
    setConfirmPassword("");
    setPassword("");

    if (data.session) {
      setNotice("Account created successfully. Redirecting to chat...");
      navigate("/");
      return;
    }

    setNotice(
      "Account created. Check your inbox for the confirmation link. If email delivery is delayed, you can use Google sign-in for now.",
    );
  };

  const completeGuestSignInWithProfile = async ({ nickname, avatarUrl }) => {
    if (typeof supabase.auth.signInAnonymously !== "function") {
      setError(
        "Guest sign-in is not available in this app build. Please use Google or email sign-in.",
      );
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const { error: guestError } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          full_name: nickname,
          name: nickname,
          avatar_url: avatarUrl || "",
          is_guest: true,
        },
      },
    });

    setLoading(false);

    if (guestError) {
      const rawMessage = String(guestError.message || "").toLowerCase();
      if (rawMessage.includes("anonymous") && rawMessage.includes("disabled")) {
        setError(
          "Guest sign-in is disabled in Supabase settings. Enable Anonymous Provider in Supabase Auth to use this feature.",
        );
        return;
      }

      setError(
        toSafeErrorMessage(
          guestError,
          "Unable to continue as guest right now.",
        ),
      );
      return;
    }

    setIsProfileSetupOpen(false);
    setProfileSetupMode("signup");
    setNotice("Guest session started. Redirecting to chat...");
    navigate("/");
  };

  const handleProfileSetupSubmit = async (profilePayload) => {
    if (profileSetupMode === "guest") {
      await completeGuestSignInWithProfile(profilePayload);
      return;
    }

    await completeSignupWithProfile(profilePayload);
  };

  // Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // Redirect back to home after sign-in
        },
      });

      if (error) {
        setError(toSafeErrorMessage(error, "Unable to sign in."));
      }
      // Note: User will be redirected to Google, then back to your app automatically
    } catch (err) {
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingSignupEmail) {
      return;
    }

    const remainingCooldown = getRemainingCooldownSeconds(
      SIGNUP_CONFIRMATION_ACTION,
      pendingSignupEmail,
    );

    if (remainingCooldown > 0) {
      setSignupCooldownSeconds(remainingCooldown);
      setError(
        `Please wait ${formatCooldownLabel(remainingCooldown)} before resending the confirmation email.`,
      );
      return;
    }

    setResendingSignupEmail(true);
    setError("");
    setNotice("");

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingSignupEmail,
      });

      if (resendError) {
        setError(
          mapAuthEmailError(
            resendError,
            "Failed to resend confirmation email.",
          ),
        );
        return;
      }

      startEmailCooldown(SIGNUP_CONFIRMATION_ACTION, pendingSignupEmail);
      setSignupCooldownSeconds(5 * 60);
      setNotice(
        "Confirmation email sent again. Please wait up to 5 minutes before another resend.",
      );
    } finally {
      setResendingSignupEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page

    setError("");
    setNotice("");

    const validatedEmail = getValidatedEmail();
    if (!validatedEmail) {
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: validatedEmail,
        password,
      });

      setLoading(false);

      if (error) {
        setError(toSafeErrorMessage(error, "Unable to sign in."));
      } else {
        navigate("/"); // Redirect to global chat after successful login
      }
    } else {
      const remainingCooldown = getRemainingCooldownSeconds(
        SIGNUP_CONFIRMATION_ACTION,
        validatedEmail,
      );

      if (remainingCooldown > 0) {
        setLoading(false);
        setSignupCooldownSeconds(remainingCooldown);
        setPendingSignupEmail(validatedEmail);
        setError(`Please wait before requesting another confirmation email.`);
        return;
      }

      setLoading(false);
      setPendingSignupCredentials({
        email: validatedEmail,
        password,
      });
      setProfileSetupMode("signup");
      setIsProfileSetupOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ─── HEADER ─── */}
      <header className="w-full px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-800 p-1.5 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white" size={20} />
          </div>
          <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
            AllChat
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <button className="text-gray-600 text-sm font-medium hover:text-red-800 transition-colors">
            Help Center
          </button>
          <button className="bg-red-50 text-red-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all">
            System Status
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md">
          {/* Login/Signup Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Card Header Banner */}
            <div className="h-28 sm:h-32 bg-red-50 flex items-center justify-center relative overflow-hidden">
              <div className="z-10 text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isLogin ? "Welcome Back" : "Create an Account"}
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 px-3">
                  {isLogin
                    ? "Sign in to your university workspace"
                    : "Sign up to join your university workspace"}
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-8">
              {/* Google-first sign in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={openGuestProfileSetup}
                disabled={loading}
                className="mt-3 w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-lg transform transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Continue as Guest
              </button>

              {/* Divider */}
              <div className="relative my-6 sm:my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                  <span className="bg-white px-4 text-gray-400">OR</span>
                </div>
              </div>

              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-800 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      placeholder="name@university.edu"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">
                      Password
                    </label>
                    {isLogin && (
                      <Link
                        to="/forget"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-800 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Sign Up only) */}
                {!isLogin && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-800 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-800/20 focus:border-red-800 transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm">
                    {notice}
                  </div>
                )}

                {/* Sign In / Sign Up Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer w-full bg-red-800 hover:bg-red-800 text-white font-bold py-3 sm:py-3.5 rounded-lg shadow-lg shadow-red-800/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>
                    {loading
                      ? "Please wait..."
                      : isLogin
                        ? "Sign In"
                        : "Sign Up"}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </form>

              {!isLogin && pendingSignupEmail && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600 mb-2">
                    Didn't get your confirmation email?
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingSignupEmail || signupCooldownSeconds > 0}
                    className="text-sm font-semibold text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendingSignupEmail
                      ? "Resending..."
                      : signupCooldownSeconds > 0
                        ? `Resend available in ${formatCooldownLabel(signupCooldownSeconds)}`
                        : "Resend confirmation email"}
                  </button>
                </div>
              )}

              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs text-blue-900">
                  We respect your privacy. Authentication and data security are
                  handled using trusted infrastructure.
                </p>
              </div>

              <p className="mt-4 text-xs text-gray-600 text-center leading-5">
                By signing in, you agree to our{" "}
                <Link to="/terms" className="text-red-700 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-red-700 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>

              {/* Divider */}
              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                  <span className="bg-white px-4 text-gray-400">
                    {isLogin ? "New here?" : "Already have an account?"}
                  </span>
                </div>
              </div>

              {/* Toggle Login/Signup Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError("");
                    setNotice("");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-800 transition-colors group"
                >
                  {isLogin ? "Create an account" : "Sign in instead"}
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-6 sm:mt-8 text-center text-gray-500 text-xs px-2">
            <p>© 2026 AllChat. All university guidelines apply.</p>
            <div className="mt-2 flex justify-center gap-4"></div>
          </footer>
        </div>
      </main>

      {/* Decorative Background Element */}
      <div className="fixed bottom-0 right-0 p-8 opacity-10 pointer-events-none select-none overflow-hidden">
        <MessageCircle
          size={240}
          className="text-red-50 rotate-12 translate-x-20 translate-y-20"
        />
      </div>

      <ProfileSetupModal
        isOpen={isProfileSetupOpen}
        mode={profileSetupMode}
        defaultNickname={
          profileSetupMode === "guest"
            ? guestNicknameSeed
            : getSignupNicknameSeed()
        }
        submitting={loading}
        onClose={closeProfileSetupModal}
        onSubmit={handleProfileSetupSubmit}
      />
    </div>
  );
}
