import { useCallback, useEffect, useRef, useState } from "react";
import useCardStars from "../../hooks/useCardStars";
import {
  buildTest,
  describeAnswer,
  gradeQuestion,
  isAnswered,
} from "../../lib/testQuestions";
import "../../styles/test.css";

// Confetti bits for the "all done" screen. Fixed values, nothing random.
const BITS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 6 + 4) % 96}%`,
  delay: `${(i % 5) * 0.12}s`,
  spin: `${(i % 2 ? 1 : -1) * (360 + i * 30)}deg`,
  tone: `c${i % 4}`,
}));

const KIND_LABEL = {
  mc: "Multiple choice",
  tf: "True or false",
  write: "Type the answer",
};

// Test mode: a mix of question types. No answers are shown until the end.
// Keys 1 to 4 pick an answer. Left and right arrows move between questions.
// onFinish(cardsDone) is called ONE time per test, when it is finished.
export default function TestMode({ cards, onFinish }) {
  const [questions, setQuestions] = useState(() => buildTest(cards));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question number -> answer
  const [phase, setPhase] = useState("test"); // test | confirm | done
  const [results, setResults] = useState([]); // { question, answer, right, close }
  const [saveState, setSaveState] = useState("idle"); // idle | saved | error
  const inputRef = useRef(null);
  const againRef = useRef(null);
  const savedRef = useRef(false);
  const {
    isStarred,
    toggle: toggleStar,
    error: starError,
  } = useCardStars(cards);

  const total = questions.length;
  const question = questions[index];
  const answeredCount = questions.filter((_, i) =>
    isAnswered(answers[i]),
  ).length;
  const unanswered = total - answeredCount;

  const setAnswer = useCallback(
    (value) => {
      setAnswers((a) => ({ ...a, [index]: value }));
      setPhase((p) => (p === "confirm" ? "test" : p));
    },
    [index],
  );

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1));
    setPhase((p) => (p === "confirm" ? "test" : p));
  }, [total]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
    setPhase((p) => (p === "confirm" ? "test" : p));
  }, []);

  function finish() {
    setResults(
      questions.map((q, i) => ({
        question: q,
        answer: answers[i],
        ...gradeQuestion(q, answers[i]),
      })),
    );
    setPhase("done");
  }

  // "Finish test": ask first if some questions are still empty.
  function requestFinish() {
    if (unanswered > 0 && phase !== "confirm") {
      setPhase("confirm");
      return;
    }
    finish();
  }

  // Keyboard shortcuts (not while typing in the answer box)
  useEffect(() => {
    if (phase === "done" || !question) return;
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const number = Number(e.key);
      if (
        question.kind === "mc" &&
        number >= 1 &&
        number <= question.options.length
      ) {
        e.preventDefault();
        setAnswer(number - 1);
      } else if (question.kind === "tf" && (number === 1 || number === 2)) {
        e.preventDefault();
        setAnswer(number === 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, question, setAnswer, goNext, goBack]);

  // Put the cursor in the box for typed questions
  useEffect(() => {
    if (phase !== "done" && question?.kind === "write") {
      inputRef.current?.focus();
    }
  }, [index, phase, question]);

  // When the "all done" screen shows, move focus to "Take another test"
  useEffect(() => {
    if (phase === "done") againRef.current?.focus();
  }, [phase]);

  // Save the test one time when it is finished
  useEffect(() => {
    if (phase !== "done" || savedRef.current) return;
    savedRef.current = true;
    if (!onFinish) return;
    Promise.resolve()
      .then(() => onFinish(total))
      .then(() => setSaveState("saved"))
      .catch((err) => {
        console.error(err);
        setSaveState("error");
      });
  }, [phase, total, onFinish]);

  function handleAgain() {
    setQuestions(buildTest(cards));
    setIndex(0);
    setAnswers({});
    setResults([]);
    setPhase("test");
    setSaveState("idle");
    savedRef.current = false;
  }

  function onInputKey(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (index < total - 1) goNext();
    }
  }

  if (total === 0) return null;

  const isLast = index >= total - 1;
  const current = answers[index];
  const score = results.filter((r) => r.right).length;
  const typos = results.filter((r) => r.close).length;
  const missed = results.filter((r) => !r.right);
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  let doneMessage = "Good try! Every test helps the cards stick.";
  if (score === total) doneMessage = "A perfect test! Tuo is cheering.";
  else if (score / total >= 0.7)
    doneMessage = "Great job! Tuo is proud of you.";
  else if (score / total >= 0.4)
    doneMessage = "Nice work. Keep going, you are getting there.";

  const shownCount = phase === "done" ? total : answeredCount;

  return (
    <section className="qz" aria-label="Test">
      <div className="fc-bar-row">
        <div className="fc-bar-text">
          <span>
            {phase === "done"
              ? "All done!"
              : `Question ${index + 1} of ${total}`}
          </span>
          <span className="muted">
            {phase === "done"
              ? "Nice work"
              : `${answeredCount} of ${total} answered`}
          </span>
        </div>
        <div
          className="fc-bar"
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={shownCount}
        >
          <span style={{ width: `${(shownCount / total) * 100}%` }} />
        </div>
      </div>

      {phase === "done" ? (
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
          <p className="muted">
            That is {percent}%. {doneMessage}
          </p>
          {typos > 0 && (
            <p className="muted">
              {typos} typed {typos === 1 ? "answer had" : "answers had"} a tiny
              typo, but we counted {typos === 1 ? "it" : "them"} as right.
            </p>
          )}
          {saveState === "error" && (
            <p className="muted fc-save-note" role="status">
              We could not save this test, but you still did great.
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
                {missed.map((r, i) => (
                  <li key={i}>
                    <strong>{r.question.card.term}</strong>
                    <span>
                      Your answer: {describeAnswer(r.question, r.answer)}
                    </span>
                    <span>Right answer: {r.question.answer}</span>
                    <button
                      type="button"
                      className="set-star"
                      aria-pressed={isStarred(r.question.card.id)}
                      aria-label={
                        isStarred(r.question.card.id)
                          ? `Unstar ${r.question.card.term}`
                          : `Star ${r.question.card.term}`
                      }
                      onClick={() => toggleStar(r.question.card.id)}
                    >
                      <span aria-hidden="true">
                        {isStarred(r.question.card.id) ? "★" : "☆"}
                      </span>
                    </button>
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
              Take another test
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="qz-card">
            <span className="fc-tag">{KIND_LABEL[question.kind]}</span>
            <h2 className="qz-term">{question.card.term}</h2>
            {question.kind === "tf" && (
              <>
                <span className="fc-tag">Is this the right definition?</span>
                <p className="ts-claim">{question.shown}</p>
              </>
            )}
          </div>

          {question.kind === "mc" && (
            <div
              className="qz-options"
              role="radiogroup"
              aria-label="Choose the right definition"
            >
              {question.options.map((option, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={current === i}
                  className={`qz-option${current === i ? " is-picked" : ""}`}
                  onClick={() => setAnswer(i)}
                >
                  <span className="qz-key" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="qz-opt-text">{option}</span>
                </button>
              ))}
            </div>
          )}

          {question.kind === "tf" && (
            <div
              className="qz-options"
              role="radiogroup"
              aria-label="True or false"
            >
              {[true, false].map((value, i) => (
                <button
                  key={String(value)}
                  type="button"
                  role="radio"
                  aria-checked={current === value}
                  className={`qz-option${current === value ? " is-picked" : ""}`}
                  onClick={() => setAnswer(value)}
                >
                  <span className="qz-key" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="qz-opt-text">
                    {value ? "True" : "False"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {question.kind === "write" && (
            <div className="wr-field">
              <label className="wr-label" htmlFor="test-answer">
                Your answer
              </label>
              <textarea
                id="test-answer"
                ref={inputRef}
                className="wr-input"
                rows={3}
                value={typeof current === "string" ? current : ""}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Type the definition here"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          )}

          {phase === "confirm" ? (
            <div className="ts-confirm" role="alert">
              <p>
                You have {unanswered} unanswered{" "}
                {unanswered === 1 ? "question" : "questions"}. They will not
                count as right.
              </p>
              <div className="fc-done-actions">
                <button
                  type="button"
                  className="btn btn-primary fc-btn"
                  onClick={finish}
                >
                  Finish anyway
                </button>
                <button
                  type="button"
                  className="btn fc-btn"
                  onClick={() => setPhase("test")}
                >
                  Keep going
                </button>
              </div>
            </div>
          ) : (
            <div className="ts-nav">
              <button
                type="button"
                className="btn fc-btn"
                onClick={goBack}
                disabled={index === 0}
              >
                <span aria-hidden="true">←</span> Back
              </button>
              {isLast ? (
                <button
                  type="button"
                  className="btn btn-primary fc-btn"
                  onClick={requestFinish}
                >
                  Finish test
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary fc-btn"
                  onClick={goNext}
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          )}

          <p className="muted fc-hint">
            No answers are shown until the end. On a keyboard: press 1 or 2 (up
            to 4) to answer, and use the left and right arrows to move. In a
            typed answer, Enter goes to the next question.
          </p>
        </>
      )}
    </section>
  );
}
