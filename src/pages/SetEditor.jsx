import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useFolders from "../hooks/useFolders";
import Icon from "../components/ui/Icon";
import { createSet, getSet, updateSet } from "../hooks/useSets";
import { parseCards } from "../lib/parseCards";
import {
  MAX_PICTURES,
  PictureError,
  PictureLimitError,
  cardImageUrl,
  countMyPictures,
  removeCardImages,
  shrinkImage,
  uploadCardImage,
} from "../lib/cardImages";

const MAX_CARDS = 500;
const START_ROWS = 3;
const CONFETTI_COUNT = 28;

// Each row gets its own id, so React keeps the right inputs when we delete.
// cardId = the real card in the database (null for a brand new card).
// image = null (no picture)
//       | { kind: "existing", path }   a picture that is already saved
//       | { kind: "new", token, blob, type, ext, previewUrl }   chosen, saved on "Save"
let rowCounter = 0;
let pictureCounter = 0;
function newRow(term = "", definition = "", cardId = null, imagePath = null) {
  rowCounter += 1;
  return {
    id: rowCounter,
    cardId,
    term,
    definition,
    image: imagePath ? { kind: "existing", path: imagePath } : null,
  };
}

function imageKey(image) {
  if (!image) return "";
  return image.kind === "new" ? `new-${image.token}` : image.path;
}

function isFilled(row) {
  return row.term.trim() !== "" || row.definition.trim() !== "";
}
function isComplete(row) {
  return row.term.trim() !== "" && row.definition.trim() !== "";
}

