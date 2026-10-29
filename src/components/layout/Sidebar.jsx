import { NavLink } from "react-router-dom";
import Logo from "../brand/Logo";
import Icon from "../ui/Icon";

// Only pages marked built: true show up.
// When a page is finished, change its built to true. That's all.
const ITEMS = [
  { to: "/", label: "Home", icon: "home", built: true },
  { to: "/sets", label: "Sets", icon: "sets", built: true },
  { to: "/review", label: "Review", icon: "study", built: true },
  { to: "/notes", label: "Notes", icon: "notes", built: true },
  { to: "/study", label: "Study", icon: "study", built: false },
];

// Desktop: left side. Tablet: icons only. Phone: bottom tab bar.
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo />
      </div>

      <nav className="sidebar-nav" aria-label="Sections">
        {ITEMS.filter((item) => item.built).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="sidebar-link"
            title={item.label}
          >
            <Icon name={item.icon} size={22} />
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
