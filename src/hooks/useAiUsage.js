// How many AI tries are left today.
// Use: const { left, limit, loading, setUsed } = useAiUsage(user?.id);
// After a good AI call, run setUsed(result.used) to update the number at once.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { AI_LIMIT_FALLBACK } from "../lib/api.js";
import useRefreshOnFocus from "./useRefreshOnFocus";

// Same day rule as the server (UTC).
const today = () => new Date().toISOString().slice(0, 10);

export default function useAiUsage(userId) {
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(AI_LIMIT_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // quiet = true: no "Loading" flash, and the old number stays if it fails.
  const load = useCallback(
    async (quiet) => {
      if (!userId) {
        setUsed(0);
        setLoading(false);
        return;
      }
      if (!quiet) {
        setLoading(true);
        setError("");
      }
      const { data, error: err } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("used_on", today())
        .maybeSingle();
      if (err) {
        if (!quiet)
          setError("Could not check your AI tries. You can still try.");
      } else {
        setUsed(data?.count || 0);
        setError("");
      }
      if (!quiet) setLoading(false);
    },
    [userId],
  );

  const reload = useCallback(() => load(false), [load]);
  const quietReload = useCallback(() => load(true), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Come back to the tab: refresh quietly (a new day resets the number).
  useRefreshOnFocus(quietReload);

  // Called after a good AI call with the new numbers from the server.
  const update = useCallback((newUsed, newLimit) => {
    setUsed(newUsed);
    if (newLimit) setLimit(newLimit);
  }, []);

  return {
    used,
    limit,
    left: Math.max(0, limit - used),
    loading,
    error,
    reload,
    setUsed: update,
  };
}
