import { useState } from "react";
import { cardImageUrl } from "../../lib/cardImages";

// The picture that goes with a card's term (public link, works for anyone).
// path = cards.image_path. Shows nothing if there is no picture, or if it
// cannot load, so a broken picture never breaks a study round.
// alt="" hides it from screen readers (use it where the term text is enough).
export default function CardPicture({
  path,
  className = "",
  alt = "A picture that goes with this term",
}) {
  const [failed, setFailed] = useState(false);
  if (!path || failed) return null;
  return (
    <img
      className={`cpic ${className}`.trim()}
      src={cardImageUrl(path)}
      alt={alt}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
