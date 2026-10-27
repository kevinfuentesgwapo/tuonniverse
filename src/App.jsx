import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Navbar from "./components/layout/Navbar";
import useAuth from "./hooks/useAuth";
import useTheme from "./hooks/useTheme";

// Pages that have their own full-screen look (no Navbar).
const NO_NAVBAR = ["/login", "/reset-password"];

// TEMPORARY page. We replace it later.
function TempHome() {
  const { user } = useAuth();

  return (
    <main className="page">
      <h1>You are logged in 🎉</h1>
      <p className="muted">Signed in as {user.email}</p>
    </main>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const showNavbar = !NO_NAVBAR.includes(pathname);

  return (
    <>
      {showNavbar && <Navbar theme={theme} onToggleTheme={toggleTheme} />}
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <TempHome />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
