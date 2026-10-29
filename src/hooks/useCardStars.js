import { useCallback, useState } from "react";
import { setCardStarred } from "../lib/starCards";

// Keeps the stars for the cards in one study round.
// Shows a change right away, and puts it back if saving fails.
export default function useCardStars(cards) {
  const [starMap, setStarMap] = useState(() =>
    Object.fromEntries(cards.map((c) => [c.id, !!c.starred])),
  );
  const [error, setError] = useState("");

  const isStarred = useCallback((id) => !!starMap[id], [starMap]);

  const toggle = useCallback(
    async (id) => {
      const next = !starMap[id];
      setStarMap((m) => ({ ...m, [id]: next }));
      setError("");
      try {
        await setCardStarred(id, next);
      } catch (err) {
        console.error(err);
        setStarMap((m) => ({ ...m, [id]: !next }));
        setError("We could not save the star. Please try again.");
      }
    },
    [starMap],
  );

  return { isStarred, toggle, error };
}
