import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import useAuth from "../hooks/useAuth";
import { friendlyAuthError } from "../lib/authErrors";
import Logo from "../components/brand/Logo";

const AFTER_KEY = "tuoniverse-after-login";

// Email + password login is OFF for now.
// Supabase's free email sender only reaches our own team, so sign-up and
// reset emails would not arrive for students. Turn this on when we have
// our own email sender. Google and Facebook login work without email.
const EMAIL_LOGIN = false;

// Only allow paths inside our own app (safety).
const safePath = (p) =>
  typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/";
const readAfter = () => {
  try {
    return sessionStorage.getItem(AFTER_KEY);
  } catch {
    return null;
  }
};
const saveAfter = (p) => {
  try {
    sessionStorage.setItem(AFTER_KEY, p);
  } catch {
    /* ignore */
  }
};
const clearAfter = () => {
  try {
    sessionStorage.removeItem(AFTER_KEY);
  } catch {
    /* ignore */
  }
};

const TEXT = {
  login: {
    title: "Welcome back",
    sub: "Log in to open your study universe.",
    button: "Log in",
  },
  signup: {
    title: "Join Tuoniverse",
    sub: "Make a free account in a few seconds.",
    button: "Create account",
  },
  forgot: {
    title: "Reset your password",
    sub: "Type your email. We will send you a link.",
    button: "Send reset link",
  },
};

const EMOJI = { login: "👋", signup: "🚀", forgot: "🔑" };

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"
      />
    </svg>
  );
}

export default function Login() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState("login"); // 'login', 'signup' or 'forgot'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds before we allow another email

  // Where to go after login: the page they wanted, or Home.
  const goTo = safePath(location.state?.from?.pathname || readAfter());

  // 1. If the browser brings this page back (Back button), clear "busy".
  useEffect(() => {
    const reset = (e) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // 2. If Google or Facebook sent us back with an error, show a friendly message.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search);
    const problem =
      hash.get("error_description") ||
      search.get("error_description") ||
      hash.get("error") ||
      search.get("error");
    if (problem) {
      console.warn("Sign-in problem:", problem);
      setError(
        "Sign-in did not finish. Please try again, or use another way to sign in.",
      );
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // 3. Count down the wait time for sending emails.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // 4. Once logged in, forget the saved page.
  useEffect(() => {
    if (user) clearAfter();
  }, [user]);

  if (!loading && user) return <Navigate to={goTo} replace />;

  const clearNotes = () => {
    setError("");
    setMessage("");
    setCanResend(false);
  };

  function changeMode(next) {
    setMode(next);
    clearNotes();
    setCooldown(0);
    setShowPw(false);
  }

  // Google or Facebook
  async function handleOAuth(provider) {
    clearNotes();
    setBusy(true);
    saveAfter(goTo); // remember the page, because we leave the site for a moment
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/login`,
          // Google: always show "Choose an account" (safe on shared computers).
          ...(provider === "google"
            ? { queryParams: { prompt: "select_account" } }
            : {}),
        },
      });
      if (err) throw err;
      // On success the browser leaves this page.
    } catch (err) {
      console.error(err);
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearNotes();
    const cleanEmail = email.trim().toLowerCase();

    if (mode === "signup" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          },
        );
        if (err) throw err;
        // Same message whether or not the email exists (this protects privacy).
        setMessage(
          "If an account uses that email, we sent a reset link. Check your inbox and spam folder.",
        );
        setCooldown(60);
      } else if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (err) {
          if (err.message?.toLowerCase().includes("not confirmed"))
            setCanResend(true);
          throw err;
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (err) throw err;
        if (data.user && data.user.identities?.length === 0) {
          setError("This email already has an account. Try logging in.");
        } else if (!data.session) {
          setMessage("Check your email to confirm your account, then log in.");
          setCanResend(true);
          setCooldown(60);
        }
      }
    } catch (err) {
      console.error(err);
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false); // "Please wait" always turns off
    }
  }

  async function handleResend() {
    setError("");
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (err) throw err;
      setMessage("We sent a new email. Check your inbox and spam folder.");
      setCooldown(60);
    } catch (err) {
      console.error(err);
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const text = TEXT[mode];
  const waiting = mode === "forgot" && cooldown > 0;

  return (
    <main className="page auth-page">
      {/* Left side: fun hero */}
      <section className="auth-hero" aria-label="About Tuoniverse">
        <div>
          <Logo asLink={false} size="lg" />
        </div>
        <h2>
          Study smarter. <span className="gradient-text">Have fun.</span>
        </h2>
        <p>
          Make flashcards, take quizzes, and let AI turn your notes into cards.
          100% free.
        </p>

        <div className="flip" aria-hidden="true">
          <div className="flip-inner">
            <div className="flip-face flip-front">
              What is the powerhouse of the cell?
            </div>
            <div className="flip-face flip-back">Mitochondria 🔋</div>
          </div>
        </div>

        <div className="chips">
          <span className="chip">🃏 Flashcards</span>
          <span className="chip">🧠 Quiz</span>
          <span className="chip">✍️ Write mode</span>
          <span className="chip">🤖 AI cards</span>
        </div>
      </section>

      {/* Right side: form card */}
      <section className="auth-card">
        <span className="auth-emoji" aria-hidden="true">
          {EMOJI[mode]}
        </span>
        <h1>{text.title}</h1>
        <p className="muted">{text.sub}</p>

        {mode !== "forgot" && (
          <>
            <div className="oauth-stack">
              <button
                type="button"
                className="oauth-btn"
                onClick={() => handleOAuth("google")}
                disabled={busy}
              >
                <GoogleIcon /> Continue with Google
              </button>
              <button
                type="button"
                className="oauth-btn oauth-facebook"
                onClick={() => handleOAuth("facebook")}
                disabled={busy}
              >
                <FacebookIcon /> Continue with Facebook
              </button>
            </div>
            {EMAIL_LOGIN ? (
              <div className="divider" role="separator">
                <span>or</span>
              </div>
            ) : (
              <p className="muted">Email sign-up is coming soon.</p>
            )}
          </>
        )}

        {EMAIL_LOGIN && (
          <form onSubmit={handleSubmit} className="form" aria-busy={busy}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {mode !== "forgot" && (
              <>
                <label htmlFor="password">Password</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
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
                {mode === "signup" && (
                  <p className="hint">Use at least 8 characters.</p>
                )}
                {mode === "login" && (
                  <div className="forgot-row">
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => changeMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={busy || waiting}
            >
              {busy
                ? "Please wait…"
                : waiting
                  ? `Wait ${cooldown}s`
                  : text.button}
            </button>

            {canResend && mode !== "forgot" && (
              <button
                type="button"
                className="btn"
                onClick={handleResend}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </button>
            )}
          </form>
        )}

        {EMAIL_LOGIN && (
          <p className="muted">
            {mode === "login" && (
              <>
                New here?{" "}
                <button
                  className="link-button"
                  type="button"
                  onClick={() => changeMode("signup")}
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  className="link-button"
                  type="button"
                  onClick={() => changeMode("login")}
                >
                  Log in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button
                className="link-button"
                type="button"
                onClick={() => changeMode("login")}
              >
                Back to log in
              </button>
            )}
          </p>
        )}

        <p className="muted terms">
          By continuing, you agree to use Tuoniverse for studying and not to
          share private information.
        </p>
      </section>
    </main>
  );
}
