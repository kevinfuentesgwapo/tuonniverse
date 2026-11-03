import { Link, useLocation } from "react-router-dom";

const CONTACT_EMAIL = "tuoniverse@gmail.com";

// A small, calm footer for logged-in pages.
export default function Footer() {
  // useLocation makes the footer update on every page, so the feedback email
  // always names the page the student is on.
  const { pathname, search } = useLocation();
  const page = `${window.location.origin}${pathname}${search}`;
  const feedbackLink = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "Tuoniverse feedback",
  )}&body=${encodeURIComponent(
    `Hi Tuoniverse team!\n\nWhat happened, or what idea do you have?\n\n\nWhat did you expect?\n\n\n(Page: ${page})\n`,
  )}`;

  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="Legal and help">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <a href={feedbackLink}>Feedback</a>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
      </nav>
      <p className="site-footer-note">Made for students. Free, always.</p>
    </footer>
  );
}
