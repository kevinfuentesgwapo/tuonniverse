import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useSets from "../hooks/useSets";
import useFolders from "../hooks/useFolders";
import SetTile from "../components/flashcards/SetTile";
import Icon from "../components/ui/Icon";
import {
  FOLDER_NAME_MAX,
  createFolder,
  deleteFolder,
  renameFolder,
} from "../lib/folders";

// One folder button. The count is written as text, not just a color.
function Chip({ label, count, pressed, onClick }) {
  return (
    <button
      type="button"
      className="sf-chip"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label} <span className="sf-chip-count">{count}</span>
    </button>
  );
}

export default function Sets() {
  const { user } = useAuth();
  const { sets, loading, error, reload } = useSets();
  const { folders, error: foldersError, reload: reloadFolders } = useFolders();
  const [params, setParams] = useSearchParams();

  // mode: null | "new" | "rename" | "delete"
  const [mode, setMode] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  // Which folder is open. It lives in the address (?folder=), so Back works.
  const wanted = params.get("folder") || "all";
  const activeFolder = folders.find((folder) => folder.id === wanted);
  const view = wanted === "none" ? "none" : activeFolder ? wanted : "all";

  useEffect(() => {
    if (mode === "new" || mode === "rename") inputRef.current?.focus();
  }, [mode]);

  const folderName = new Map(folders.map((folder) => [folder.id, folder.name]));
  const countIn = (id) => sets.filter((set) => set.folderId === id).length;
  const noFolderCount = sets.filter((set) => !set.folderId).length;

  const shown =
    view === "all"
      ? sets
      : view === "none"
        ? sets.filter((set) => !set.folderId)
        : sets.filter((set) => set.folderId === view);

  const newSetTo = activeFolder
    ? `/sets/new?folder=${activeFolder.id}`
    : "/sets/new";

  function openView(value) {
    setParams(value === "all" ? {} : { folder: value }, { replace: true });
    setMode(null);
    setMessage("");
  }

  function startMode(next) {
    setMessage("");
    setName(next === "rename" && activeFolder ? activeFolder.name : "");
    setMode(next);
  }

  function closePanel() {
    setMode(null);
    setName("");
  }

  function onPanelKey(e) {
    if (e.key === "Escape" && mode && !busy) {
      e.stopPropagation();
      closePanel();
    }
  }

  async function handleSubmitName(e) {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) {
      setMessage("Give your folder a name first. Something like “Biology”.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (mode === "new") {
        const made = await createFolder(user.id, clean);
        await reloadFolders();
        setParams({ folder: made.id }, { replace: true });
        setMessage(`Folder “${made.name}” is ready.`);
      } else if (mode === "rename" && activeFolder) {
        await renameFolder(activeFolder.id, clean);
        await reloadFolders();
        setMessage("Folder renamed.");
      }
      closePanel();
    } catch (err) {
      console.error(err);
      setMessage(
        "We could not save that folder. Check your internet and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeFolder) return;
    setBusy(true);
    setMessage("");
    try {
      await deleteFolder(activeFolder.id);
      await reloadFolders();
      reload();
      setParams({}, { replace: true });
      setMessage("Folder deleted. Your sets are safe.");
      closePanel();
    } catch (err) {
      console.error(err);
      setMessage(
        "We could not delete that folder. Your sets are safe. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  let headText = "All your flashcard sets live here.";
  if (sets.length > 0) {
    const n = shown.length;
    const word = n === 1 ? "set" : "sets";
    if (view === "all") headText = `${n} ${word} in your universe.`;
    else if (view === "none") headText = `${n} ${word} with no folder.`;
    else headText = `${n} ${word} in “${activeFolder.name}”.`;
  }

  const showBar = !loading && !error && (sets.length > 0 || folders.length > 0);

  return (
    <main className="sets-page">
      <header className="sets-head">
        <div>
          <h1>Your sets</h1>
          <p className="muted">{headText}</p>
        </div>
        <Link to={newSetTo} className="btn btn-primary create-btn">
          <Icon name="plus" size={18} />
          New set
        </Link>
      </header>

      {showBar && (
        <>
          <div className="sf-bar" role="group" aria-label="Folders">
            <div className="sf-chips">
              <Chip
                label="All"
                count={sets.length}
                pressed={view === "all"}
                onClick={() => openView("all")}
              />
              {folders.map((folder) => (
                <Chip
                  key={folder.id}
                  label={folder.name}
                  count={countIn(folder.id)}
                  pressed={view === folder.id}
                  onClick={() => openView(folder.id)}
                />
              ))}
              {folders.length > 0 && noFolderCount > 0 && (
                <Chip
                  label="No folder"
                  count={noFolderCount}
                  pressed={view === "none"}
                  onClick={() => openView("none")}
                />
              )}
            </div>
            <button
              type="button"
              className="btn sf-add"
              onClick={() => startMode("new")}
              disabled={busy}
            >
              <Icon name="plus" size={16} />
              New folder
            </button>
          </div>

          {foldersError && (
            <p className="muted" role="status">
              {foldersError} Your sets are still here.
            </p>
          )}

          {(mode || activeFolder) && (
            <div className="sf-panel" onKeyDown={onPanelKey}>
              {(mode === "new" || mode === "rename") && (
                <form
                  onSubmit={handleSubmitName}
                  className="sf-form"
                  noValidate
                >
                  <label className="set-field" htmlFor="sf-name">
                    <span className="set-label">
                      {mode === "new" ? "New folder name" : "Folder name"}
                    </span>
                    <input
                      id="sf-name"
                      ref={inputRef}
                      className="set-input"
                      type="text"
                      value={name}
                      maxLength={FOLDER_NAME_MAX}
                      placeholder="Example: Biology"
                      onChange={(e) => setName(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <div className="sf-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                    >
                      {busy
                        ? "Saving…"
                        : mode === "new"
                          ? "Create folder"
                          : "Save name"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={closePanel}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {mode === "delete" && activeFolder && (
                <div className="sf-form">
                  <p>
                    Delete the folder “{activeFolder.name}”? Its{" "}
                    {countIn(activeFolder.id)}{" "}
                    {countIn(activeFolder.id) === 1 ? "set is" : "sets are"} NOT
                    deleted. They just go back to “No folder”.
                  </p>
                  <div className="sf-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleDelete}
                      disabled={busy}
                    >
                      {busy ? "Deleting…" : "Yes, delete the folder"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={closePanel}
                      disabled={busy}
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              )}

              {!mode && activeFolder && (
                <div className="sf-panel-row">
                  <strong>Folder: {activeFolder.name}</strong>
                  <div className="sf-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => startMode("rename")}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => startMode("delete")}
                    >
                      Delete folder
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="sf-message muted" role="status" aria-live="polite">
            {message}
          </p>
        </>
      )}

      {loading ? (
        <p className="muted" aria-live="polite">
          Loading your sets…
        </p>
      ) : error ? (
        <section className="set-state">
          <h2>Hmm, that did not load</h2>
          <p className="muted">
            Check your internet, then try again. Your sets are safe.
          </p>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Try again
          </button>
        </section>
      ) : sets.length === 0 ? (
        <section className="set-state">
          <img
            className="set-state-planet"
            src="/favicon.svg"
            alt=""
            width="80"
            height="80"
          />
          <h2>Your first set is waiting</h2>
          <p className="muted">
            Make a set with a few cards. It only takes a minute.
          </p>
          <Link to={newSetTo} className="btn btn-primary">
            Make my first set
          </Link>
        </section>
      ) : shown.length === 0 ? (
        <section className="set-state">
          <h2>This folder is empty</h2>
          <p className="muted">
            Make a new set here, or open one of your sets, press Edit, and
            choose this folder.
          </p>
          <Link to={newSetTo} className="btn btn-primary">
            Make a set in this folder
          </Link>
        </section>
      ) : (
        <div className="set-grid">
          {shown.map((set) => (
            <SetTile
              key={set.id}
              set={set}
              folderName={view === "all" ? folderName.get(set.folderId) : null}
            />
          ))}
        </div>
      )}
    </main>
  );
}
