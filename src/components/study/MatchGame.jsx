import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// How many pairs are in one round.
const PAIRS = 6;

// Same words in different spelling or spacing still count as the same.
function norm(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// One round of the game. A new "key" from the page starts a fresh round.
// onFinish(pairs) is optional (shared sets save nothing).
// backTo / backLabel: where the "back" link on the win screen goes.
export default function MatchGame({
  cards,
  setId,
  onAgain,
  onFinish,
  backTo,
  backLabel = "Back to the set",
}) {
  const [round] = useState(() => {
    const picked = shuffle(cards).slice(0, PAIRS);
    return {
      total: picked.length,
      terms: shuffle(
        picked.map((c) => ({
          key: `t-${c.id}`,
          answer: norm(c.definition),
          text: c.term,
        })),
      ),
      defs: shuffle(
        picked.map((c) => ({
          key: `d-${c.id}`,
          answer: norm(c.definition),
          text: c.definition,
        })),
      ),
    };
  });

  const [matched, setMatched] = useState([]); // keys of tiles that are done
  const [selTerm, setSelTerm] = useState(null);
  const [selDef, setSelDef] = useState(null);
  const [wrong, setWrong] = useState(null); // { t, d } for a moment
  const [tries, setTries] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [secs, setSecs] = useState(0);
  const [note, setNote] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);
  const startRef = useRef(0);
  const waitRef = useRef(null);

  const pairsDone = matched.filter((k) => k.startsWith("t-")).length;

  // The timer. It only runs after the first tap, and stops at the end.
  useEffect(() => {
    if (!started || finished) return undefined;
    const timer = setInterval(() => {
      setSecs(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [started, finished]);

  // Clean up the short "wrong" pause if we leave the page.
  useEffect(() => () => clearTimeout(waitRef.current), []);

  // Escape clears what you picked.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !wrong) {
        setSelTerm(null);
        setSelDef(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wrong]);

  function judge(termKey, defKey) {
    const term = round.terms.find((t) => t.key === termKey);
    const def = round.defs.find((d) => d.key === defKey);

    if (term.answer === def.answer) {
      const next = [...matched, termKey, defKey];
      setMatched(next);
      setSelTerm(null);
      setSelDef(null);
      setNote("Nice match!");
      if (next.filter((k) => k.startsWith("t-")).length === round.total) {
        setSecs(Math.round((Date.now() - startRef.current) / 1000));
        setFinished(true);
        // Save the round so it counts for your streak.
        Promise.resolve(onFinish?.(round.total)).catch((err) => {
          console.error(err);
          setSaveFailed(true);
        });
      }
    } else {
      setTries((n) => n + 1);
      setWrong({ t: termKey, d: defKey });
      setNote("Almost! Try another one.");
      waitRef.current = setTimeout(() => {
        setWrong(null);
        setSelTerm(null);
        setSelDef(null);
      }, 700);
    }
  }

  function pick(side, tile) {
    if (finished || wrong || matched.includes(tile.key)) return;
    if (!started) {
      startRef.current = Date.now();
      setStarted(true);
    }
    const nextTerm =
      side === "term" ? (selTerm === tile.key ? null : tile.key) : selTerm;
    const nextDef =
      side === "def" ? (selDef === tile.key ? null : tile.key) : selDef;
    setSelTerm(nextTerm);
    setSelDef(nextDef);
    if (nextTerm && nextDef) judge(nextTerm, nextDef);
  }

  function tileClass(tile, selected) {
    let cls = "mt-tile";
    if (matched.includes(tile.key)) cls += " is-done";
    else if (wrong && (wrong.t === tile.key || wrong.d === tile.key))
      cls += " is-wrong";
    else if (selected) cls += " is-selected";
    return cls;
  }

  if (finished) {
    return (
      <section className="fc-done" aria-live="polite">
        <div className="fc-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span
              key={i}
              className={`fc-bit c${i % 4}`}
              style={{
                left: `${(i * 53) % 100}%`,
                animationDelay: `${(i % 6) * 0.12}s`,
                "--spin": `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
              }}
            />
          ))}
        </div>
        <img className="fc-planet" src="/favicon.svg" alt="" />
        <h2>You did it!</h2>
        <p>
          You matched all {round.total} pairs in {formatTime(secs)}.
        </p>
        <p className="muted">
          {tries === 0
            ? "Not one slip. Wow!"
            : "Tricky ones get easier each time you play."}
        </p>
        {saveFailed && (
          <p className="muted" role="status">
            We could not add this round to your streak this time. Check your
            internet and try another round.
          </p>
        )}
        <div className="fc-done-actions">
          <button type="button" className="btn btn-primary" onClick={onAgain}>
            Play again
          </button>
          <Link to={backTo || `/sets/${setId}`} className="btn">
            {backLabel}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="fc mt">
      <div className="fc-bar-row">
        <div className="fc-bar-text">
          <span>
            Matched {pairsDone} of {round.total}
          </span>
          <span>{formatTime(secs)}</span>
        </div>
        <div
          className="fc-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={round.total}
          aria-valuenow={pairsDone}
          aria-label="Pairs matched"
        >
          <span style={{ width: `${(pairsDone / round.total) * 100}%` }} />
        </div>
      </div>

      <p className="muted fc-hint">
        Tap a term, then tap its meaning. There is no rush.
      </p>

      <div className="mt-board">
        <div className="mt-col">
          <h2 className="mt-col-title">Terms</h2>
          {round.terms.map((tile) => (
            <button
              key={tile.key}
              type="button"
              className={tileClass(tile, selTerm === tile.key)}
              aria-pressed={selTerm === tile.key}
              disabled={matched.includes(tile.key)}
              aria-hidden={matched.includes(tile.key) ? "true" : undefined}
              onClick={() => pick("term", tile)}
            >
              {tile.text}
            </button>
          ))}
        </div>
        <div className="mt-col">
          <h2 className="mt-col-title">Meanings</h2>
          {round.defs.map((tile) => (
            <button
              key={tile.key}
              type="button"
              className={tileClass(tile, selDef === tile.key)}
              aria-pressed={selDef === tile.key}
              disabled={matched.includes(tile.key)}
              aria-hidden={matched.includes(tile.key) ? "true" : undefined}
              onClick={() => pick("def", tile)}
            >
              {tile.text}
            </button>
          ))}
        </div>
      </div>

      <p className="muted fc-hint" role="status" aria-live="polite">
        {note}
      </p>
    </div>
  );
}
