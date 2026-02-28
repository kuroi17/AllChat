import { Navigate } from "react-router-dom";
import { useUser } from "../contexts/UserContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useUser();

  console.log(
    "[ProtectedRoute] loading:",
    loading,
    "user:",
    user ? "exists" : "null",
  );

  if (loading) {
    // Show loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated, render the protected content
  return children;
}
