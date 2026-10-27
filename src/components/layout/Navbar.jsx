import { Link, useNavigate } from "react-router-dom";
import Logo from "../brand/Logo";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

// Top bar. App.jsx gives it the theme, so the theme works on every page.
export default function Navbar({ theme, onToggleTheme }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";
  const themeLabel = `Switch to ${isDark ? "light" : "dark"} mode`;

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    navigate("/", { replace: true });
  }

  return (
    <header className="navbar">
      <nav className="navbar-inner" aria-label="Main">
        <Logo />

        <div className="navbar-actions">
          <button
            type="button"
            className="theme-btn"
            onClick={onToggleTheme}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
          </button>

          {!loading &&
            (user ? (
              <button type="button" className="btn" onClick={handleLogout}>
                Log out
              </button>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Log in
              </Link>
            ))}
        </div>
      </nav>
    </header>
  );
}
