import { useCallback, useEffect, useMemo, useState } from "react";
import { getSharedSet } from "../lib/sharedSets";

// Loads a shared set by its code (public, no login needed).
// Returns { status: "loading" | "ready" | "missing" | "error", shared, cards, retry }.
// Shared cards come without ids, so each one gets a simple id like "shared-0".
// Nothing here is saved to the database.
export default function useSharedSet(code) {
  const [status, setStatus] = useState("loading");
  const [shared, setShared] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await getSharedSet(code);
      if (!result) {
        setStatus("missing");
        return;
      }
      setShared(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setStatus("loading");
    load();
  }

  const cards = useMemo(
    () =>
      (shared?.cards || []).map((card, index) => ({
        id: `shared-${index}`,
        term: card.term,
        definition: card.definition,
        starred: false,
      })),
    [shared],
  );

  return { status, shared, cards, retry };
}
