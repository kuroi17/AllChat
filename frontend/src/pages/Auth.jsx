import { useState } from "react";
import { supabase } from "../utils/supabase";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [showPassword, setShowPassword] = useState(false); // Toggle password visibility

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // Redirect back to home after sign-in
        },
      });

      if (error) {
        alert(error.message);
      }
      // Note: User will be redirected to Google, then back to your app automatically
    } catch (err) {
      alert("Failed to sign in with Google: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form from refreshing the page
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else {
        alert("Logged in successfully!");
        navigate("/"); // Redirect to global chat after successful login
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert(error.message);
      } else if (data.user) {
        // Create profile entry
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username: email.split("@")[0], // Default username from email
          bio: "",
          avatar_url: "",
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }

        alert("Check your email for confirmation!");
        setIsLogin(true);
      }
    }
  };

  const handleForget = (e) => {
    e.preventDefault();
    navigate("/forget");
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
              <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    University Email
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
                      <a
                        href="#"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => navigate("/forget")}
                      >
                        Forgot password?
                      </a>
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
                      />
                    </div>
                  </div>
                )}

                {/* Sign In / Sign Up Button */}
                <button
                  type="submit"
                  className="cursor-pointer w-full bg-red-800 hover:bg-red-800 text-white font-bold py-3 sm:py-3.5 rounded-lg shadow-lg shadow-red-800/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>{isLogin ? "Sign In" : "Sign Up"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6 sm:my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                  <span className="bg-white px-4 text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-lg transform transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-sm"
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
                <span>Continue with Google</span>
              </button>

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
                  onClick={() => setIsLogin(!isLogin)} // click the button to toggle between login and sign up
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
            <p>
              © 2026 AllChat. All university guidelines
              apply.
            </p>
            <div className="mt-2 flex justify-center gap-4">
              <a href="#" className="hover:underline">
                Privacy Policy
              </a>
              <a href="#" className="hover:underline">
                Terms of Service
              </a>
            </div>
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
    </div>
  );
}
