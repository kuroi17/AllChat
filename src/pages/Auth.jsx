import { useState } from "react";
import { supabase } from "../../utils/supabase";
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
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg flex items-center justify-center">
            <GraduationCap className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Campus Global Chat
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 text-sm font-medium hover:text-red-600 transition-colors">
            Help Center
          </button>
          <button className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all">
            System Status
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Login/Signup Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Card Header Banner */}
            <div className="h-32 bg-red-50 flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, #dc2626 1px, transparent 0)",
                  backgroundSize: "24px 24px",
                }}
              ></div>
              <div className="z-10 text-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLogin ? "Welcome Back" : "Create an Account"}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {isLogin
                    ? "Sign in to your university workspace"
                    : "Sign up to join your university workspace"}
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
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
                      placeholder="name@university.edu"
                      className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
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
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-600 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
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
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-600 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-600 transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Sign In / Sign Up Button */}
                <button
                  type="submit"
                  className=" cursor-pointer w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-red-600/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>{isLogin ? "Sign In" : "Sign Up"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
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
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition-colors group"
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
          <footer className="mt-8 text-center text-gray-500 text-xs">
            <p>
              © 2024 Campus Global Chat Platform. All university guidelines
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
          className="text-red-600 rotate-12 translate-x-20 translate-y-20"
        />
      </div>
    </div>
  );
}
