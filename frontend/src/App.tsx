import { BrowserRouter, Routes, Route } from "react-router-dom";
import GlobalChat from "./pages/GlobalChat";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import ForgetPage from "./pages/ForgetPage";
import ChangePassword from "./pages/ChangePassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import UserProfile from "./pages/UserProfile";
import DirectMessage from "./pages/DirectMessage";
import DirectMessages from "./pages/DirectMessages";
import Settings from "./pages/Settings";
import RandomChat from "./pages/RandomChat";
import RoomArchive from "./pages/RoomArchive";
import Room from "./pages/Room";
import RoomsList from "./pages/RoomsList";
import RoomInvite from "./pages/RoomInvite";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import UserProvider from "./contexts/UserContext";
import PresenceProvider from "./contexts/PresenceContext";

// Swap out GlobalChat for Dashboard or Profile to preview other pages
export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <PresenceProvider>
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
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <GlobalChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/random"
              element={
                <ProtectedRoute>
                  <RandomChat />
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
            <Route
              path="/settings/rooms-archive"
              element={
                <ProtectedRoute>
                  <RoomArchive />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms/:roomId"
              element={
                <ProtectedRoute>
                  <Room />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms"
              element={
                <ProtectedRoute>
                  <RoomsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invite/:token"
              element={
                <ProtectedRoute>
                  <RoomInvite />
                </ProtectedRoute>
              }
            />
          </Routes>
        </PresenceProvider>
      </UserProvider>
    </BrowserRouter>
  );
}
