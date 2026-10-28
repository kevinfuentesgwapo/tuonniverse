// Shows the AI cards so the student can fix them BEFORE saving.
// Use: <CardPreview cards={cards} onChange={setCards} />
// Every card needs an id. Run addIds(result.cards) first.
let counter = 0;
const newId = () => `ai-${Date.now()}-${counter++}`;

export function addIds(cards) {
  return cards.map((c) => ({ id: newId(), front: c.front, back: c.back }));
}

const MAX_CARDS = 50;

export default function CardPreview({ cards, onChange, disabled = false }) {
  const edit = (id, field, value) =>
    onChange(cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const remove = (id) => onChange(cards.filter((c) => c.id !== id));

  const add = () => onChange([...cards, { id: newId(), front: "", back: "" }]);

  if (cards.length === 0) {
    return (
      <div className="ai-empty">
        <p className="ai-empty-title">No cards yet</p>
        <p className="muted">
          Paste some notes and Tuo will make cards for you.
        </p>
        <button type="button" className="btn" onClick={add} disabled={disabled}>
          Add a card by hand
        </button>
      </div>
    );
  }

  return (
    <section className="ai-preview" aria-label="Cards made by Tuo">
      <p className="ai-preview-count" aria-live="polite">
        {cards.length} {cards.length === 1 ? "card" : "cards"} ready. Fix
        anything you like, then save.
      </p>

      <ul className="ai-list">
        {cards.map((c, i) => (
          <li key={c.id} className="ai-card">
            <div className="ai-card-top">
              <span className="ai-card-num">Card {i + 1}</span>
              <button
                type="button"
                className="ai-remove"
                onClick={() => remove(c.id)}
                disabled={disabled}
                aria-label={`Remove card ${i + 1}`}
              >
                Remove
              </button>
            </div>

            <div className="ai-fields">
              <label className="ai-field">
                <span className="ai-label">Front</span>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={c.front}
                  disabled={disabled}
                  onChange={(e) => edit(c.id, "front", e.target.value)}
                />
              </label>
              <label className="ai-field">
                <span className="ai-label">Back</span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={c.back}
                  disabled={disabled}
                  onChange={(e) => edit(c.id, "back", e.target.value)}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>

      {cards.length < MAX_CARDS && (
        <button type="button" className="btn" onClick={add} disabled={disabled}>
          Add a card
        </button>
      )}
    </section>
  );
}
