import { Navigate } from "react-router-dom";
import { useUser } from "../common/UserContext";

export default function PublicRoute({ children }) {
  const { user, loading } = useUser();

  console.log(
    "[PublicRoute] loading:",
    loading,
    "user:",
    user ? "exists" : "null",
  );

  if (loading) {
    // Show loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, show the auth page
  return children;
}
