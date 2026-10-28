import { useEffect, useRef, useState } from "react";

// Confetti bits for the "all done" screen. Fixed values, nothing random.
const BITS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6 + 4) % 96}%`,
  delay: `${(i % 5) * 0.12}s`,
  spin: `${(i % 2 ? 1 : -1) * (360 + i * 30)}deg`,
  tone: `c${i % 4}`,
}));

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- Checking the answer ----------
// Ignore capital letters, accents, punctuation, and extra spaces.
function clean(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// How many letters are different between two texts?
function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

// Returns "exact", "close" (small typo), or "wrong".
function grade(typed, answer) {
  const t = clean(typed);
  const a = clean(answer);
  if (!a) return typed.trim() === answer.trim() ? "exact" : "wrong";
  if (t === a) return "exact";
  if (!t) return "wrong";
  // Short answers must be exact. Longer answers may have a few typos.
  const allowed =
    a.length <= 3 ? 0 : Math.min(5, Math.max(1, Math.floor(a.length * 0.15)));
  return distance(t, a) <= allowed ? "close" : "wrong";
}

// Write mode. Enter checks the answer. Shift+Enter makes a new line.
// onFinish(cardsDone) is called ONE time per round, when the round ends.
export default function WriteMode({ cards, onFinish }) {
  const [questions, setQuestions] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState(null); // null | exact | close | wrong | overridden
  const [results, setResults] = useState([]); // { card, right }
  const [done, setDone] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saved | error
  const inputRef = useRef(null);
  const nextRef = useRef(null);
  const againRef = useRef(null);
  const savedRef = useRef(false);

  const total = questions.length;
  const card = questions[index];
  const checked = status !== null;

  // Put the cursor in the box for each new question
  useEffect(() => {
    if (!done && status === null) inputRef.current?.focus();
  }, [index, status, done]);

  // After checking, move focus to the Next button
  useEffect(() => {
    if (status !== null && !done) nextRef.current?.focus();
  }, [status, done]);

  // When the "all done" screen shows, move focus to "Try again"
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

  function check() {
    if (checked || !card || typed.trim() === "") return;
    const result = grade(typed, card.definition);
    setStatus(result);
    setResults((list) => [...list, { card, right: result !== "wrong" }]);
  }

  function showAnswer() {
    if (checked || !card) return;
    setStatus("wrong");
    setResults((list) => [...list, { card, right: false }]);
  }

  // "I was right" button: the student can count a wrong check as right
  function countAsRight() {
    if (status !== "wrong") return;
    setStatus("overridden");
    setResults((list) =>
      list.map((r, i) => (i === list.length - 1 ? { ...r, right: true } : r)),
    );
  }

  function goNext() {
    if (!checked) return;
    if (index >= total - 1) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setTyped("");
    setStatus(null);
  }

  function onInputKey(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      check();
    }
  }

  function startRound(nextQuestions) {
    setQuestions(nextQuestions);
    setIndex(0);
    setTyped("");
    setStatus(null);
    setResults([]);
    setDone(false);
    setSaveState("idle");
    savedRef.current = false;
  }

  function handleAgain() {
    startRound(shuffle(cards));
  }

  function handleMissed() {
    const missedCards = results.filter((r) => !r.right).map((r) => r.card);
    if (missedCards.length > 0) startRound(shuffle(missedCards));
  }

  if (total === 0) return null;

  const score = results.filter((r) => r.right).length;
  const missed = results.filter((r) => !r.right);
  const answeredCount = done ? total : index + (checked ? 1 : 0);
  const remaining = total - index - 1;
  const isLast = index >= total - 1;

  let doneMessage = "Good try! Every round helps the cards stick.";
  if (score === total) doneMessage = "A perfect round! Tuo is cheering.";
  else if (score / total >= 0.7)
    doneMessage = "Great job! Tuo is proud of you.";
  else if (score / total >= 0.4)
    doneMessage = "Nice work. Keep going, you are getting there.";

  const feedback = {
    exact: "Perfect! That is right.",
    close: "So close! Just a tiny typo, so we counted it as right.",
    wrong: "Not quite. No worries, now you know.",
    overridden: "Got it. We counted it as right.",
  }[status];

  return (
    <section className="qz" aria-label="Write mode">
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
          aria-label="Cards answered"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
        >
          <span style={{ width: `${(answeredCount / total) * 100}%` }} />
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
          <h2>
            You got {score} of {total} right!
          </h2>
          <p className="muted">{doneMessage}</p>
          {saveState === "error" && (
            <p className="muted fc-save-note" role="status">
              We could not save this round, but you still did great.
            </p>
          )}

          {missed.length > 0 && (
            <div className="qz-missed">
              <h3>Worth another look</h3>
              <ul>
                {missed.map((r) => (
                  <li key={r.card.id}>
                    <strong>{r.card.term}</strong>
                    <span>{r.card.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="fc-done-actions">
            <button
              type="button"
              ref={againRef}
              className="btn btn-primary fc-btn"
              onClick={handleAgain}
            >
              Try again
            </button>
            {missed.length > 0 && (
              <button
                type="button"
                className="btn fc-btn"
                onClick={handleMissed}
              >
                Practice the missed ones
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="qz-card">
            <span className="fc-tag">Type the definition for this term</span>
            <h2 className="qz-term">{card.term}</h2>
          </div>

          <div className="wr-field">
            <label className="wr-label" htmlFor="write-answer">
              Your answer
            </label>
            <textarea
              id="write-answer"
              ref={inputRef}
              className="wr-input"
              rows={3}
              value={typed}
              readOnly={checked}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Type here, then press Enter"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          {!checked && (
            <div className="wr-actions">
              <button type="button" className="btn fc-btn" onClick={showAnswer}>
                Show me the answer
              </button>
              <button
                type="button"
                className="btn btn-primary fc-btn"
                onClick={check}
                disabled={typed.trim() === ""}
              >
                Check
              </button>
            </div>
          )}

          <p className="qz-feedback" role="status">
            {feedback || ""}
          </p>

          {checked && (
            <>
              {status !== "exact" && (
                <div className="wr-compare">
                  <div className="wr-box is-answer">
                    <span className="wr-box-tag">The answer</span>
                    <span>{card.definition}</span>
                  </div>
                </div>
              )}
              <div className="wr-actions">
                {status === "wrong" ? (
                  <button
                    type="button"
                    className="btn fc-btn"
                    onClick={countAsRight}
                  >
                    I was right
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  ref={nextRef}
                  className="btn btn-primary fc-btn"
                  onClick={goNext}
                >
                  {isLast ? "See my results" : "Next card"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          )}

          <p className="muted fc-hint">
            Capital letters and small typos are forgiven. Press Enter to check,
            or Shift+Enter for a new line.
          </p>
        </>
      )}
    </section>
  );
}
