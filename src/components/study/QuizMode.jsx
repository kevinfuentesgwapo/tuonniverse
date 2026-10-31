import { useCallback, useEffect, useRef, useState } from "react";
import useCardStars from "../../hooks/useCardStars";

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

// Makes the questions. "target" = cards to ask about.
// "pool" = all cards, used to find wrong answers.
// A card with no different answers to pick from is skipped.
function buildQuiz(target, pool) {
  const questions = [];
  for (const card of shuffle(target)) {
    const wrongs = [
      ...new Set(
        pool
          .filter((c) => c.id !== card.id && c.definition !== card.definition)
          .map((c) => c.definition),
      ),
    ];
    if (wrongs.length === 0) continue;
    const options = shuffle([card.definition, ...shuffle(wrongs).slice(0, 3)]);
    questions.push({ card, term: card.term, answer: card.definition, options });
  }
  return questions;
}

// Multiple choice quiz. Keys 1 to 4 pick an answer. Right arrow = next.
// onFinish(cardsDone) is called ONE time per round, when the round ends.
// canStar={false} hides the star buttons and the S key (used for shared sets).
export default function QuizMode({ cards, onFinish, canStar = true }) {
  const [questions, setQuestions] = useState(() => buildQuiz(cards, cards));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null); // number of the chosen option
  const [results, setResults] = useState([]); // { card, right }
  const [done, setDone] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saved | error
  const nextRef = useRef(null);
  const againRef = useRef(null);
  const savedRef = useRef(false);
  const {
    isStarred,
    toggle: toggleStar,
    error: starError,
  } = useCardStars(cards);

  const total = questions.length;
  const question = questions[index];

  const pick = useCallback(
    (i) => {
      if (!question || picked !== null) return;
      setPicked(i);
      setResults((list) => [
        ...list,
        { card: question.card, right: question.options[i] === question.answer },
      ]);
    },
    [question, picked],
  );

  const goNext = useCallback(() => {
    if (picked === null) return;
    if (index >= total - 1) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setPicked(null);
  }, [picked, index, total]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey || done || !question) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const number = Number(e.key);
      if (number >= 1 && number <= question.options.length) {
        e.preventDefault();
        pick(number - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (
        (e.key === "s" || e.key === "S") &&
        picked !== null &&
        canStar
      ) {
        e.preventDefault();
        toggleStar(question.card.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, canStar, question, picked, pick, goNext, toggleStar]);

  // After you answer, move focus to the Next button
  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);

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

  function startRound(nextQuestions) {
    setQuestions(nextQuestions);
    setIndex(0);
    setPicked(null);
    setResults([]);
    setDone(false);
    setSaveState("idle");
    savedRef.current = false;
  }

  function handleAgain() {
    startRound(buildQuiz(cards, cards));
  }

  function handleMissed() {
    const missedCards = results.filter((r) => !r.right).map((r) => r.card);
    const next = buildQuiz(missedCards, cards);
    if (next.length > 0) startRound(next);
  }

  // Not enough different answers to make a quiz
  if (total === 0) {
    return (
      <section className="set-state">
        <h2>We cannot make a quiz from these cards yet</h2>
        <p className="muted">
          A quiz needs at least 2 cards with different definitions. Add a few
          more cards, then try again.
        </p>
      </section>
    );
  }

  const score = results.filter((r) => r.right).length;
  const missed = results.filter((r) => !r.right);
  const answeredCount = done ? total : index + (picked !== null ? 1 : 0);
  const remaining = total - index - 1;
  const isLast = index >= total - 1;

  let doneMessage = "Good try! Every round helps the cards stick.";
  if (score === total) doneMessage = "A perfect round! Tuo is cheering.";
  else if (score / total >= 0.7)
    doneMessage = "Great job! Tuo is proud of you.";
  else if (score / total >= 0.4)
    doneMessage = "Nice work. Keep going, you are getting there.";

  return (
    <section className="qz" aria-label="Quiz">
      <div className="fc-bar-row">
        <div className="fc-bar-text">
          <span>
            {done ? "All done!" : `Question ${index + 1} of ${total}`}
          </span>
          <span className="muted">
            {done
              ? "Nice work"
              : remaining === 0
                ? "Last question!"
                : `${remaining} more to go`}
          </span>
        </div>
        <div
          className="fc-bar"
          role="progressbar"
          aria-label="Questions answered"
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

          {starError && (
            <p className="muted fc-save-note" role="status">
              {starError}
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
                    {canStar && (
                      <button
                        type="button"
                        className="set-star"
                        aria-pressed={isStarred(r.card.id)}
                        aria-label={
                          isStarred(r.card.id)
                            ? `Unstar ${r.card.term}`
                            : `Star ${r.card.term}`
                        }
                        onClick={() => toggleStar(r.card.id)}
                      >
                        <span aria-hidden="true">
                          {isStarred(r.card.id) ? "★" : "☆"}
                        </span>
                      </button>
                    )}
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
            <span className="fc-tag">Which definition matches this term?</span>
            <h2 className="qz-term">{question.term}</h2>
          </div>

          <div
            className="qz-options"
            role="group"
            aria-label="Choose the right definition"
          >
            {question.options.map((option, i) => {
              const answered = picked !== null;
              const isAnswer = option === question.answer;
              const isPicked = picked === i;
              let className = "qz-option";
              if (answered && isAnswer) className += " is-right";
              else if (answered && isPicked) className += " is-wrong";

              return (
                <button
                  key={i}
                  type="button"
                  className={className}
                  aria-disabled={answered}
                  onClick={() => pick(i)}
                >
                  <span className="qz-key" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="qz-opt-text">{option}</span>
                  {answered && isAnswer && (
                    <span className="qz-tag">Right answer</span>
                  )}
                  {answered && isPicked && !isAnswer && (
                    <span className="qz-tag">Your pick</span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="qz-feedback" role="status">
            {picked === null
              ? ""
              : results[results.length - 1]?.right
                ? "Yes, that is right!"
                : "Not quite. No worries, now you know."}
          </p>

          <div className="qz-footer">
            {picked !== null && (
              <>
                {canStar && (
                  <button
                    type="button"
                    className="btn fc-btn qz-star-btn"
                    aria-pressed={isStarred(question.card.id)}
                    onClick={() => toggleStar(question.card.id)}
                  >
                    <span aria-hidden="true">
                      {isStarred(question.card.id) ? "★" : "☆"}
                    </span>{" "}
                    {isStarred(question.card.id) ? "Starred" : "Star this card"}
                  </button>
                )}
                <button
                  type="button"
                  ref={nextRef}
                  className="btn btn-primary fc-btn"
                  onClick={goNext}
                >
                  {isLast ? "See my results" : "Next question"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </>
            )}
          </div>

          {starError && (
            <p className="muted fc-save-note" role="status">
              {starError}
            </p>
          )}

          <p className="muted fc-hint">
            On a keyboard: press 1 to {question.options.length} to answer
            {canStar
              ? ", the right arrow for the next question, and S to star a card"
              : " and the right arrow for the next question"}
            .
          </p>
        </>
      )}
    </section>
  );
}
