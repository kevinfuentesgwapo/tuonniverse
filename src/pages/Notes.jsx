import { Link } from "react-router-dom";
import useNotes from "../hooks/useNotes";
import Icon from "../components/ui/Icon";

// Colors for the little icons. They take turns.
const TONES = ["var(--yellow)", "var(--cyan)", "var(--violet)"];

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// A short peek at the note text.
function preview(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? `${clean.slice(0, 140)}…` : clean;
}

export default function Notes() {
  const { notes, loading, error, reload } = useNotes();

  return (
    <main className="sets-page">
      <header className="sets-head">
        <div>
          <h1>Your notes</h1>
          <p className="muted">
            {notes.length > 0
              ? `${notes.length} ${notes.length === 1 ? "note" : "notes"} saved.`
              : "A quiet place for your thoughts."}
          </p>
        </div>
        <Link to="/notes/new" className="btn btn-primary create-btn">
          <Icon name="plus" size={18} />
          New note
        </Link>
      </header>

      {loading ? (
        <p className="muted" aria-live="polite">
          Loading your notes…
        </p>
      ) : error ? (
        <section className="set-state">
          <h2>Hmm, that did not load</h2>
          <p className="muted">
            Check your internet, then try again. Your notes are safe.
          </p>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Try again
          </button>
        </section>
      ) : notes.length === 0 ? (
        <section className="set-state">
          <img
            className="set-state-planet"
            src="/favicon.svg"
            alt=""
            width="80"
            height="80"
          />
          <h2>Your first note is waiting</h2>
          <p className="muted">
            Jot down anything you want to remember. It saves just for you.
          </p>
          <Link to="/notes/new" className="btn btn-primary">
            Write my first note
          </Link>
        </section>
      ) : (
        <div className="set-grid">
          {notes.map((note, i) => (
            <Link key={note.id} to={`/notes/${note.id}`} className="nt-tile">
              <span
                className="home-icon"
                style={{ "--tone": TONES[i % TONES.length] }}
                aria-hidden="true"
              >
                <Icon name="notes" size={22} />
              </span>
              <h3>{note.title || "Untitled note"}</h3>
              {note.content && (
                <p className="muted nt-tile-text">{preview(note.content)}</p>
              )}
              <span className="nt-tile-meta">
                Updated {formatDate(note.updatedAt)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
