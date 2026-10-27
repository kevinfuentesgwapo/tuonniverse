import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

// Wrap any page that needs a logged-in student.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still checking who you are.
  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  // Not logged in: go to login. Remember the page they wanted.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
