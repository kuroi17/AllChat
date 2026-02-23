import { BrowserRouter, Routes, Route }  from "react-router-dom";
import GlobalChat from "./pages/GlobalChat";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

// Swap out GlobalChat for Dashboard or Profile to preview other pages
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GlobalChat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

 
