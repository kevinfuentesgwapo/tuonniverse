import { useCallback, useEffect, useState } from "react";
import { loadReviewQueue } from "../lib/cardProgress";

// Today's review list for the logged-in student.
// Returns { queue, dueTotal, newTotal, totalCards, nextDue, loading, error, reload }.
export default function useReviewQueue(userId) {
  const [data, setData] = useState({
    queue: [],
    dueTotal: 0,
    newTotal: 0,
    totalCards: 0,
    nextDue: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      setData(await loadReviewQueue(userId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, loading, error, reload: load };
}
