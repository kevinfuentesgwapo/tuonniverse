import { Link, Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

// Page for /goodbye. You land here after "Delete my account" worked.
// If someone is still logged in, there is nothing to say goodbye to:
// they go back to Home.
export default function Goodbye() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="page">
      <section className="set-state">
        <img
          className="set-state-planet"
          src="/favicon.svg"
          alt=""
          width="80"
          height="80"
        />
        <h1>Your account is deleted</h1>
        <p className="muted">
          Your sets, cards, notes and study history are gone. Thank you for
          studying with Tuoniverse. We are happy you were here.
        </p>
        <p className="muted">
          You are always welcome back. Making a new account only takes a minute.
        </p>
        <Link to="/" className="btn btn-primary">
          Back to home
        </Link>
      </section>
    </main>
  );
}
