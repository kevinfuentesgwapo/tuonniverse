import { Routes, Route, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import SetEditor from "./pages/SetEditor";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
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
        {/* Public pages. */}
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Private pages. Logged-out visitors are sent to /login. */}
        <Route
          path="/sets/new"
          element={
            <ProtectedRoute>
              <SetEditor />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
