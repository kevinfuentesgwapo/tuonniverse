import { Link } from "react-router-dom";
import useSharedSet from "../../hooks/useSharedSet";

// The frame for practicing a shared set: /s/:code/<mode>
// It handles loading, a missing link, errors, and "not enough cards".
// children is a function: children(cards) returns the study part.
// Practice mode never saves progress or stars.
export default function SharedStudyPage({
  code,
  heading,
  loadingText = "Getting the cards ready…",
  minCards = 1,
  tooFewTitle = "This set has no cards yet",
  tooFewText = "There is not enough to practice here yet.",
  children,
}) {
  const { status, shared, cards, retry } = useSharedSet(code);

  if (status === "loading") {
    return (
      <main className="set-view">
        <p className="muted" aria-live="polite">
          {loadingText}
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

  if (cards.length < minCards) {
    return (
      <main className="set-view">
        <section className="set-state">
          <h2>{tooFewTitle}</h2>
          <p className="muted">{tooFewText}</p>
          <div className="set-success-actions">
            <Link to={`/s/${code}`} className="btn btn-primary">
              Back to the shared set
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="set-view">
      <Link to={`/s/${code}`} className="set-back">
        ← Back to the shared set
      </Link>
      <header className="set-view-head">
        <h1>{heading}</h1>
        <p className="muted">{shared.title}</p>
      </header>

      <p className="set-notice" role="note">
        Practice mode: your progress and stars are not saved here.{" "}
        <Link to={`/s/${code}`}>Save a copy</Link> to keep them.
      </p>

      {children(cards)}
    </main>
  );
}
