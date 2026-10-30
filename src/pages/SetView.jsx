import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/ui/Icon";
import { deleteSet, getSet, setSharing } from "../hooks/useSets";
import { setCardStarred } from "../lib/starCards";
import { downloadCardsCsv } from "../lib/exportCards";

// Study modes. A mode gets a "path" when we build it.
// "min" = the fewest cards it needs (default 1).
const MODES = [
  { label: "Flip cards", icon: "study", path: "flip" },
  { label: "Quiz", icon: "target", path: "quiz", min: 2 },
  { label: "Write", icon: "notes", path: "write" },
  { label: "Match", icon: "bulb", path: "match", min: 2 },
  { label: "Test", icon: "sparkles", path: "test", min: 4 },
];

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SetView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justSaved = Boolean(location.state?.saved);
  const [status, setStatus] = useState("loading"); // loading | ready | missing | error
  const [data, setData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [starError, setStarError] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getSet(id);
      if (!result) {
        setStatus("missing");
        return;
      }
      setData(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setStatus("loading");
    load();
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteSet(id);
      navigate("/sets", { replace: true });
    } catch (err) {
      console.error(err);
      setDeleteError("We could not delete this set. Please try again.");
      setDeleting(false);
    }
  }

  // Shows the new star right away. Puts it back if saving fails.
  function showStar(cardId, starred) {
    setData((d) => ({
      ...d,
      cards: d.cards.map((c) => (c.id === cardId ? { ...c, starred } : c)),
    }));
  }

  async function toggleStar(card) {
    const next = !card.starred;
    showStar(card.id, next);
    setStarError("");
    try {
      await setCardStarred(card.id, next);
    } catch (err) {
      console.error(err);
      showStar(card.id, !next);
      setStarError("We could not save that star. Please try again.");
    }
  }

  // Turn the share link on or off.
  async function toggleSharing(on) {
    if (shareBusy) return;
    setShareBusy(true);
    setShareError("");
    setCopied(false);
    try {
      const code = await setSharing(id, on);
      setData((d) => ({ ...d, set: { ...d.set, share_code: code } }));
    } catch (err) {
      console.error(err);
      setShareError("We could not change sharing. Please try again.");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyLink(link) {
    setShareError("");
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error(err);
      setShareError(
        "We could not copy it. Select the link and copy it by hand.",
      );
    }
  }

  if (status === "loading") {
    return (
      <main className="set-view">
        <p className="muted" aria-live="polite">
          Opening your set…
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
              ? "We could not find this set"
              : "Hmm, that did not load"}
          </h2>
          <p className="muted">
            {status === "missing"
              ? "It may have been deleted. Your other sets are safe."
              : "Check your internet, then try again."}
          </p>
          <div className="set-success-actions">
            {status === "error" && (
              <button type="button" className="btn btn-primary" onClick={retry}>
                Try again
              </button>
            )}
            <Link to="/sets" className="btn">
              Back to my sets
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { set, cards } = data;
  const shareLink = set.share_code
    ? `${window.location.origin}/s/${set.share_code}`
    : "";
  const starredCount = cards.filter((c) => c.starred).length;
  // If the last star is removed, "only starred" turns itself off.
  const onlyStarred = starredOnly && starredCount > 0;
  const usable = onlyStarred ? starredCount : cards.length;

  return (
    <main className="set-view">
      <Link to="/sets" className="set-back">
        ← My sets
      </Link>

      <header className="set-view-head">
        <h1>{set.title}</h1>
        {set.description && <p className="muted">{set.description}</p>}
        <p className="set-view-meta">
          {cards.length} {cards.length === 1 ? "card" : "cards"} · Made{" "}
          {formatDate(set.created_at)}
        </p>
        {starredCount > 0 && (
          <p className="muted">
            <span aria-hidden="true">★</span> {starredCount} starred
          </p>
        )}
        {justSaved && (
          <p className="set-notice" role="status">
            Saved! Your changes are in.
          </p>
        )}
        <Link to={`/sets/${id}/edit`} className="btn">
          Edit set
        </Link>
      </header>

      <section aria-label="Study modes">
        <h2 className="set-section-title">Study this set</h2>

        <label className={`star-only${starredCount === 0 ? " is-off" : ""}`}>
          <input
            type="checkbox"
            checked={onlyStarred}
            disabled={starredCount === 0}
            onChange={(e) => setStarredOnly(e.target.checked)}
          />
          Study only my starred cards ({starredCount})
        </label>
        {starredCount === 0 && cards.length > 0 && (
          <p className="muted star-hint">
            Tap the star on a hard card below. Then you can practice just those.
          </p>
        )}

        <div className="set-modes">
          {MODES.map((mode) => {
            const need = mode.min ?? 1;
            const ready = mode.path && usable >= need;
            const inside = (
              <>
                <span className="home-icon" aria-hidden="true">
                  <Icon name={mode.icon} size={22} />
                </span>
                <strong>{mode.label}</strong>
                <span className="home-badge">
                  {ready
                    ? "Start"
                    : mode.path
                      ? onlyStarred
                        ? `Needs ${need} starred`
                        : need > 1
                          ? `Needs ${need} cards`
                          : "Add cards first"
                      : "Opening soon"}
                </span>
              </>
            );
            return ready ? (
              <Link
                key={mode.label}
                to={`/sets/${id}/${mode.path}${onlyStarred ? "?starred=1" : ""}`}
                className="set-mode"
              >
                {inside}
              </Link>
            ) : (
              <div key={mode.label} className="set-mode">
                {inside}
              </div>
            );
          })}
        </div>
      </section>

      <section className="set-panel share-box" aria-label="Share this set">
        <h2 className="set-section-title">Share this set</h2>
        {!set.share_code ? (
          <>
            <p className="muted">
              Only you can see this set. Turn on sharing to get a link for your
              friends. They can study it and save their own copy. They can never
              change your set.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={shareBusy}
              onClick={() => toggleSharing(true)}
            >
              {shareBusy ? "Please wait…" : "Turn on sharing"}
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Anyone with this link can study this set. Turn sharing off to stop
              the link from working.
            </p>
            <div className="share-row">
              <input
                className="set-input share-link"
                type="text"
                readOnly
                value={shareLink}
                aria-label="Share link"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyLink(shareLink)}
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={shareBusy}
                onClick={() => toggleSharing(false)}
              >
                {shareBusy ? "Please wait…" : "Turn off sharing"}
              </button>
            </div>
            <p className="muted" role="status" aria-live="polite">
              {copied ? "Link copied. Send it to a friend!" : ""}
            </p>
          </>
        )}
        {shareError && (
          <p className="set-error" role="status">
            {shareError}
          </p>
        )}
      </section>

      <section aria-label="Cards in this set">
        <h2 className="set-section-title set-cards-title">Cards</h2>
        <div className="set-success-actions">
          <button
            type="button"
            className="btn"
            disabled={cards.length === 0}
            onClick={() => downloadCardsCsv(set.title, cards)}
          >
            Download cards (CSV)
          </button>
        </div>
        {starError && (
          <p className="set-error" role="status">
            {starError}
          </p>
        )}
        {cards.length === 0 ? (
          <p className="muted">This set has no cards yet.</p>
        ) : (
          <ol className="set-terms">
            {cards.map((card, index) => (
              <li key={card.id} className="set-term-card">
                <span className="set-row-num" aria-hidden="true">
                  {index + 1}
                </span>
                <strong className="set-term-word">{card.term}</strong>
                <span className="set-term-def">{card.definition}</span>
                <button
                  type="button"
                  className="set-star"
                  aria-pressed={!!card.starred}
                  aria-label={
                    card.starred ? `Unstar ${card.term}` : `Star ${card.term}`
                  }
                  onClick={() => toggleStar(card)}
                >
                  <span aria-hidden="true">{card.starred ? "★" : "☆"}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="set-danger" aria-label="Delete this set">
        {!confirming ? (
          <button
            type="button"
            className="btn set-delete"
            onClick={() => setConfirming(true)}
          >
            Delete set
          </button>
        ) : (
          <div className="set-confirm" role="alert">
            <p>
              Delete “{set.title}” and its {cards.length}{" "}
              {cards.length === 1 ? "card" : "cards"}? This cannot be undone.
            </p>
            <div className="set-success-actions">
              <button
                type="button"
                className="btn set-delete"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Yes, delete it"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deleting}
                onClick={() => setConfirming(false)}
              >
                Keep it
              </button>
            </div>
            {deleteError && <p className="set-error">{deleteError}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
