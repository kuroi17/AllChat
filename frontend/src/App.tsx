import { BrowserRouter, Routes, Route } from "react-router-dom";
import GlobalChat from "./pages/GlobalChat";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ForgetPage from "./pages/ForgetPage";
import ChangePassword from "./pages/ChangePassword";
import UserProfile from "./pages/UserProfile";
import DirectMessage from "./pages/DirectMessage";
import DirectMessages from "./pages/DirectMessages";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import UserProvider from "./contexts/UserContext";

// Swap out GlobalChat for Dashboard or Profile to preview other pages
export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />
          <Route
            path="/forget"
            element={
              <PublicRoute>
                <ForgetPage />
              </PublicRoute>
            }
          />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <GlobalChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dms"
            element={
              <ProtectedRoute>
                <DirectMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dm/:conversationId"
            element={
              <ProtectedRoute>
                <DirectMessage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dm/new"
            element={
              <ProtectedRoute>
                <DirectMessage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}
