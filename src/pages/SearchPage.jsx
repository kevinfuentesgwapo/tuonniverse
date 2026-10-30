import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { loadSearchItems } from "../lib/loadSearchItems";
import { searchItems } from "../lib/searchItems";

const NEWEST = 5; // newest sets and notes shown before you type
const MAX_RESULTS = 30;

function ResultGroup({ title, list }) {
  if (list.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="sp-group-title">{title}</h2>
      <ul className="sp-list">
        {list.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <Link
              to={
                item.type === "set" ? `/sets/${item.id}` : `/notes/${item.id}`
              }
              className="sp-item"
            >
              <span className="search-tag">
                {item.type === "set" ? "Set" : "Note"}
              </span>
              <span className="search-text">
                <span className="search-title">{item.title}</span>
                {item.description && (
                  <span className="search-sub">{item.description}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Page for /search. A big search box that works well on phones.
// The words you type are kept in the address (?q=), so Back works nicely.
export default function SearchPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setItems(await loadSearchItems(userId));
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // The cursor is ready in the box as soon as the page opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function retry() {
    setStatus("loading");
    load();
  }

  function onChange(e) {
    const value = e.target.value;
    setParams(value ? { q: value } : {}, { replace: true });
  }

  // Enter on a phone just closes the keyboard.
  function onSubmit(e) {
    e.preventDefault();
    inputRef.current?.blur();
  }

  const hasQuery = query.trim() !== "";
  const found = hasQuery ? searchItems(items, query).slice(0, MAX_RESULTS) : [];
  const foundSets = found.filter((item) => item.type === "set");
  const foundNotes = found.filter((item) => item.type === "note");
  const newestSets = items
    .filter((item) => item.type === "set")
    .slice(0, NEWEST);
  const newestNotes = items
    .filter((item) => item.type === "note")
    .slice(0, NEWEST);

  let body;
  if (status === "loading") {
    body = (
      <p className="muted" aria-live="polite">
        Looking through your universe…
      </p>
    );
  } else if (status === "error") {
    body = (
      <div className="sp-empty">
        <p>We could not search just now. Your stuff is safe.</p>
        <button type="button" className="btn btn-primary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="sp-empty">
        <p>You have no sets or notes yet. Make your first one!</p>
        <div className="sp-actions">
          <Link to="/sets/new" className="search-link">
            Make a new set
          </Link>
          <Link to="/notes/new" className="search-link">
            Write a note
          </Link>
        </div>
      </div>
    );
  } else if (!hasQuery) {
    body = (
      <>
        <p className="muted">Your newest sets and notes. Type to search.</p>
        <ResultGroup title="Sets" list={newestSets} />
        <ResultGroup title="Notes" list={newestNotes} />
      </>
    );
  } else if (found.length === 0) {
    body = (
      <div className="sp-empty">
        <p>No match for “{query.trim()}”. Try another word.</p>
        <div className="sp-actions">
          <Link to="/sets/new" className="search-link">
            Make a new set
          </Link>
          <Link to="/notes/new" className="search-link">
            Write a note
          </Link>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <ResultGroup title="Sets" list={foundSets} />
        <ResultGroup title="Notes" list={foundNotes} />
      </>
    );
  }

  return (
    <main className="set-view">
      <header className="set-view-head">
        <h1>Search</h1>
        <p className="muted">Find your sets and notes.</p>
      </header>

      <form role="search" onSubmit={onSubmit}>
        <label className="sp-label" htmlFor="search-page-input">
          Search your sets and notes
        </label>
        <input
          id="search-page-input"
          ref={inputRef}
          className="sp-input"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Type a word"
          value={query}
          onChange={onChange}
        />
      </form>

      <p className="sp-count" role="status" aria-live="polite">
        {status === "ready" && hasQuery && found.length > 0
          ? `${found.length} found`
          : ""}
      </p>

      <div className="sp-body">{body}</div>
    </main>
  );
}
