import { Navigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import Skeleton from "../ui/Skeleton";

export default function PublicRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) {
    // Show loading spinner while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
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
