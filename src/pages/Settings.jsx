import { useEffect, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import useSettings from "../hooks/useSettings";
import { downloadJson, exportMyData } from "../lib/exportData";
import { deleteMyAccount } from "../lib/deleteAccount";
import { supabase } from "../lib/supabase";
import { GOAL_CHOICES } from "../lib/userSettings";

// Page for /settings. Your choices are saved in your account.
export default function Settings() {
  const { settings, loading, error, save } = useSettings();
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [exportState, setExportState] = useState("idle"); // idle | working | done | error

  async function change(changes) {
    setSaved(false);
    const ok = await save(changes);
    setSaved(ok);
  }

  async function handleDownload() {
    setExportState("working");
    try {
      const data = await exportMyData(user);
      const day = new Date().toISOString().slice(0, 10);
      downloadJson(`tuoniverse-my-data-${day}.json`, data);
      setExportState("done");
    } catch (err) {
      console.error(err);
      setExportState("error");
    }
  }

  // Delete my account. closed -> confirm -> working (-> error, try again)
  const [delStep, setDelStep] = useState("closed");
  const [confirmText, setConfirmText] = useState("");
  const [delError, setDelError] = useState("");
  const openRef = useRef(null);
  const confirmRef = useRef(null);
  const deleting = delStep === "working";

  // The cursor jumps into the box when the question opens.
  useEffect(() => {
    if (delStep === "confirm") confirmRef.current?.focus();
  }, [delStep]);

  function openDelete() {
    setDelError("");
    setConfirmText("");
    setDelStep("confirm");
  }

  function cancelDelete() {
    setDelStep("closed");
    setConfirmText("");
    setDelError("");
    openRef.current?.focus();
  }

  function onDeleteKey(e) {
    if (e.key === "Escape" && delStep !== "closed" && !deleting) {
      e.stopPropagation();
      cancelDelete();
    }
  }

  async function handleDelete() {
    setDelStep("working");
    setDelError("");
    try {
      await deleteMyAccount();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (err) {
        console.error(err);
      }
      // A fresh start: the page loads again with nobody logged in,
      // and shows a friendly goodbye.
      window.location.replace("/goodbye");
    } catch (err) {
      console.error(err);
      setDelError(err.message);
      setDelStep("error");
    }
  }

  return (
    <main className="set-view">
      <header className="set-view-head">
        <h1>Settings</h1>
        <p className="muted">Make Tuoniverse feel right for you.</p>
      </header>

      {loading ? (
        <p className="muted" aria-live="polite">
          Loading your settings…
        </p>
      ) : (
        <>
          <section className="st-card" aria-labelledby="st-goal-title">
            <h2 id="st-goal-title">Daily goal</h2>
            <p className="muted">
              How many cards do you want to finish each day? Pick a number that
              feels easy. You can change it any time.
            </p>
            <div
              className="st-choices"
              role="radiogroup"
              aria-labelledby="st-goal-title"
            >
              {GOAL_CHOICES.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={settings.dailyGoal === n}
                  className={`st-choice${settings.dailyGoal === n ? " is-picked" : ""}`}
                  onClick={() => change({ dailyGoal: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </section>

          <section className="st-card" aria-labelledby="st-calm-title">
            <h2 id="st-calm-title">Calm mode</h2>
            <p className="muted">
              Turns off moving things like confetti, floating planets and
              sparkles. Good if motion feels busy.
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.calmMode}
              className={`st-switch${settings.calmMode ? " is-on" : ""}`}
              onClick={() => change({ calmMode: !settings.calmMode })}
            >
              <span className="st-switch-dot" aria-hidden="true" />
              <span>
                {settings.calmMode ? "Calm mode is on" : "Calm mode is off"}
              </span>
            </button>
          </section>

          <p className="sp-count" role="status" aria-live="polite">
            {error ? error : saved ? "Saved. ✓" : ""}
          </p>

          <section className="st-card" aria-labelledby="st-data-title">
            <h2 id="st-data-title">Download my data</h2>
            <p className="muted">
              Get a file with all your sets, cards, notes and study history. It
              is yours to keep. The file is saved on this device only.
            </p>
            <button
              type="button"
              className="btn btn-primary st-action"
              onClick={handleDownload}
              disabled={exportState === "working"}
            >
              {exportState === "working"
                ? "Getting your data…"
                : "Download my data"}
            </button>
            <p className="muted" role="status" aria-live="polite">
              {exportState === "done" &&
                "Done! Look in your downloads for the file."}
              {exportState === "error" &&
                "We could not make the file just now. Your stuff is safe. Please try again."}
            </p>
          </section>

          <section
            className="st-card"
            aria-labelledby="st-delete-title"
            onKeyDown={onDeleteKey}
          >
            <h2 id="st-delete-title">Delete my account</h2>
            <p className="muted">
              This removes your account and everything in it: sets, cards, notes
              and study history. It cannot be undone. Tip: download your data
              first.
            </p>
            <button
              type="button"
              ref={openRef}
              className="btn st-action"
              aria-expanded={delStep !== "closed"}
              aria-controls="st-delete-panel"
              onClick={openDelete}
              disabled={deleting}
            >
              Delete my account…
            </button>

            {delStep !== "closed" && (
              <div id="st-delete-panel" className="st-delete-panel">
                <p>
                  We are sad to see you go. If you are sure, type{" "}
                  <strong>DELETE</strong> below.
                </p>
                <label className="wr-label" htmlFor="st-delete-input">
                  Type DELETE to confirm
                </label>
                <input
                  id="st-delete-input"
                  ref={confirmRef}
                  className="set-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck="false"
                  disabled={deleting}
                />
                <div className="st-delete-actions">
                  <button
                    type="button"
                    className="btn st-danger-btn"
                    onClick={handleDelete}
                    disabled={
                      deleting || confirmText.trim().toUpperCase() !== "DELETE"
                    }
                  >
                    {deleting ? "Deleting…" : "Yes, delete everything"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={cancelDelete}
                    disabled={deleting}
                  >
                    Keep my account
                  </button>
                </div>
                <p className="muted" role="status" aria-live="polite">
                  {deleting ? "Deleting your account. Please wait…" : delError}
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
