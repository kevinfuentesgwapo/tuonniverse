import { useEffect, useRef } from "react";

const MIN_GAP_MS = 30000; // never refresh more than once every 30 seconds

// Calls refresh() when the student comes back to the tab or the phone app,
// or when the internet comes back. No always-open connection, so no limits.
// refresh should load quietly (no "Loading…" flash) and keep old data if it fails.
export default function useRefreshOnFocus(refresh) {
  const refreshRef = useRef(refresh);
  const lastRef = useRef(Date.now()); // the page just loaded, so it is fresh

  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    function run(force) {
      const now = Date.now();
      if (!force && now - lastRef.current < MIN_GAP_MS) return;
      lastRef.current = now;
      refreshRef.current?.();
    }
    function onVisible() {
      if (document.visibilityState === "visible") run(false);
    }
    function onFocus() {
      run(false);
    }
    function onOnline() {
      run(true);
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);
}
