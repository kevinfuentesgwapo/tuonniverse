import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Icon from "../components/ui/Icon";
import { createSet, getSet, updateSet } from "../hooks/useSets";
import { parseCards } from "../lib/parseCards";

const MAX_CARDS = 500;
const START_ROWS = 3;
const CONFETTI_COUNT = 28;

// Each row gets its own id, so React keeps the right inputs when we delete.
// cardId = the real card in the database (null for a brand new card).
let rowCounter = 0;
function newRow(term = "", definition = "", cardId = null) {
  rowCounter += 1;
  return { id: rowCounter, cardId, term, definition };
}

function isFilled(row) {
  return row.term.trim() !== "" || row.definition.trim() !== "";
}
function isComplete(row) {
  return row.term.trim() !== "" && row.definition.trim() !== "";
}

// A short text that changes when anything on the page changes.
function makeSignature(title, description, rows) {
  return JSON.stringify([
    title,
    description,
    rows.map((row) => [row.cardId, row.term, row.definition]),
  ]);
}

function focusField(id, field) {
  requestAnimationFrame(() => {
    document.getElementById(`${field}-${id}`)?.focus();
  });
}

// Small party for the "Saved!" moment. Hidden for "reduce motion".
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <span
          key={i}
          className={`confetti-bit c${i % 4}`}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 7) * 0.09}s`,
            "--spin": `${(i % 2 ? 1 : -1) * (360 + (i % 5) * 90)}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function SetEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: setId } = useParams(); // only exists on /sets/:id/edit
  const isEdit = Boolean(setId);

  const [status, setStatus] = useState(isEdit ? "loading" : "ready"); // loading | ready | missing | error
  const [reloadKey, setReloadKey] = useState(0);
  const [baseline, setBaseline] = useState(null);
  const originalRef = useRef(new Map()); // cardId -> { term, definition, position }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState(() =>
    Array.from({ length: isEdit ? 1 : START_ROWS }, () => newRow()),
  );
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [badId, setBadId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // { title, count } (new sets only)

  const parsed = useMemo(() => parseCards(pasteText), [pasteText]);
  const readyCount = rows.filter(isComplete).length;
  const signature = makeSignature(title, description, rows);
  const dirty = isEdit
    ? status === "ready" && baseline !== null && signature !== baseline
    : Boolean(
        !saved && (title.trim() || description.trim() || rows.some(isFilled)),
      );

  // When editing: load the set and its cards into the form.
  useEffect(() => {
    if (!isEdit) return undefined;
    let cancelled = false;
    getSet(setId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setStatus("missing");
          return;
        }
        const loadedRows = result.cards.length
          ? result.cards.map((card) =>
              newRow(card.term, card.definition, card.id),
            )
          : [newRow()];
        const loadedDescription = result.set.description || "";
        originalRef.current = new Map(
          result.cards.map((card) => [
            card.id,
            {
              term: card.term,
              definition: card.definition,
              position: card.position,
            },
          ]),
        );
        setTitle(result.set.title);
        setDescription(loadedDescription);
        setRows(loadedRows);
        setBaseline(
          makeSignature(result.set.title, loadedDescription, loadedRows),
        );
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, setId, reloadKey]);

  // Warn before leaving the page with unsaved work.
  useEffect(() => {
    if (!dirty) return undefined;
    function warn(e) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function retryLoad() {
    setStatus("loading");
    setReloadKey((n) => n + 1);
  }

  function updateRow(rowId, field, value) {
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
    if (rowId === badId) setBadId(null);
  }

  function addRow() {
    if (rows.length >= MAX_CARDS) {
      setNotice(`That is the max: ${MAX_CARDS} cards in one set.`);
      return;
    }
    const row = newRow();
    setRows((list) => [...list, row]);
    focusField(row.id, "term");
  }

  function removeRow(rowId) {
    setRows((list) =>
      list.length === 1 ? [newRow()] : list.filter((row) => row.id !== rowId),
    );
  }

  // Enter in the last definition adds a new card. Shift+Enter = new line.
  function onDefinitionKey(e, index) {
    if (e.key === "Enter" && !e.shiftKey && index === rows.length - 1) {
      e.preventDefault();
      addRow();
    }
  }

  function importPasted() {
    if (parsed.cards.length === 0) return;
    const kept = rows.filter(isFilled);
    const room = Math.max(MAX_CARDS - kept.length, 0);
    const added = parsed.cards
      .slice(0, room)
      .map((card) => newRow(card.term, card.definition));
    const next = [...kept, ...added];
    setRows(next.length ? next : [newRow()]);
    setPasteText("");
    setShowPaste(false);
    setError("");
    setBadId(null);
    setNotice(
      added.length < parsed.cards.length
        ? `Added ${added.length} cards. The rest did not fit (max ${MAX_CARDS}).`
        : `Added ${added.length} cards. Nice!`,
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setNotice("");

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Give your set a title first. Something like “Biology: Cells”.");
      document.getElementById("set-title")?.focus();
      return;
    }

    const half = rows.find((row) => isFilled(row) && !isComplete(row));
    if (half) {
      const number = rows.indexOf(half) + 1;
      setBadId(half.id);
      setError(`Card ${number} needs both a term and a definition.`);
      focusField(half.id, half.term.trim() ? "def" : "term");
      return;
    }

    const complete = rows.filter(isComplete);
    if (complete.length === 0) {
      setError("Add at least one card to save your set.");
      focusField(rows[0].id, "term");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        // Work out what changed, so we only send the changes.
        const keptIds = new Set();
        const changed = [];
        const added = [];
        complete.forEach((row, position) => {
          const card = {
            term: row.term.trim(),
            definition: row.definition.trim(),
            position,
          };
          if (row.cardId) {
            keptIds.add(row.cardId);
            const old = originalRef.current.get(row.cardId);
            if (
              !old ||
              old.term !== card.term ||
              old.definition !== card.definition ||
              old.position !== position
            ) {
              changed.push({ id: row.cardId, ...card });
            }
          } else {
            added.push(card);
          }
        });
        const removedIds = [...originalRef.current.keys()].filter(
          (cardId) => !keptIds.has(cardId),
        );

        await updateSet({
          setId,
          userId: user.id,
          title: cleanTitle,
          description: description.trim(),
          removedIds,
          changed,
          added,
        });
        navigate(`/sets/${setId}`, { state: { saved: true } });
        return;
      }

      const cleaned = complete.map((row) => ({
        term: row.term.trim(),
        definition: row.definition.trim(),
      }));
      await createSet({
        userId: user.id,
        title: cleanTitle,
        description: description.trim(),
        cards: cleaned,
      });
      setSaved({ title: cleanTitle, count: cleaned.length });
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      setError(
        isEdit
          ? "We could not save your changes. Check your internet and try again. Your edits are still here."
          : "We could not save your set. Check your internet and try again. Your cards are still here.",
      );
    } finally {
      setSaving(false);
    }
  }

  function startAnother() {
    setTitle("");
    setDescription("");
    setRows(Array.from({ length: START_ROWS }, () => newRow()));
    setPasteText("");
    setShowPaste(false);
    setNotice("");
    setError("");
    setBadId(null);
    setSaved(null);
  }

  // ---------- Loading / not found / error (edit only) ----------
  if (isEdit && status === "loading") {
    return (
      <main className="set-editor">
        <p className="muted" aria-live="polite">
          Opening your set…
        </p>
      </main>
    );
  }

  if (isEdit && (status === "missing" || status === "error")) {
    return (
      <main className="set-editor">
        <section className="set-state">
          <h2>
            {status === "missing"
              ? "We could not find this set"
              : "Hmm, that did not load"}
          </h2>
          <p className="muted">
            {status === "missing"
              ? "It may have been deleted. Your other sets are safe."
              : "Check your internet, then try again."}
          </p>
          <div className="set-success-actions">
            {status === "error" && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={retryLoad}
              >
                Try again
              </button>
            )}
            <Link to="/sets" className="btn">
              Back to my sets
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ---------- Saved! (new sets) ----------
  if (saved) {
    return (
      <main className="set-editor">
        <section className="set-success" aria-live="polite">
          <Confetti />
          <img
            className="set-success-planet"
            src="/favicon.svg"
            alt=""
            width="96"
            height="96"
          />
          <h1>Saved! Your set is ready</h1>
          <p className="muted">
            “{saved.title}” has {saved.count}{" "}
            {saved.count === 1 ? "card" : "cards"}. Great start, explorer!
          </p>
          <div className="set-success-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={startAnother}
            >
              Make another set
            </button>
            <Link to="/sets" className="btn">
              See my sets
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ---------- The editor ----------
  return (
    <main className="set-editor">
      <Link to={isEdit ? `/sets/${setId}` : "/"} className="set-back">
        {isEdit ? "← Back to set" : "← Home"}
      </Link>

      <header className="set-head">
        <span className="home-icon" aria-hidden="true">
          <Icon name="sets" size={24} />
        </span>
        <div>
          <h1>{isEdit ? "Edit your set" : "Make a new set"}</h1>
          <p className="muted">
            {isEdit
              ? "Change anything you like. Press Save changes when you are done."
              : "Add a term and a definition for each card. You can add more later."}
          </p>
        </div>
      </header>

      <form onSubmit={handleSave} noValidate>
        <section className="set-panel">
          <label className="set-field" htmlFor="set-title">
            <span className="set-label">Title</span>
            <input
              id="set-title"
              className="set-input"
              type="text"
              value={title}
              maxLength={100}
              placeholder="Example: Biology: Cells"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="set-field" htmlFor="set-desc">
            <span className="set-label">
              Description <span className="muted">(optional)</span>
            </span>
            <input
              id="set-desc"
              className="set-input"
              type="text"
              value={description}
              maxLength={300}
              placeholder="What is this set about?"
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </section>

        <div className="set-tools">
          <h2 className="set-section-title">Cards</h2>
          <button
            type="button"
            className="btn"
            aria-expanded={showPaste}
            onClick={() => setShowPaste((open) => !open)}
          >
            {showPaste ? "Close paste" : "Paste a list"}
          </button>
        </div>

        {showPaste && (
          <section className="set-panel set-paste">
            <label className="set-field" htmlFor="set-paste">
              <span className="set-label">Paste your list</span>
              <textarea
                id="set-paste"
                className="set-input"
                rows={6}
                value={pasteText}
                placeholder={
                  "One card per line, like this:\nMitochondria - powerhouse of the cell\nNucleus: holds the DNA"
                }
                onChange={(e) => setPasteText(e.target.value)}
              />
            </label>
            <p className="muted set-hint">
              Split each line with a dash, a colon, a comma, or a tab (from
              Excel or Google Sheets).
            </p>
            {pasteText.trim() && (
              <p className="set-found" aria-live="polite">
                Found {parsed.cards.length}{" "}
                {parsed.cards.length === 1 ? "card" : "cards"}
                {parsed.skipped > 0 &&
                  `. ${parsed.skipped} ${
                    parsed.skipped === 1 ? "line" : "lines"
                  } had no split and will be skipped`}
                .
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={parsed.cards.length === 0}
              onClick={importPasted}
            >
              Add {parsed.cards.length || ""}{" "}
              {parsed.cards.length === 1 ? "card" : "cards"}
            </button>
          </section>
        )}

        <ol className="set-rows">
          {rows.map((row, index) => (
            <li
              key={row.id}
              className={row.id === badId ? "set-row is-invalid" : "set-row"}
            >
              <span className="set-row-num" aria-hidden="true">
                {index + 1}
              </span>
              <div className="set-row-fields">
                <label className="set-field" htmlFor={`term-${row.id}`}>
                  <span className="set-label">Term</span>
                  <input
                    id={`term-${row.id}`}
                    className="set-input"
                    type="text"
                    value={row.term}
                    maxLength={500}
                    placeholder="Word or question"
                    onChange={(e) => updateRow(row.id, "term", e.target.value)}
                  />
                </label>
                <label className="set-field" htmlFor={`def-${row.id}`}>
                  <span className="set-label">Definition</span>
                  <textarea
                    id={`def-${row.id}`}
                    className="set-input"
                    rows={2}
                    value={row.definition}
                    maxLength={2000}
                    placeholder="Meaning or answer"
                    onChange={(e) =>
                      updateRow(row.id, "definition", e.target.value)
                    }
                    onKeyDown={(e) => onDefinitionKey(e, index)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="set-row-remove"
                aria-label={`Remove card ${index + 1}`}
                title="Remove card"
                onClick={() => removeRow(row.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ol>

        <button type="button" className="set-add" onClick={addRow}>
          <Icon name="plus" size={20} />
          Add a card
        </button>
        <p className="muted set-hint">
          Tip: press Enter in the last definition to add the next card.
        </p>

        <div className="set-savebar">
          <div className="set-savebar-text" aria-live="polite">
            {error ? (
              <p className="set-error" role="alert">
                {error}
              </p>
            ) : notice ? (
              <p className="set-notice">{notice}</p>
            ) : (
              <p className="muted">
                {readyCount === 0
                  ? "Your cards will show up here as you fill them in."
                  : `${readyCount} ${
                      readyCount === 1 ? "card" : "cards"
                    } ready. Looking good!`}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary set-save-btn"
            disabled={saving}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save set"}
          </button>
        </div>
      </form>
    </main>
  );
}
