import { Link } from "react-router-dom";

// The Tuoniverse logo: your planet icon + the name.
// <Logo />                          -> link to Home (Navbar)
// <Logo asLink={false} size="lg" /> -> big, no link (hero areas)
export default function Logo({ asLink = true, size = "md" }) {
  const className = `logo logo-${size}`;

  const content = (
    <>
      <img
        className="logo-mark"
        src="/favicon.svg"
        alt=""
        width="40"
        height="40"
      />
      <span className="logo-text">Tuoniverse</span>
    </>
  );

  if (!asLink) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link to="/" className={className} aria-label="Tuoniverse home">
      {content}
    </Link>
  );
}
