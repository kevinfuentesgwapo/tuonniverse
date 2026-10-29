import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { saveProgress } from "../../lib/cardProgress";
import { saveStudySession } from "../../lib/studySessions";

// How long until a card comes back, in kid words.
function dayText(days) {
  if (days <= 1) return "1 day";
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return months <= 1 ? "1 month" : `${months} months`;
}

// A little confetti for the finish screen. Hidden when the student wants calm.
function Confetti() {
  return (
    <div className="fc-confetti" aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className={`fc-bit c${i % 4}`}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 6) * 0.12}s`,
            "--spin": `${(i % 2 ? 1 : -1) * (180 + ((i * 53) % 360))}deg`,
          }}
        />
      ))}
    </div>
  );
}

// One review round. The deck is the list of cards still to show.
// A card marked "Still learning" is added to the end, so the student sees it
// again in a moment. That second look does not change its schedule.
export default function ReviewSession({ queue, userId, hasMore, onMore }) {
  const total = queue.length;
  const [deck, setDeck] = useState(queue);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [answered, setAnswered] = useState({}); // cardId -> setId, each card once
  const [hard, setHard] = useState({}); // cardId -> true, marked "Still learning"
  const [streakFailed, setStreakFailed] = useState(false);
  const savedRound = useRef(false);

  const item = deck[pos];
  const finished = pos >= deck.length;
  const doneCount = Object.keys(answered).length;

  const answer = useCallback(
    async (rating) => {
      if (!item || !flipped || saving) return;
      setSaving(true);
      setError("");

      let next = null;
      try {
        // Only the first look at a card changes its schedule.
        if (!item.retry) {
          next = await saveProgress({ userId, item, rating });
        }
      } catch (err) {
        setError(err.message);
        setSaving(false);
        return;
      }

      setAnswered((a) =>
        a[item.cardId] ? a : { ...a, [item.cardId]: item.setId },
      );

      if (rating === "again") {
        setHard((h) => ({ ...h, [item.cardId]: true }));
        setDeck((d) => [...d, { ...item, retry: true }]);
        setNote("No worries. Tuo will show it again in a moment.");
      } else if (next) {
        setNote(
          `${rating === "easy" ? "Nice!" : "Got it!"} It comes back in ${dayText(next.interval_days)}.`,
        );
      } else {
        setNote("You remembered it this time. Great job!");
      }

      setFlipped(false);
      setPos((p) => p + 1);
      setSaving(false);
    },
    [item, flipped, saving, userId],
  );

  // Keys 1, 2, 3 answer once the card is flipped.
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "1") answer("again");
      else if (e.key === "2") answer("good");
      else if (e.key === "3") answer("easy");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  // When the round ends, save it once (one session per set) for the streak.
  useEffect(() => {
    if (!finished || savedRound.current) return;
    savedRound.current = true;
    const perSet = {};
    Object.values(answered).forEach((setId) => {
      perSet[setId] = (perSet[setId] || 0) + 1;
    });
    Promise.allSettled(
      Object.entries(perSet).map(([setId, cardsDone]) =>
        saveStudySession({ userId, setId, mode: "flashcards", cardsDone }),
      ),
    ).then((results) => {
      if (results.some((r) => r.status === "rejected")) setStreakFailed(true);
    });
  }, [finished, answered, userId]);

  if (finished) {
    const hardCount = Object.keys(hard).length;
    return (
      <section className="fc-done" aria-live="polite">
        <Confetti />
        <img className="fc-planet" src="/favicon.svg" alt="" />
        <h2>Nice work!</h2>
        <p>
          You reviewed {doneCount} {doneCount === 1 ? "card" : "cards"}.
        </p>
        {hardCount > 0 && (
          <p className="muted">
            {hardCount === 1
              ? "1 card needs a little more practice. It comes back tomorrow."
              : `${hardCount} cards need a little more practice. They come back tomorrow.`}
          </p>
        )}
        {streakFailed && (
          <p className="muted">
            Your cards are saved, but Tuo could not add this round to your
            streak.
          </p>
        )}
        <div className="fc-done-actions">
          {hasMore && (
            <button type="button" className="btn btn-primary" onClick={onMore}>
              Review more
            </button>
          )}
          <Link to="/" className={hasMore ? "btn" : "btn btn-primary"}>
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="fc rv">
      <div className="fc-bar-row">
        <div className="fc-bar-text">
          <span>
            {doneCount} of {total} done
          </span>
          <span>{deck.length - pos} to go</span>
        </div>
        <div
          className="fc-bar"
          role="progressbar"
          aria-label="Review progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <p className="rv-meta">
        <span>{item.setTitle}</span>
        <span className="rv-badge">
          {item.retry ? "Another look" : item.progress ? "Review" : "New card"}
        </span>
      </p>

      <button
        type="button"
        className={`fc-card${flipped ? " is-flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        disabled={saving}
        aria-label={
          flipped
            ? "Showing the answer. Press to see the question again."
            : "Show the answer"
        }
      >
        <span className="fc-inner">
          <span className="fc-face fc-front">
            <span className="fc-tag">Term</span>
            <span className="fc-text">{item.term}</span>
          </span>
          <span className="fc-face fc-back">
            <span className="fc-tag">Definition</span>
            <span className="fc-text">{item.definition}</span>
          </span>
        </span>
      </button>

      <p className="fc-sr" aria-live="polite">
        {flipped ? `Answer: ${item.definition}` : `Question: ${item.term}`}
      </p>

      {note && <p className="rv-note">{note}</p>}
      {error && (
        <p className="rv-error" role="alert">
          {error}
        </p>
      )}

      {flipped ? (
        <div className="rv-answers">
          <button
            type="button"
            className="btn fc-btn"
            onClick={() => answer("again")}
            disabled={saving}
          >
            Still learning
            <span className="rv-key">press 1</span>
          </button>
          <button
            type="button"
            className="btn btn-primary fc-btn"
            onClick={() => answer("good")}
            disabled={saving}
          >
            Got it
            <span className="rv-key">press 2</span>
          </button>
          <button
            type="button"
            className="btn fc-btn"
            onClick={() => answer("easy")}
            disabled={saving}
          >
            Too easy
            <span className="rv-key">press 3</span>
          </button>
        </div>
      ) : (
        <div className="rv-answers rv-answers-one">
          <button
            type="button"
            className="btn btn-primary fc-btn"
            onClick={() => setFlipped(true)}
          >
            Show answer
          </button>
        </div>
      )}

      <p className="fc-hint muted">
        Think of the answer first. Then flip the card and tell Tuo how it went.
      </p>
    </div>
  );
}
