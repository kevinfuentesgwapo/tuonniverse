import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";
import useTheme from "./hooks/useTheme";
import { useLocation } from "react-router-dom";

// Pages that have their own full-screen look (no Navbar).
const NO_NAVBAR = ["/login", "/reset-password"];

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const showNavbar = !NO_NAVBAR.includes(pathname);

  return (
    <>
      {showNavbar && <Navbar theme={theme} onToggleTheme={toggleTheme} />}
      <Routes>
        {/* Home is public. It shows a different view when logged in. */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Any other address shows the 404 page. */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
