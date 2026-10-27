import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useAuth from "../hooks/useAuth";
import { friendlyAuthError } from "../lib/authErrors";

export default function ResetPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waited, setWaited] = useState(false);

  // Did the email link come back with an error? (expired or used)
  const linkError =
    window.location.hash.includes("error") ||
    window.location.search.includes("error");

  // Give Supabase 2 seconds to read the link before we say "expired".
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // After success, go Home.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/", { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [done, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // Still checking the link.
  if (!linkError && (loading || (!user && !waited))) {
    return (
      <main className="page form-page">
        <p className="muted">Checking your link…</p>
      </main>
    );
  }

  // No session or bad link.
  if (linkError || !user) {
    return (
      <main className="page form-page">
        <h1>Link did not work</h1>
        <p className="muted">
          This reset link is old or already used. Please ask for a new one.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/login", { replace: true })}
        >
          Back to log in
        </button>
      </main>
    );
  }

  // Success.
  if (done) {
    return (
      <main className="page form-page">
        <h1>Password changed</h1>
        <p className="form-message" role="status">
          All done. Taking you home…
        </p>
      </main>
    );
  }

  // The form.
  return (
    <main className="page form-page">
      <h1>Choose a new password</h1>
      <p className="muted">Type a new password for your account.</p>

      <form onSubmit={handleSubmit} className="form" aria-busy={busy}>
        <label htmlFor="new-password">New password</label>
        <div className="password-wrap">
          <input
            id="new-password"
            type={showPw ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="show-btn"
            onClick={() => setShowPw(!showPw)}
            aria-pressed={showPw}
            aria-label="Show password"
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        <p className="hint">Use at least 8 characters.</p>

        <label htmlFor="confirm-password">Type it again</label>
        <input
          id="confirm-password"
          type={showPw ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}
