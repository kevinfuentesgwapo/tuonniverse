import { useEffect, useRef, useState } from "react";
import { fetchAll } from "../lib/fetchAll";
import useAuth from "./useAuth";
import useRefreshOnFocus from "./useRefreshOnFocus";

// Loads ALL your saved study rounds and card progress (for the Stats page).
// Returns { loading, error, sessions, progress, reload }.
export default function useStats() {
  const { user } = useAuth();
  const userId = user?.id;
  const [tick, setTick] = useState(0);
  const loadedRef = useRef(false); // true after one good load
  const [state, setState] = useState({
    loading: true,
    error: false,
    sessions: [],
    progress: [],
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        const [sessions, progress] = await Promise.all([
          fetchAll(
            "study_sessions",
            "id, mode, cards_done, created_at",
            userId,
            "id",
          ),
          fetchAll(
            "card_progress",
            "card_id, set_id, interval_days",
            userId,
            "card_id",
          ),
        ]);
        if (!cancelled) {
          loadedRef.current = true;
          setState({ loading: false, error: false, sessions, progress });
        }
      } catch (err) {
        console.error(err);
        // A failed background refresh keeps the numbers already on screen.
        if (!cancelled && !loadedRef.current) {
          setState({ loading: false, error: true, sessions: [], progress: [] });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  // Back on the tab or the phone app: load again quietly.
  useRefreshOnFocus(() => setTick((t) => t + 1));

  function reload() {
    setState((s) => ({ ...s, loading: true, error: false }));
    setTick((t) => t + 1);
  }

  return { ...state, reload };
}
