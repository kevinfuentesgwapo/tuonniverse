import { useCallback, useEffect, useState } from "react";
import { loadFolders } from "../lib/folders";
import useAuth from "./useAuth";
import useRefreshOnFocus from "./useRefreshOnFocus";

// Your folders: { folders: [{ id, name }], loading, error, reload }.
// reload() loads again quietly (no loading flash) and can be awaited.
export default function useFolders() {
  const { user } = useAuth();
  const userId = user?.id;
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // quiet = a refresh in the background: if it fails, keep what is on screen.
  const load = useCallback(
    async (quiet = false) => {
      if (!userId) return;
      try {
        setFolders(await loadFolders(userId));
        setError("");
      } catch (err) {
        console.error(err);
        if (quiet) return;
        setError("We could not load your folders.");
      }
      setLoading(false);
    },
    [userId],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Back on the tab or the phone app: load again quietly.
  useRefreshOnFocus(() => load(true));

  return { folders, loading, error, reload: load };
}
