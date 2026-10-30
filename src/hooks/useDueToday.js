import { useCallback, useEffect, useState } from "react";
import useAuth from "./useAuth";
import useRefreshOnFocus from "./useRefreshOnFocus";
import { loadReviewQueue } from "../lib/cardProgress";

// How many cards are due today, and how many new ones are waiting.
// Uses the same queue as the Review page, so the numbers always match.
export default function useDueToday() {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState({
    dueTotal: 0,
    newTotal: 0,
    sessionSize: 0,
    loading: true,
    error: false,
  });

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await loadReviewQueue(userId);
      setState({
        dueTotal: result.dueTotal ?? 0,
        newTotal: result.newTotal ?? 0,
        sessionSize: result.queue?.length ?? 0,
        loading: false,
        error: false,
      });
    } catch (err) {
      console.error(err);
      setState((old) => ({ ...old, loading: false, error: true }));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Come back to the tab: refresh quietly (old numbers stay if it fails).
  useRefreshOnFocus(load);

  return state;
}
