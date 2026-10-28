// The "Make cards" button. Shows a friendly busy state while Tuo works.
import Icon from "../ui/Icon";

export default function GenerateCardsButton({
  onClick,
  busy = false,
  disabled = false,
  hasCards = false,
}) {
  const label = busy
    ? "Tuo is reading…"
    : hasCards
      ? "Make new cards"
      : "Make cards with Tuo";

  return (
    <button
      type="button"
      className="btn btn-primary ai-make-btn"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      <span className={busy ? "ai-spark ai-spark-busy" : "ai-spark"}>
        <Icon name="sparkles" size={18} />
      </span>
      {label}
    </button>
  );
}
