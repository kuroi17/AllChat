import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";
import Skeleton from "../ui/Skeleton";
import { isRandomSessionLocked } from "../../utils/randomSessionLock";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    // Show loading skeleton while checking auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isRandomSessionLocked() && location.pathname !== "/random") {
    return <Navigate to="/random" replace />;
  }

  // If authenticated, render the protected content
  return children;
}
