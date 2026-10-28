import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getNote, createNote, updateNote, deleteNote } from "../hooks/useNotes";

// Write a note (/notes/new) or change one (/notes/:id).
export default function NoteEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(isNew ? "ready" : "loading"); // loading | ready | missing | error
  const [saveState, setSaveState] = useState("idle"); // idle | dirty | saving | saved
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load the note when we open an old one.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getNote(id)
      .then((note) => {
        if (cancelled) return;
        if (!note) {
          setStatus("missing");
          return;
        }
        setTitle(note.title);
        setContent(note.content);
        setSaveState((s) => (s === "saved" ? s : "idle"));
        setStatus("ready");
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function friendlyError(err) {
    if (/row-level security/i.test(err?.message || "")) {
      return "A database rule blocked saving. Run the newest schema.sql in Supabase, then try again.";
    }
    return "Saving did not work. Check your internet and try again. Your words are still here.";
  }

  async function handleSave() {
    if (saveState === "saving") return;
    const cleanTitle = title.trim();
    if (!cleanTitle && !content.trim()) {
      setMessage("Write a title or a few words first, then save.");
      return;
    }
    setMessage("");
    setSaveState("saving");
    try {
      if (isNew) {
        const newId = await createNote({
          userId: user.id,
          title: cleanTitle,
          content,
        });
        setSaveState("saved");
        navigate(`/notes/${newId}`, { replace: true });
      } else {
        await updateNote(id, { title: cleanTitle, content });
        setSaveState("saved");
      }
    } catch (err) {
      console.error(err);
      setMessage(friendlyError(err));
      setSaveState("dirty");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMessage("");
    try {
      await deleteNote(id);
      navigate("/notes", { replace: true });
    } catch (err) {
      console.error(err);
      setMessage("Deleting did not work. Please try again.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  // Ctrl+S (or Cmd+S) saves.
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  if (status === "loading") {
    return (
      <main className="sets-page nt-editor">
        <p className="muted" aria-live="polite">
          Opening your note…
        </p>
      </main>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <main className="sets-page nt-editor">
        <section className="set-state">
          <h2>
            {status === "missing"
              ? "We could not find that note"
              : "Hmm, that did not load"}
          </h2>
          <p className="muted">
            {status === "missing"
              ? "It may have been deleted. Your other notes are safe."
              : "Check your internet, then try again."}
          </p>
          <Link to="/notes" className="btn btn-primary">
            Back to my notes
          </Link>
        </section>
      </main>
    );
  }

  const statusText =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved. Nice!"
        : saveState === "dirty"
          ? "Not saved yet"
          : "";

  return (
    <main className="sets-page nt-editor" onKeyDown={handleKeyDown}>
      <Link to="/notes" className="nt-back">
        ← All notes
      </Link>

      <h1 className="nt-heading">{isNew ? "New note" : "Your note"}</h1>

      <input
        className="nt-title"
        type="text"
        value={title}
        maxLength={120}
        placeholder="Give it a title"
        aria-label="Note title"
        onChange={(e) => {
          setTitle(e.target.value);
          setSaveState("dirty");
        }}
      />

      <textarea
        className="nt-body"
        value={content}
        placeholder="Start writing here…"
        aria-label="Note text"
        onChange={(e) => {
          setContent(e.target.value);
          setSaveState("dirty");
        }}
      />

      {message && (
        <p className="nt-message" role="alert">
          {message}
        </p>
      )}

      <div className="nt-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saveState === "saving"}
        >
          {saveState === "saving" ? "Saving…" : "Save note"}
        </button>
        <span
          className={`nt-status${saveState === "saved" ? " is-saved" : ""}`}
          aria-live="polite"
        >
          {statusText}
        </span>
        <span className="nt-hint muted">Tip: press Ctrl + S to save</span>

        {!isNew && !confirming && (
          <button
            type="button"
            className="btn nt-delete"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>

      {!isNew && confirming && (
        <section className="nt-confirm" aria-live="polite">
          <p>
            <strong>Delete this note?</strong> It cannot come back.
          </p>
          <div className="nt-confirm-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Keep it
            </button>
            <button
              type="button"
              className="btn nt-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
