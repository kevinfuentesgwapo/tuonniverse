import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";

// The frame for logged-in pages: sidebar + top bar + the page.
// <Outlet /> is where the current page shows up.
export default function AppShell({ theme, onToggleTheme }) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell-main">
        <Topbar theme={theme} onToggleTheme={onToggleTheme} />
        <main className="shell-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