// A short text that changes when anything on the page changes.
function makeSignature(title, description, rows, folderId) {
  return JSON.stringify([
    title,
    description,
    folderId,
    rows.map((row) => [
      row.cardId,
      row.term,
      row.definition,
      imageKey(row.image),
    ]),
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
  const [searchParams] = useSearchParams(); // /sets/new?folder=ID starts in that folder
  const isEdit = Boolean(setId);

  const [status, setStatus] = useState(isEdit ? "loading" : "ready"); // loading | ready | missing | error
  const [reloadKey, setReloadKey] = useState(0);
  const [baseline, setBaseline] = useState(null);
  const originalRef = useRef(new Map()); // cardId -> { term, definition, position, imagePath }
  const fileRef = useRef(null); // the hidden picture chooser
  const pickRowRef = useRef(null); // which card row asked for a picture
  const previewUrlsRef = useRef(new Set()); // preview addresses we must free

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState(() =>
    isEdit ? "" : searchParams.get("folder") || "",
  );
  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
  } = useFolders();
  const foldersReady = !foldersLoading && !foldersError;
  const [rows, setRows] = useState(() =>
    Array.from({ length: isEdit ? 1 : START_ROWS }, () => newRow()),
  );
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [notice, setNotice] = useState("");
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [badId, setBadId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // { title, count } (new sets only)

  const parsed = useMemo(() => parseCards(pasteText), [pasteText]);
  const readyCount = rows.filter(isComplete).length;
  const signature = makeSignature(title, description, rows, folderId);
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
              newRow(card.term, card.definition, card.id, card.image_path),
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
              imagePath: card.image_path || null,
            },
          ]),
        );
        setTitle(result.set.title);
        setDescription(loadedDescription);
        setFolderId(result.set.folder_id || "");
        setRows(loadedRows);
        setBaseline(
          makeSignature(
            result.set.title,
            loadedDescription,
            loadedRows,
            result.set.folder_id || "",
          ),
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

  // If the chosen folder does not exist (any more), fall back to "No folder".
  useEffect(() => {
    if (foldersReady && folderId && !folders.some((f) => f.id === folderId)) {
      setFolderId("");
    }
  }, [foldersReady, folders, folderId]);

  // Free the small picture previews when we leave the page.
  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

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

  function dropPreview(image) {
    if (image?.kind === "new") {
      URL.revokeObjectURL(image.previewUrl);
      previewUrlsRef.current.delete(image.previewUrl);
    }
  }

  function removeRow(rowId) {
    dropPreview(rows.find((row) => row.id === rowId)?.image);
    setRows((list) =>
      list.length === 1 ? [newRow()] : list.filter((row) => row.id !== rowId),
    );
  }

  // ---------- Pictures ----------
  function choosePicture(rowId) {
    pickRowRef.current = rowId;
    fileRef.current?.click();
  }

  // The picture is made small right away, but it is only uploaded on Save.
  async function onPictureFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const rowId = pickRowRef.current;
    if (!file || rowId === null) return;
    setError("");
    setNotice("");
    try {
      const small = await shrinkImage(file);
      const previewUrl = URL.createObjectURL(small.blob);
      previewUrlsRef.current.add(previewUrl);
      dropPreview(rows.find((row) => row.id === rowId)?.image);
      pictureCounter += 1;
      const token = pictureCounter;
      setRows((list) =>
        list.map((row) =>
          row.id === rowId
            ? {
                ...row,
                image: {
                  kind: "new",
                  token,
                  blob: small.blob,
                  type: small.type,
                  ext: small.ext,
                  previewUrl,
                },
              }
            : row,
        ),
      );
      setNotice("Picture ready. It is saved when you press Save.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof PictureError
          ? err.message
          : "We could not use that picture. Please try another one.",
      );
    }
  }

  function removePicture(rowId) {
    dropPreview(rows.find((row) => row.id === rowId)?.image);
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, image: null } : row)),
    );
    setNotice("");
  }

  // Enter in the last definition adds a new card. Shift+Enter = new line.
  function onDefinitionKey(e, index) {
    if (e.key === "Enter" && !e.shiftKey && index === rows.length - 1) {
      e.preventDefault();
      addRow();
    }
  }

  // Reads a CSV / TXT file into the paste box. The student then checks it
  // and presses "Add".
  async function onChooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError("");
    if (file.size > 1024 * 1024) {
      setFileError("That file is too big (max 1 MB). Try a smaller one.");
      return;
    }
    try {
      setPasteText(await file.text());
    } catch (err) {
      console.error(err);
      setFileError("We could not read that file. Please try another one.");
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
    const uploaded = []; // new picture files, to clean up if saving fails
    try {
      // 1. Upload the new pictures first. Only now (on Save), so nothing is
      //    left behind in storage when someone leaves without saving.
      const newPictureRows = complete.filter(
        (row) => row.image?.kind === "new",
      );
      if (newPictureRows.length > 0) {
        const have = await countMyPictures(user.id);
        if (have !== null && have + newPictureRows.length > MAX_PICTURES) {
          throw new PictureLimitError();
        }
      }
      const pathByRow = new Map();
      for (const row of newPictureRows) {
        const path = await uploadCardImage(user.id, row.image);
        uploaded.push(path);
        pathByRow.set(row.id, path);
      }
      const pictureOf = (row) => {
        if (row.image?.kind === "new") return pathByRow.get(row.id) || null;
        return row.image?.path || null;
      };

      if (isEdit) {
        // Work out what changed, so we only send the changes.
        const keptIds = new Set();
        const changed = [];
        const added = [];
        const finalByCard = new Map(); // cardId -> picture path (or null)
        complete.forEach((row, position) => {
          const imagePath = pictureOf(row);
          const card = {
            term: row.term.trim(),
            definition: row.definition.trim(),
            position,
            imagePath,
          };
          if (row.cardId) {
            keptIds.add(row.cardId);
            finalByCard.set(row.cardId, imagePath);
            const old = originalRef.current.get(row.cardId);
            if (
              !old ||
              old.term !== card.term ||
              old.definition !== card.definition ||
              old.position !== position ||
              (old.imagePath || null) !== imagePath
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
          // If folders did not load, leave the set's folder alone.
          folderId: foldersReady ? folderId || null : undefined,
          removedIds,
          changed,
          added,
        });

        // Old picture files that no card of mine uses any more. The database
        // keeps any file that another card (maybe in a copy) still uses.
        const stale = [];
        for (const [cardId, old] of originalRef.current) {
          if (old.imagePath && finalByCard.get(cardId) !== old.imagePath) {
            stale.push(old.imagePath);
          }
        }
        await removeCardImages(stale);

        navigate(`/sets/${setId}`, { state: { saved: true } });
        return;
      }

      const cleaned = complete.map((row) => ({
        term: row.term.trim(),
        definition: row.definition.trim(),
        imagePath: pictureOf(row),
      }));
      await createSet({
        userId: user.id,
        title: cleanTitle,
        description: description.trim(),
        cards: cleaned,
        folderId: foldersReady ? folderId || null : null,
      });
      setSaved({ title: cleanTitle, count: cleaned.length });
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      // Saving failed: take back the files we just uploaded.
      await removeCardImages(uploaded);
      if (err instanceof PictureLimitError) {
        setError(
          `You have reached the limit of ${MAX_PICTURES} pictures. Remove a picture you do not need (or remove it from a card and save), then try again. Your edits are still here.`,
        );
      } else {
        setError(
          isEdit
            ? "We could not save your changes. Check your internet and try again. Your edits are still here."
            : "We could not save your set. Check your internet and try again. Your cards are still here.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function startAnother() {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
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
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={onPictureFile}
        />
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
          {folders.length > 0 && (
            <label className="set-field" htmlFor="set-folder">
              <span className="set-label">
                Folder <span className="muted">(optional)</span>
              </span>
              <select
                id="set-folder"
                className="set-input"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
            <div className="set-field">
              <label className="set-label" htmlFor="set-file">
                Or choose a file <span className="muted">(CSV or TXT)</span>
              </label>
              <input
                id="set-file"
                className="set-input"
                type="file"
                accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
                onChange={onChooseFile}
              />
            </div>
            {fileError && (
              <p className="set-error" role="alert">
                {fileError}
              </p>
            )}
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
              Split each line with a dash, a colon, a comma, a semicolon, or a
              tab (from Excel, Google Sheets or Quizlet). In Excel, use Save as
              CSV to make a file.
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
                <div className="pic-term-col">
                  <label className="set-field" htmlFor={`term-${row.id}`}>
                    <span className="set-label">Term</span>
                    <input
                      id={`term-${row.id}`}
                      className="set-input"
                      type="text"
                      value={row.term}
                      maxLength={500}
                      placeholder="Word or question"
                      onChange={(e) =>
                        updateRow(row.id, "term", e.target.value)
                      }
                    />
                  </label>
                  <div className="pic-row">
                    {row.image ? (
                      <>
                        <img
                          className="pic-thumb"
                          src={
                            row.image.kind === "new"
                              ? row.image.previewUrl
                              : cardImageUrl(row.image.path)
                          }
                          alt={`Picture for card ${index + 1}`}
                          width="72"
                          height="72"
                        />
                        <button
                          type="button"
                          className="btn pic-btn"
                          aria-label={`Change the picture on card ${index + 1}`}
                          onClick={() => choosePicture(row.id)}
                        >
                          Change picture
                        </button>
                        <button
                          type="button"
                          className="btn pic-btn"
                          aria-label={`Remove the picture from card ${index + 1}`}
                          onClick={() => removePicture(row.id)}
                        >
                          Remove picture
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn pic-btn"
                        aria-label={`Add a picture to card ${index + 1}`}
                        onClick={() => choosePicture(row.id)}
                      >
                        Add a picture
                      </button>
                    )}
                  </div>
                </div>
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
        <p className="muted set-hint">
          Each card can have one picture. We make it small first. Pictures are
          saved when you press Save, and you can keep up to {MAX_PICTURES}.
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
