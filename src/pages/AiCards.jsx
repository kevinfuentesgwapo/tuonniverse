// /ai : paste text, Tuo makes cards, you check them, then save them as a set.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useAiUsage from "../hooks/useAiUsage";
import { createSet } from "../hooks/useSets";
import { generateCardsFromText } from "../lib/api";
import CardPreview, { addIds } from "../components/ai/CardPreview";
import GenerateCardsButton from "../components/ai/GenerateCardsButton";

const MIN_CHARS = 50;
const MAX_CHARS = 20000;
const MAX_TITLE = 100;

export default function AiCards() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const usage = useAiUsage(user?.id);

  const [text, setText] = useState("");
  const [cards, setCards] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [madeAt, setMadeAt] = useState(0);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const resultRef = useRef(null);

  const length = text.trim().length;
  const tooLong = length > MAX_CHARS;
  const noTries = !usage.loading && usage.left <= 0;
  const canMake = length >= MIN_CHARS && !tooLong && !noTries;

  // Only cards with both sides filled can be saved.
  const goodCards = cards.filter(
    (c) => String(c.front || "").trim() && String(c.back || "").trim(),
  );
  const skipped = cards.length - goodCards.length;
  const canSave = title.trim().length > 0 && goodCards.length > 0 && !saving;

  // After new cards arrive, bring them into view.
  useEffect(() => {
    if (madeAt) resultRef.current?.scrollIntoView({ block: "start" });
  }, [madeAt]);

  async function handleMake() {
    setError("");
    setNotice("");
    setSaveError("");
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
    setTitle("");
    setError("");
    setNotice("");
    setSaveError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!canSave || !user) return;
    setSaveError("");
    setSaving(true);
    try {
      const setId = await createSet({
        userId: user.id,
        title: title.trim(),
        description: "",
        cards: goodCards.map((c) => ({
          term: String(c.front).trim(),
          definition: String(c.back).trim(),
        })),
      });
      navigate(`/sets/${setId}`);
    } catch {
      setSaveError(
        "We could not save your set right now. Your cards are still here. Please try again.",
      );
      setSaving(false);
    }
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
          disabled={busy || saving}
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
            disabled={!canMake || saving}
            hasCards={cards.length > 0}
          />
          {(text || cards.length > 0) && (
            <button
              type="button"
              className="btn"
              onClick={handleClear}
              disabled={busy || saving}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {cards.length > 0 && (
        <div className="ai-result" ref={resultRef}>
          <CardPreview
            cards={cards}
            onChange={setCards}
            disabled={busy || saving}
          />

          <form className="ai-save" onSubmit={handleSave}>
            <h2 className="ai-save-title">Save as a set</h2>
            <label className="ai-paste-label" htmlFor="ai-set-title">
              Set name
            </label>
            <input
              id="ai-set-title"
              className="ai-save-input"
              type="text"
              value={title}
              maxLength={MAX_TITLE}
              disabled={saving}
              placeholder="Example: Web basics"
              onChange={(e) => setTitle(e.target.value)}
            />

            {skipped > 0 && (
              <p className="ai-note">
                {skipped === 1
                  ? "1 card has an empty side, so we will skip it."
                  : `${skipped} cards have an empty side, so we will skip them.`}
              </p>
            )}
            {saveError && (
              <p className="ai-error" role="alert">
                {saveError}
              </p>
            )}

            <div className="ai-actions">
              <button
                type="submit"
                className="btn btn-primary ai-save-btn"
                disabled={!canSave}
              >
                {saving
                  ? "Saving…"
                  : `Save ${goodCards.length} ${
                      goodCards.length === 1 ? "card" : "cards"
                    } as a set`}
              </button>
            </div>
            {!title.trim() && goodCards.length > 0 && (
              <p className="muted">Give your set a name, then save.</p>
            )}
          </form>
        </div>
      )}
    </main>
  );
}
