// /ai : add notes (paste or upload a file), then Tuo makes flashcards or study notes.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useAiUsage from "../hooks/useAiUsage";
import { createSet } from "../hooks/useSets";
import { createNote } from "../hooks/useNotes";
import { generateCardsFromText, summarizeText } from "../lib/api";
import { ACCEPT, readFileText } from "../lib/readFile";
import CardPreview, { addIds } from "../components/ai/CardPreview";
import GenerateCardsButton from "../components/ai/GenerateCardsButton";
import NotesPreview from "../components/ai/NotesPreview";

const MIN_CHARS = 50;
const MAX_CHARS = 20000;
const DEFAULT_NAME = "My AI cards";
const DEFAULT_NOTE_TITLE = "Study notes";

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
  const [reading, setReading] = useState(false);
  const [fileMsg, setFileMsg] = useState("");
  const [fileError, setFileError] = useState("");

  // Study notes (summary) state.
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState(null); // { title, content } or null
  const [summaryAt, setSummaryAt] = useState(0);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");

  const resultRef = useRef(null);
  const notesRef = useRef(null);

  const working = busy || summarizing || saving || savingNote || reading;
  const length = text.trim().length;
  const tooLong = length > MAX_CHARS;
  const noTries = !usage.loading && usage.left <= 0;
  const canMake = length >= MIN_CHARS && !tooLong && !noTries;

  // Only cards with both sides filled can be saved.
  const saveable = cards.filter((c) => c.front.trim() && c.back.trim());
  const skipped = cards.length - saveable.length;

  // After new cards or notes arrive, bring them into view.
  useEffect(() => {
    if (madeAt) resultRef.current?.scrollIntoView({ block: "start" });
  }, [madeAt]);
  useEffect(() => {
    if (summaryAt) notesRef.current?.scrollIntoView({ block: "start" });
  }, [summaryAt]);

  function handleAiError(err) {
    setError(err.message);
    if (err.status === 429 && typeof err.used === "number") {
      usage.setUsed(err.used, err.limit);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again later
    if (!file) return;
    setFileMsg("");
    setFileError("");
    setReading(true);
    try {
      const { text: fileText, truncated } = await readFileText(file);
      setText(fileText);
      setFileMsg(
        truncated
          ? `Loaded ${file.name}. It was long, so Tuo will use the first part. You can edit the text below.`
          : `Loaded ${file.name}. You can edit the text below before making cards.`,
      );
    } catch (err) {
      setFileError(err.message);
    } finally {
      setReading(false);
    }
  }

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
      handleAiError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSummarize() {
    setError("");
    setNotice("");
    setNoteError("");
    setSummarizing(true);
    try {
      const result = await summarizeText(text.trim());
      usage.setUsed(result.used, result.limit);
      if (!result.content) {
        setNotice(
          "Tuo could not make notes from that text. Try text with more facts or ideas.",
        );
      } else {
        setSummary({
          title: result.title || DEFAULT_NOTE_TITLE,
          content: result.content,
        });
        setSummaryAt(Date.now());
      }
    } catch (err) {
      handleAiError(err);
    } finally {
      setSummarizing(false);
    }
  }

  function handleClear() {
    setFileMsg("");
    setFileError("");
    setText("");
    setCards([]);
    setSummary(null);
    setError("");
    setNotice("");
    setSaveError("");
    setNoteError("");
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

  async function handleSaveNote() {
    if (!user || !summary || savingNote) return;
    const content = summary.content.trim();
    if (!content) {
      setNoteError("Add some text to your notes first.");
      return;
    }
    setNoteError("");
    setSavingNote(true);
    try {
      await createNote({
        userId: user.id,
        title: summary.title.trim() || DEFAULT_NOTE_TITLE,
        content,
      });
      navigate("/notes");
    } catch {
      setNoteError(
        "Tuo could not save your notes. Your text is still here. Please try again.",
      );
      setSavingNote(false);
    }
  }

  return (
    <main className="sets-page ai-page">
      <header className="sets-head">
        <div>
          <h1>Make cards with AI</h1>
          <p className="muted">
            Paste your notes or upload a file. Tuo turns them into flashcards or
            study notes. You can fix them before saving.
          </p>
        </div>
      </header>

      <section className="ai-paste" aria-label="Add your notes">
        <div className="ai-file">
          <input
            id="ai-file"
            className="ai-file-input"
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            disabled={working}
          />
          <label className="btn ai-file-btn" htmlFor="ai-file">
            {reading ? "Reading your file…" : "Upload a file"}
          </label>
          <span className="muted">
            .pptx, .docx or .pdf. Your file stays on your device. Only the text
            is used.
          </span>
        </div>
        {fileMsg && (
          <p className="ai-note" aria-live="polite">
            {fileMsg}
          </p>
        )}
        {fileError && (
          <p className="ai-error" role="alert">
            {fileError}
          </p>
        )}

        <label className="ai-paste-label" htmlFor="ai-text">
          Your notes
        </label>
        <textarea
          id="ai-text"
          rows={9}
          value={text}
          disabled={working}
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
            disabled={!canMake || working}
            hasCards={cards.length > 0}
          />
          <button
            type="button"
            className="btn ai-notes-btn"
            onClick={handleSummarize}
            disabled={!canMake || working}
          >
            {summarizing ? "Writing notes…" : "Summarize to Notes"}
          </button>
          {(text || cards.length > 0 || summary) && (
            <button
              type="button"
              className="btn"
              onClick={handleClear}
              disabled={working}
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {cards.length > 0 && (
        <div className="ai-result" ref={resultRef}>
          <CardPreview cards={cards} onChange={setCards} disabled={working} />

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
              disabled={working}
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
                disabled={working || saveable.length === 0}
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

      {summary && (
        <div className="ai-result" ref={notesRef}>
          <NotesPreview
            title={summary.title}
            content={summary.content}
            onTitle={(title) => setSummary((s) => ({ ...s, title }))}
            onContent={(content) => setSummary((s) => ({ ...s, content }))}
            onSave={handleSaveNote}
            saving={savingNote}
            error={noteError}
            disabled={working}
          />
        </div>
      )}
    </main>
  );
}
