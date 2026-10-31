import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { copySharedSet, getSharedSet } from "../lib/sharedSets";

// A set a friend shared with a link: /s/:code
// Anyone can look. Saving a copy needs a login.
export default function SharedSet() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | ready | missing | error
  const [shared, setShared] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await getSharedSet(code);
      if (!result) {
        setStatus("missing");
        return;
      }
      setShared(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setStatus("loading");
    load();
  }

  async function handleSave() {
    if (saving) return;
    // Not logged in yet: log in first, then come back to this page.
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/s/${code}` } } });
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const newId = await copySharedSet(code);
      navigate(`/sets/${newId}`, { state: { saved: true } });
    } catch (err) {
      console.error(err);
      setSaveError(
        "We could not save a copy. The link may have been turned off. Please try again.",
      );
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="set-view">
        <p className="muted" aria-live="polite">
          Opening the shared set…
        </p>
      </main>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <main className="set-view">
        <section className="set-state">
          <h2>
            {status === "missing"
              ? "This link is not shared anymore"
              : "Hmm, that did not load"}
          </h2>
          <p className="muted">
            {status === "missing"
              ? "The owner may have turned sharing off. Ask your friend for a new link."
              : "Check your internet, then try again."}
          </p>
          <div className="set-success-actions">
            {status === "error" && (
              <button type="button" className="btn btn-primary" onClick={retry}>
                Try again
              </button>
            )}
            <Link to="/" className="btn">
              Go to Tuoniverse
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const cards = shared.cards || [];

  return (
    <main className="set-view">
      <header className="set-view-head">
        <p className="muted">A friend shared this set with you</p>
        <h1>{shared.title}</h1>
        {shared.description && <p className="muted">{shared.description}</p>}
        <p className="set-view-meta">
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </p>

        <div className="set-success-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving || authLoading}
            onClick={handleSave}
          >
            {saving
              ? "Saving…"
              : user
                ? "Save a copy to my sets"
                : "Log in to save a copy"}
          </button>
          {cards.length > 0 && (
            <Link to={`/s/${code}/flip`} className="btn">
              Practice with flip cards
            </Link>
          )}
          {cards.length > 1 && (
            <Link to={`/s/${code}/quiz`} className="btn">
              Practice with a quiz
            </Link>
          )}
          {cards.length > 0 && (
            <Link to={`/s/${code}/write`} className="btn">
              Practice by writing
            </Link>
          )}
          {cards.length > 1 && (
            <Link to={`/s/${code}/match`} className="btn">
              Practice by matching
            </Link>
          )}
          {cards.length > 3 && (
            <Link to={`/s/${code}/test`} className="btn">
              Practice with a test
            </Link>
          )}
        </div>
        <p className="muted shared-note">
          Your copy is yours. You can study it and change it. The original stays
          safe.
        </p>
        {saveError && (
          <p className="set-error" role="alert">
            {saveError}
          </p>
        )}
      </header>

      <section aria-label="Cards in this set">
        <h2 className="set-section-title set-cards-title">Cards</h2>
        {cards.length === 0 ? (
          <p className="muted">This set has no cards yet.</p>
        ) : (
          <ol className="set-terms">
            {cards.map((card, index) => (
              <li key={index} className="set-term-card">
                <span className="set-row-num" aria-hidden="true">
                  {index + 1}
                </span>
                <strong className="set-term-word">{card.term}</strong>
                <span className="set-term-def">{card.definition}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
