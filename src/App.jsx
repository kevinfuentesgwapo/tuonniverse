import { Routes, Route } from "react-router-dom";
import { Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";
import AppShell from "./components/layout/AppShell";
import useTheme from "./hooks/useTheme";
import useAuth from "./hooks/useAuth";

// Picks the frame around the page.
// Logged in = app shell (sidebar + top bar).
// Logged out = simple Navbar.
function Layout({ theme, onToggleTheme }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (user) {
    return <AppShell theme={theme} onToggleTheme={onToggleTheme} />;
  }

  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />
      <Outlet />
    </>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Routes>
      {/* Full-screen pages. No navbar, no sidebar. */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Pages inside the frame. */}
      <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
        {/* Home is public. It shows a different view when logged in. */}
        <Route path="/" element={<Home />} />
        {/* Privacy is public. Anyone can read it. */}
        <Route path="/privacy" element={<Privacy />} />
        {/* Private pages (sets, notes, study) go here later,
            wrapped in ProtectedRoute. */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
