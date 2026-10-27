import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="page notfound">
      <img
        className="notfound-planet"
        src="/favicon.svg"
        alt=""
        width="96"
        height="96"
      />
      <p className="notfound-code">404</p>
      <h1>Lost in space</h1>
      <p className="muted">
        We could not find this page. It may have moved, or the link is wrong.
      </p>
      <Link to="/" className="btn btn-primary">
        Back to Home
      </Link>
    </main>
  );
}
