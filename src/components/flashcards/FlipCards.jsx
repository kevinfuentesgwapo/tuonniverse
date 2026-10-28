import { useCallback, useEffect, useRef, useState } from "react";

// Confetti bits for the "all done" screen. Fixed values, nothing random.
const BITS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6 + 4) % 96}%`,
  delay: `${(i % 5) * 0.12}s`,
  spin: `${(i % 2 ? 1 : -1) * (360 + i * 30)}deg`,
  tone: `c${i % 4}`,
}));

const inOrder = (length) => Array.from({ length }, (_, i) => i);

function shuffleOrder(length) {
  const order = inOrder(length);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// Flip cards. Space = flip. Left and right arrows = back and next. S = star.
// onFinish(cardsDone) is called ONE time per round, when the last card is done.
// onToggleStar(cardId, starred) saves a star. It may throw.
export default function FlipCards({ cards, onFinish, onToggleStar }) {
  const total = cards.length;
  const [order, setOrder] = useState(() => inOrder(total));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [done, setDone] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saved | error
  const [starMap, setStarMap] = useState(() =>
    Object.fromEntries(cards.map((c) => [c.id, !!c.starred])),
  );
  const [starError, setStarError] = useState("");
  const cardRef = useRef(null);
  const againRef = useRef(null);
  const savedRef = useRef(false);

  const card = cards[order[index]]; // undefined only when there are no cards

  const flip = useCallback(() => setFlipped((f) => !f), []);

  const goNext = useCallback(() => {
    if (index >= total - 1) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setFlipped(false);
  }, [index, total]);

  const goBack = useCallback(() => {
    if (done) {
      setDone(false);
      setFlipped(false);
      return;
    }
    if (index > 0) {
      setIndex(index - 1);
      setFlipped(false);
    }
  }, [done, index]);

  // Star or un-star the card on screen. Shows the change right away,
  // and puts it back if saving fails.
  const toggleStar = useCallback(async () => {
    if (!card) return;
    const id = card.id;
    const next = !starMap[id];
    setStarMap((m) => ({ ...m, [id]: next }));
    setStarError("");
    try {
      await onToggleStar?.(id, next);
    } catch (err) {
      console.error(err);
      setStarMap((m) => ({ ...m, [id]: !next }));
      setStarError("We could not save the star. Please try again.");
    }
  }, [card, starMap, onToggleStar]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!done) goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "s" || e.key === "S") {
        if (done) return;
        e.preventDefault();
        toggleStar();
      } else if (e.key === " ") {
        // On a button or link, Space already does its normal job
        if (tag === "BUTTON" || tag === "A" || done) return;
        e.preventDefault();
        flip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, goNext, goBack, flip, toggleStar]);

  // When the "all done" screen shows, move focus to "Go again"
  useEffect(() => {
    if (done) againRef.current?.focus();
  }, [done]);

  // Save the round one time when it is finished
  useEffect(() => {
    if (!done || savedRef.current) return;
    savedRef.current = true;
    if (!onFinish) return;
    Promise.resolve()
      .then(() => onFinish(total))
      .then(() => setSaveState("saved"))
      .catch((err) => {
        console.error(err);
        setSaveState("error");
      });
  }, [done, total, onFinish]);

  function handleNext() {
    goNext();
    cardRef.current?.focus();
  }

  function handleBack() {
    goBack();
    cardRef.current?.focus();
  }

  function handleShuffle() {
    const next = !shuffled;
    setShuffled(next);
    setOrder(next ? shuffleOrder(total) : inOrder(total));
    setIndex(0);
    setFlipped(false);
    setDone(false);
    cardRef.current?.focus();
  }

  function handleAgain() {
    if (shuffled) setOrder(shuffleOrder(total));
    savedRef.current = false;
    setSaveState("idle");
    setIndex(0);
    setFlipped(false);
    setDone(false);
  }

  if (total === 0) return null;

  const isStarred = !!starMap[card.id];
  const remaining = total - index - 1;
  const shownCount = done ? total : index + 1;
  const percent = (shownCount / total) * 100;

  return (
    <section className="fc" aria-label="Flashcards">
      <div className="fc-bar-row">
        <div className="fc-bar-text">
          <span>{done ? "All done!" : `Card ${index + 1} of ${total}`}</span>
          <span className="muted">
            {done
              ? "Nice work"
              : remaining === 0
                ? "Last card!"
                : `${remaining} more to go`}
          </span>
        </div>
        <div
          className="fc-bar"
          role="progressbar"
          aria-label="Cards seen"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={shownCount}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      {done ? (
        <div className="fc-done">
          <div className="fc-confetti" aria-hidden="true">
            {BITS.map((bit, i) => (
              <span
                key={i}
                className={`fc-bit ${bit.tone}`}
                style={{
                  left: bit.left,
                  animationDelay: bit.delay,
                  "--spin": bit.spin,
                }}
              />
            ))}
          </div>
          <img
            className="fc-planet"
            src="/favicon.svg"
            alt=""
            width="64"
            height="64"
          />
          <h2>You went through all {total} cards!</h2>
          <p className="muted">Great job. Tuo is proud of you.</p>
          {saveState === "error" && (
            <p className="muted fc-save-note" role="status">
              We could not save this round, but you still did great.
            </p>
          )}
          <div className="fc-done-actions">
            <button
              type="button"
              ref={againRef}
              className="btn btn-primary fc-btn"
              onClick={handleAgain}
            >
              Go again
            </button>
            <button type="button" className="btn fc-btn" onClick={goBack}>
              Back to the last card
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            ref={cardRef}
            className={`fc-card${flipped ? " is-flipped" : ""}`}
            onClick={flip}
          >
            <span className="fc-inner">
              <span className="fc-face fc-front" aria-hidden={flipped}>
                <span className="fc-tag">Term</span>
                <span className="fc-text">{card.term}</span>
              </span>
              <span className="fc-face fc-back" aria-hidden={!flipped}>
                <span className="fc-tag">Definition</span>
                <span className="fc-text">{card.definition}</span>
              </span>
            </span>
          </button>

          <div className="fc-star-row">
            <button
              type="button"
              className="btn fc-btn"
              onClick={toggleStar}
              aria-pressed={isStarred}
            >
              <span aria-hidden="true">{isStarred ? "★" : "☆"}</span>{" "}
              {isStarred ? "Starred" : "Star this card"}
            </button>
          </div>
          {starError && (
            <p className="muted fc-save-note" role="status">
              {starError}
            </p>
          )}

          <div className="fc-controls">
            <button
              type="button"
              className="btn fc-btn"
              onClick={handleShuffle}
              aria-pressed={shuffled}
            >
              {shuffled ? "Shuffle: on" : "Shuffle"}
            </button>
            <div className="fc-nav">
              <button
                type="button"
                className="btn fc-btn"
                onClick={handleBack}
                disabled={index === 0}
              >
                <span aria-hidden="true">←</span> Back
              </button>
              <button
                type="button"
                className="btn btn-primary fc-btn"
                onClick={handleNext}
              >
                {remaining === 0 ? "Finish" : "Next"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <p className="muted fc-hint">
            Tap the card to flip it. On a keyboard: Space flips, arrow keys
            move, S stars the card.
          </p>
        </>
      )}

      <p className="fc-sr" aria-live="polite">
        {done
          ? "You finished all the cards."
          : `Card ${index + 1} of ${total}. Showing the ${flipped ? "definition" : "term"}.`}
      </p>
    </section>
  );
}
