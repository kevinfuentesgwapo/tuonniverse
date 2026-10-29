// The notes Tuo wrote. The student can fix them, then save them to Notes.
export default function NotesPreview({
  title,
  content,
  onTitle,
  onContent,
  onSave,
  saving,
  error,
  disabled,
}) {
  return (
    <form
      className="ai-notes"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <h2 className="ai-notes-heading">Your study notes</h2>
      <p className="muted">Fix anything you like, then save them to Notes.</p>

      <label className="ai-paste-label" htmlFor="ai-note-title">
        Note title
      </label>
      <input
        id="ai-note-title"
        type="text"
        className="ai-name-input"
        value={title}
        maxLength={120}
        disabled={disabled}
        onChange={(e) => onTitle(e.target.value)}
      />

      <label className="ai-paste-label" htmlFor="ai-note-body">
        Notes
      </label>
      <textarea
        id="ai-note-body"
        className="ai-notes-text"
        rows={14}
        value={content}
        disabled={disabled}
        onChange={(e) => onContent(e.target.value)}
      />

      {error && (
        <p className="ai-error" role="alert">
          {error}
        </p>
      )}

      <div className="ai-actions">
        <button
          type="submit"
          className="btn btn-primary ai-save-btn"
          disabled={disabled || !content.trim()}
        >
          {saving ? "Saving…" : "Save to Notes"}
        </button>
      </div>
    </form>
  );
}
