import { Link } from "react-router-dom";
import Icon from "../ui/Icon";

// One set, shown as a clickable tile. Used on Home and the Sets page.
export default function SetTile({ set }) {
  const count = set.cardCount;

  return (
    <Link to={`/sets/${set.id}`} className="set-tile">
      <span className="home-icon" aria-hidden="true">
        <Icon name="sets" size={22} />
      </span>
      <h3>{set.title}</h3>
      {set.description && (
        <p className="muted set-tile-desc">{set.description}</p>
      )}
      <span className="set-tile-meta">
        {count} {count === 1 ? "card" : "cards"}
      </span>
    </Link>
  );
}
