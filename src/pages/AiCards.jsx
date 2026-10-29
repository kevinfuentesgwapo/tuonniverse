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
const DEFAULT_NAME = "My AI cards";

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
  const [setName, setSetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const resultRef = useRef(null);

  const length = text.trim().length;
  const tooLong = length > MAX_CHARS;
  const noTries = !usage.loading && usage.left <= 0;
  const canMake = length >= MIN_CHARS && !tooLong && !noTries;

  // Only cards with both sides filled can be saved.
  const saveable = cards.filter((c) => c.front.trim() && c.back.trim());
  const skipped = cards.length - saveable.length;

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
    setError("");
    setNotice("");
    setSaveError("");
    setSetName("");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user || saveable.length === 0 || saving) return;
    setSaveError("");
    setSaving(true);
    try {
      const setId = await createSet({
        userId: user.id,
        title: setName.trim() || DEFAULT_NAME,
        description: "Made with AI",
        cards: saveable.map((c) => ({
          term: c.front.trim(),
          definition: c.back.trim(),
        })),
      });
      navigate(`/sets/${setId}`);
    } catch {
      setSaveError(
        "Tuo could not save your set. Your cards are still here. Please try again.",
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
            <label className="ai-paste-label" htmlFor="ai-set-name">
              Set name
            </label>
            <input
              id="ai-set-name"
              type="text"
              className="ai-name-input"
              value={setName}
              maxLength={80}
              disabled={saving}
              placeholder={DEFAULT_NAME}
              onChange={(e) => setSetName(e.target.value)}
            />

            {skipped > 0 && (
              <p className="ai-note">
                {skipped === 1
                  ? "1 card has an empty side, so it will be skipped."
                  : `${skipped} cards have an empty side, so they will be skipped.`}{" "}
                Fill them in to keep them.
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
                disabled={saving || saveable.length === 0}
              >
                {saving
                  ? "Saving…"
                  : saveable.length === 1
                    ? "Save 1 card as a set"
                    : `Save ${saveable.length} cards as a set`}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
