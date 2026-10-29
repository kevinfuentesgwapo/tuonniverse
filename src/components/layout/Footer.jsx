import { Link } from "react-router-dom";

// A small, calm footer for logged-in pages.
export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Legal and help">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href="mailto:tuoniverse@gmail.com">Contact</a>
      </nav>
      <p className="site-footer-note">Made for students. Free, always.</p>
    </footer>
  );
}
