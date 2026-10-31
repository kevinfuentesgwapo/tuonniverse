import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../ui/Icon";
import useAuth from "../../hooks/useAuth";
import { loadSearchItems } from "../../lib/loadSearchItems";
import {
  resultPath,
  resultSubtitle,
  resultTag,
  searchItems,
} from "../../lib/searchItems";

const STALE_MS = 30000; // look again if the list is older than 30 seconds
const PER_GROUP = 5;

// The search box in the top bar. Finds your own sets, notes and cards.
// Press "/" to jump here. Arrow keys + Enter to open a result. Esc to close.
export default function SearchBox() {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const loadedAt = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  // Loads your sets, notes and cards. Runs when you click the box.
  const load = useCallback(async () => {
    if (!userId) return;
    setStatus((old) => (old === "ready" ? old : "loading"));
    try {
      setItems(await loadSearchItems(userId));
      loadedAt.current = Date.now();
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [userId]);

  // Close when you click somewhere else.
  useEffect(() => {
    function onPointerDown(e) {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      const typing =
        el.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const hasQuery = query.trim() !== "";
  const found = hasQuery ? searchItems(items, query) : [];
  const setResults = found
    .filter((item) => item.type === "set")
    .slice(0, PER_GROUP);
  const noteResults = found
    .filter((item) => item.type === "note")
    .slice(0, PER_GROUP);
  const cardResults = found
    .filter((item) => item.type === "card")
    .slice(0, PER_GROUP);
  const folderResults = found
    .filter((item) => item.type === "folder")
    .slice(0, PER_GROUP);
  const flat = [
    ...setResults,
    ...folderResults,
    ...noteResults,
    ...cardResults,
  ];
  const activeIndex = Math.min(active, Math.max(flat.length - 1, 0));

  function go(item) {
    navigate(resultPath(item));
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onFocus() {
    setOpen(true);
    if (Date.now() - loadedAt.current > STALE_MS) load();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && flat.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((activeIndex + 1) % flat.length);
    } else if (e.key === "ArrowUp" && flat.length > 0) {
      e.preventDefault();
      setActive((activeIndex - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter" && flat.length > 0) {
      e.preventDefault();
      go(flat[activeIndex]);
    }
  }

  function renderOption(item, index) {
    return (
      <li
        key={`${item.type}-${item.id}`}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={index === activeIndex}
        className={
          index === activeIndex ? "search-item is-active" : "search-item"
        }
        onMouseEnter={() => setActive(index)}
        onClick={() => go(item)}
      >
        <span className="search-tag">{resultTag(item)}</span>
        <span className="search-text">
          <span className="search-title">{item.title}</span>
          {resultSubtitle(item) && (
            <span className="search-sub">{resultSubtitle(item)}</span>
          )}
        </span>
      </li>
    );
  }

  let body;
  if (!hasQuery) {
    body = (
      <p className="search-hint">
        Type to search your sets, folders, notes and cards.
      </p>
    );
  } else if (status === "error") {
    body = (
      <div className="search-empty">
        <p>We could not search just now. Your stuff is safe.</p>
        <button type="button" className="btn" onClick={load}>
          Try again
        </button>
      </div>
    );
  } else if (status !== "ready" && items.length === 0) {
    body = <p className="search-hint">Looking through your universe…</p>;
  } else if (flat.length === 0) {
    body = (
      <div className="search-empty">
        <p>No match for “{query.trim()}”. Try another word.</p>
        <div className="search-actions">
          <Link
            to="/sets/new"
            className="search-link"
            onClick={() => setOpen(false)}
          >
            Make a new set
          </Link>
          <Link
            to="/notes/new"
            className="search-link"
            onClick={() => setOpen(false)}
          >
            Write a note
          </Link>
        </div>
      </div>
    );
  } else {
    body = (
      <ul
        id={listId}
        role="listbox"
        aria-label="Search results"
        className="search-list"
      >
        {setResults.length > 0 && (
          <li role="presentation" className="search-group">
            Sets
          </li>
        )}
        {setResults.map((item, i) => renderOption(item, i))}
        {folderResults.length > 0 && (
          <li role="presentation" className="search-group">
            Folders
          </li>
        )}
        {folderResults.map((item, i) =>
          renderOption(item, setResults.length + i),
        )}
        {noteResults.length > 0 && (
          <li role="presentation" className="search-group">
            Notes
          </li>
        )}
        {noteResults.map((item, i) =>
          renderOption(item, setResults.length + folderResults.length + i),
        )}
        {cardResults.length > 0 && (
          <li role="presentation" className="search-group">
            Cards
          </li>
        )}
        {cardResults.map((item, i) =>
          renderOption(
            item,
            setResults.length + folderResults.length + noteResults.length + i,
          ),
        )}
      </ul>
    );
  }

  const showList = open && hasQuery && flat.length > 0;

  return (
    <div className="topbar-search" ref={wrapRef}>
      <Icon name="search" size={18} />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Search your sets, folders, notes and cards"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={
          showList ? `${listId}-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search sets, notes and cards"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
      {!query && !open && (
        <kbd className="search-key" aria-hidden="true">
          /
        </kbd>
      )}
      {open && <div className="search-panel">{body}</div>}
    </div>
  );
}
