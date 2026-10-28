// /ai : paste text, Tuo makes cards, you check them.
// Saving the cards into a set comes in the next step.
import { useEffect, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import useAiUsage from "../hooks/useAiUsage";
import { generateCardsFromText } from "../lib/api";
import CardPreview, { addIds } from "../components/ai/CardPreview";
import GenerateCardsButton from "../components/ai/GenerateCardsButton";

const MIN_CHARS = 50;
const MAX_CHARS = 20000;

export default function AiCards() {
  const { user } = useAuth();
  const usage = useAiUsage(user?.id);

  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [madeAt, setMadeAt] = useState(0);
  const resultRef = useRef(null);

  const length = text.trim().length;
  const tooLong = length > MAX_CHARS;
  const noTries = !usage.loading && usage.left <= 0;
  const canMake = length >= MIN_CHARS && !tooLong && !noTries;

  // After new cards arrive, bring them into view.
  useEffect(() => {
    if (madeAt) resultRef.current?.scrollIntoView({ block: "start" });
  }, [madeAt]);

  async function handleMake() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await generateCardsFromText(text.trim());
      usage.setUsed(result.used, result.limit);
      if (result.cards.length === 0) {
        setNotice(
          "Tuo could not find cards in that text. Try notes with more facts, terms, or dates.",
        );
      } else {
        setCards(addIds(result.cards));
        setMadeAt(Date.now());
      }
    } catch (err) {
      setError(err.message);
      if (err.status === 429 && typeof err.used === "number") {
        usage.setUsed(err.used, err.limit);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    setText("");
    setCards([]);
    setError("");
    setNotice("");
  }

  return (
    <main className="sets-page ai-page">
      <header className="sets-head">
        <div>
          <h1>Make cards with AI</h1>
          <p className="muted">
            Paste your notes. Tuo turns them into flashcards. You can fix them
            before saving.
          </p>
        </div>
      </header>

      <section className="ai-paste" aria-label="Paste your notes">
        <label className="ai-paste-label" htmlFor="ai-text">
          Your notes
        </label>
        <textarea
          id="ai-text"
          rows={9}
          value={text}
          disabled={busy}
          placeholder="Paste a chapter, a list of terms, or your class notes here."
          onChange={(e) => setText(e.target.value)}
        />

        <div className="ai-meta">
          <span className={tooLong ? "ai-count ai-count-bad" : "ai-count"}>
            {length.toLocaleString()} / {MAX_CHARS.toLocaleString()} letters
          </span>
          <span className="muted" aria-live="polite">
            {usage.loading
              ? "Checking your AI tries…"
              : `AI tries left today: ${usage.left} of ${usage.limit}`}
          </span>
        </div>

        {length > 0 && length < MIN_CHARS && (
          <p className="muted">
            Add a little more text so Tuo has something to read.
          </p>
        )}
        {tooLong && (
          <p className="ai-error" role="alert">
            That is too long. Please keep it under {MAX_CHARS.toLocaleString()}{" "}
            letters.
          </p>
        )}
        {noTries && (
          <p className="ai-note">
            You used all your AI tries for today. They come back tomorrow, and
            you can still make cards by hand.
          </p>
        )}
        {error && (
          <p className="ai-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="ai-note">{notice}</p>}

        <div className="ai-actions">
          <GenerateCardsButton
            onClick={handleMake}
            busy={busy}
            disabled={!canMake}
            hasCards={cards.length > 0}
          />
          {(text || cards.length > 0) && (
            <button
              type="button"
              className="btn"
              onClick={handleClear}
              disabled={busy}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {cards.length > 0 && (
        <div className="ai-result" ref={resultRef}>
          <CardPreview cards={cards} onChange={setCards} disabled={busy} />
        </div>
      )}
    </main>
  );
}
