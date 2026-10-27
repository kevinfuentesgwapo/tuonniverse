import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../brand/Logo";
import Icon from "../ui/Icon";
import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";

// Items in the Create menu.
// When a tool is built, add  to: "/the-page"  and it becomes a real link.
const CREATE_ITEMS = [
  { label: "New set", icon: "sets" },
  { label: "New note", icon: "notes" },
  { label: "Generate with AI", icon: "sparkles" },
];

function getDisplayName(user) {
  const meta = user?.user_metadata ?? {};
  return (
    meta.full_name || meta.name || user?.email?.split("@")[0] || "Explorer"
  );
}

export default function Topbar({ theme, onToggleTheme }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(null); // "create" | "profile" | null
  const createRef = useRef(null);
  const profileRef = useRef(null);

  const isDark = theme === "dark";
  const themeLabel = `Switch to ${isDark ? "light" : "dark"} mode`;
  const name = getDisplayName(user);
  const initial = name.charAt(0).toUpperCase();

  // Close menus: click outside, or press Escape.
  useEffect(() => {
    function onPointerDown(e) {
      const inCreate = createRef.current?.contains(e.target);
      const inProfile = profileRef.current?.contains(e.target);
      if (!inCreate && !inProfile) setOpenMenu(null);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function toggle(menu) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    setOpenMenu(null);
    navigate("/", { replace: true });
  }

  return (
    <header className="topbar">
      {/* Logo here is only for phones. The sidebar has it on bigger screens. */}
      <div className="topbar-logo">
        <Logo />
      </div>

      <div className="topbar-search">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Search your sets (coming soon)"
          aria-label="Search your sets"
          disabled
        />
      </div>

      <div className="topbar-actions">
        <div className="menu-wrap" ref={createRef}>
          <button
            type="button"
            className="btn btn-primary create-btn"
            onClick={() => toggle("create")}
            aria-haspopup="menu"
            aria-expanded={openMenu === "create"}
          >
            <Icon name="plus" size={18} />
            <span className="create-label">Create</span>
          </button>

          {openMenu === "create" && (
            <div className="menu" role="menu">
              {CREATE_ITEMS.map((item) =>
                item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="menu-item"
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                  >
                    <Icon name={item.icon} size={18} />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    className="menu-item"
                    role="menuitem"
                    disabled
                  >
                    <Icon name={item.icon} size={18} />
                    {item.label}
                    <span className="menu-soon">Soon</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        <span className="streak-chip" title="Study streak (coming soon)">
          <Icon name="flame" size={18} />0
        </span>

        <button
          type="button"
          className="theme-btn"
          onClick={onToggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
        >
          <Icon name={isDark ? "sun" : "moon"} size={20} />
        </button>

        <div className="menu-wrap" ref={profileRef}>
          <button
            type="button"
            className="avatar-btn"
            onClick={() => toggle("profile")}
            aria-haspopup="menu"
            aria-expanded={openMenu === "profile"}
            aria-label="Your profile menu"
          >
            {initial}
          </button>

          {openMenu === "profile" && (
            <div className="menu" role="menu">
              <div className="menu-head">
                <strong>{name}</strong>
                <span className="muted">{user?.email}</span>
              </div>
              <button
                type="button"
                className="menu-item"
                role="menuitem"
                onClick={handleLogout}
              >
                <Icon name="logout" size={18} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
 